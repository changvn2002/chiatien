import { describe, expect, it } from 'vitest';
import {
  MAX_BANK_ACCOUNT_NAME_LENGTH,
  MAX_BANK_ACCOUNT_NUMBER_LENGTH,
  MAX_BANK_BIN_LENGTH,
  MAX_BANK_NAME_LENGTH,
  sanitizeBankInfo,
  sanitizeSessionDetailed,
} from './sanitize';
import type { Session } from './types';

function sessionWithBank(bank: unknown): Session {
  return {
    id: 's-bank',
    title: 'Test bank',
    members: [
      { id: 'a', name: 'An', bank } as Session['members'][number],
      { id: 'b', name: 'Bình' },
    ],
    expenses: [],
    createdAt: 1,
    updatedAt: 2,
  };
}

const validBank = {
  bin: '970436',
  bankName: 'Vietcombank',
  accountNumber: '0123456789',
  accountName: 'NGUYEN VAN AN',
};

describe('sanitize bank — trim + trần độ dài (brief mục 7)', () => {
  it('hằng số trần bank đúng giá trị contract', () => {
    expect(MAX_BANK_BIN_LENGTH).toBe(16);
    expect(MAX_BANK_ACCOUNT_NUMBER_LENGTH).toBe(32);
    expect(MAX_BANK_ACCOUNT_NAME_LENGTH).toBe(100);
    expect(MAX_BANK_NAME_LENGTH).toBe(100);
  });

  it('bank có khoảng trắng đầu/cuối ở mọi trường -> được trim khi nạp (đường storage mặc định giữ bank)', () => {
    const r = sanitizeSessionDetailed(
      sessionWithBank({
        bin: '  970436 ',
        bankName: '  Vietcombank  ',
        accountNumber: ' 0123456789 ',
        accountName: ' NGUYEN VAN AN ',
      }),
    );
    expect(r.session?.members[0].bank).toEqual(validBank);
    expect(r.strippedBank).toBe(false);
  });

  it('bank vượt trần từng trường -> bị cắt đúng trần (riêng số TK: vượt trần ĐỊNH DẠNG thì bank bị loại — M-3)', () => {
    const r = sanitizeSessionDetailed(
      sessionWithBank({
        bin: '9'.repeat(24),
        bankName: 'B'.repeat(150),
        accountNumber: '0123456789',
        accountName: 'A'.repeat(150),
      }),
    );
    const bank = r.session?.members[0].bank;
    expect(bank?.bin).toBe('9'.repeat(MAX_BANK_BIN_LENGTH));
    expect(bank?.accountNumber).toBe('0123456789');
    expect(bank?.accountName).toBe('A'.repeat(MAX_BANK_ACCOUNT_NAME_LENGTH));
    expect(bank?.bankName).toBe('B'.repeat(MAX_BANK_NAME_LENGTH));
    // Trước M-3, số TK 40 ký tự bị cắt còn 32 rồi GIỮ — cắt một số tài
    // khoản là bịa ra một tài khoản khác. Nay: quá dài = không hợp lệ =
    // bank bị loại khỏi thành viên (thành viên vẫn được giữ).
    const tooLong = sanitizeSessionDetailed(
      sessionWithBank({ ...validBank, accountNumber: '1'.repeat(40) }),
    );
    expect(tooLong.session?.members[0].bank).toBeUndefined();
  });

  it('accountNumber chỉ gồm khoảng trắng -> sau trim rỗng -> bank không hợp lệ, thành viên vẫn được giữ', () => {
    const r = sanitizeSessionDetailed(sessionWithBank({ ...validBank, accountNumber: '   ' }));
    expect(r.session?.members).toHaveLength(2);
    expect(r.session?.members[0].bank).toBeUndefined();
  });

  it('sanitizeBankInfo: đầu vào rác -> null; thiếu bankName -> bankName rỗng nhưng bank vẫn hợp lệ', () => {
    expect(sanitizeBankInfo(null)).toBeNull();
    expect(sanitizeBankInfo('970436')).toBeNull();
    expect(sanitizeBankInfo({ bin: '970436', accountNumber: '0123' })).toBeNull();
    const noName = sanitizeBankInfo({
      bin: '970436',
      accountNumber: '0123456789',
      accountName: 'AN',
    });
    expect(noName).toEqual({
      bin: '970436',
      bankName: '',
      accountNumber: '0123456789',
      accountName: 'AN',
    });
  });

  it('M-3: số tài khoản sai định dạng -> null (ca Panel: "abc", "12"); dạng có khoảng trắng được chuẩn hoá rồi mới kiểm', () => {
    const base = { bin: '970436', accountName: 'AN' };
    expect(sanitizeBankInfo({ ...base, accountNumber: 'abc' })).toBeNull();
    expect(sanitizeBankInfo({ ...base, accountNumber: '12' })).toBeNull();
    expect(sanitizeBankInfo({ ...base, accountNumber: '1234567' })).toBeNull(); // 7 ký tự — dưới sàn 8
    expect(sanitizeBankInfo({ ...base, accountNumber: '1'.repeat(20) })).toBeNull(); // trên trần 19
    expect(sanitizeBankInfo({ ...base, accountNumber: 'abcdefgh' })).toBeNull(); // không chữ số nào
    expect(sanitizeBankInfo({ ...base, accountNumber: '0123 456 789' })?.accountNumber).toBe(
      '0123456789',
    );
  });
});

describe('sanitize hai đường bank — storage giữ, share cắt (DATA-04)', () => {
  it('đường share (keepBank: false): bank bị cắt khỏi mọi member + strippedBank = true', () => {
    const r = sanitizeSessionDetailed(sessionWithBank(validBank), { keepBank: false });
    expect(r.session?.members[0].bank).toBeUndefined();
    expect(r.session?.members[1].bank).toBeUndefined();
    expect(r.strippedBank).toBe(true);
  });

  it('đường share với session KHÔNG có bank nào: strippedBank = false', () => {
    const r = sanitizeSessionDetailed(sessionWithBank(undefined), { keepBank: false });
    expect(r.strippedBank).toBe(false);
  });

  it('đường storage (mặc định, không truyền keepBank): bank được giữ nguyên, strippedBank = false', () => {
    const r = sanitizeSessionDetailed(sessionWithBank(validBank));
    expect(r.session?.members[0].bank).toEqual(validBank);
    expect(r.strippedBank).toBe(false);
  });

  it('bank KHÔNG hợp lệ ở đường share: bị loại như thường và không tính là strippedBank', () => {
    const r = sanitizeSessionDetailed(
      sessionWithBank({ bin: '970436', accountNumber: '0123' }), // thiếu accountName
      { keepBank: false },
    );
    expect(r.session?.members[0].bank).toBeUndefined();
    expect(r.strippedBank).toBe(false);
  });
});
