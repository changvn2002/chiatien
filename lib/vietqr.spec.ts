import { describe, expect, it } from 'vitest';
import {
  BANKS,
  accountNumberError,
  buildVietQrPayload,
  crc16Ccitt,
  findBank,
  hasBank,
  isValidAccountNumber,
} from './vietqr';
import type { BankInfo, Member } from './types';

const bank: BankInfo = {
  bin: '970436',
  bankName: 'Vietcombank',
  accountNumber: '1234567890',
  accountName: 'NGUYEN VAN BINH',
};

/**
 * GOLDEN VECTOR — payload THẬT do img.vietqr.io sinh, giải mã trực tiếp
 * từ ảnh QR mẫu (~/workspace/mini-apps/chiatien-qa/vietqr-url.txt:
 * bin 970436, account 1234567890, amount 350000, addInfo
 * 'An chuyen tien QA Da Lat 2026', accountName NGUYEN VAN BINH) bằng
 * cách raster hoá vector QR trong SVG trả về + jsQR, ngày 2026-10-23.
 * Lưu ý: payload thật dùng mã dịch vụ "QRIBFTTA" (không phải "QRIBFTTC"
 * như đặc tả ban đầu) — builder đã khớp theo payload thật.
 */
const GOLDEN_PAYLOAD =
  '00020101021238540010A00000072701240006970436011012345678900208QRIBFTTA530370454063500005802VN62330829An chuyen tien QA Da Lat 20266304530B';

describe('buildVietQrPayload (DATA-08 — payload EMVCo sinh 100% client-side)', () => {
  it('khớp 100% payload thật của img.vietqr.io (golden vector giải mã từ QR mẫu)', () => {
    const payload = buildVietQrPayload(bank, 350_000, 'An chuyen tien QA Da Lat 2026');
    expect(payload).toBe(GOLDEN_PAYLOAD);
  });

  it('CRC tự nhất quán: 4 ký tự cuối = crc16Ccitt của toàn bộ phần trước', () => {
    const payload = buildVietQrPayload(bank, 123_456, 'Chia tien');
    expect(payload.slice(-4)).toBe(crc16Ccitt(payload.slice(0, -4)));
    expect(payload.slice(-4)).toMatch(/^[0-9A-F]{4}$/);
  });

  it('crc16Ccitt: chuỗi rỗng -> FFFF (init, không xor-out); golden body -> 530B', () => {
    expect(crc16Ccitt('')).toBe('FFFF');
    expect(crc16Ccitt(GOLDEN_PAYLOAD.slice(0, -4))).toBe('530B');
  });

  it('cấu trúc TLV: mở đầu 000201010212, có 5303704 (VND), 5802VN, tag 38 chứa BIN + số tài khoản + QRIBFTTA', () => {
    const payload = buildVietQrPayload(bank, 50_000, 'Test');
    expect(payload.startsWith('000201010212')).toBe(true);
    expect(payload).toContain('5303704');
    expect(payload).toContain('5802VN');
    expect(payload).toContain('0010A000000727');
    expect(payload).toContain('0006970436');
    expect(payload).toContain('1234567890');
    expect(payload).toContain('0208QRIBFTTA');
    expect(payload).toContain('540550000'); // tag 54, độ dài 05, amount 50000
  });

  it('amount không hợp lệ (0, âm, thập phân, NaN, Infinity) -> throw RangeError', () => {
    for (const bad of [0, -1, -350_000, 1.5, 100.25, NaN, Infinity, -Infinity]) {
      expect(() => buildVietQrPayload(bank, bad, 'x')).toThrow(RangeError);
    }
  });

  it('addInfo rỗng / chỉ khoảng trắng -> không có tag 62 (5802VN nối thẳng 6304)', () => {
    for (const empty of ['', '   ']) {
      const payload = buildVietQrPayload(bank, 50_000, empty);
      expect(payload).toContain('5802VN6304');
    }
  });

  it('addInfo dài hơn 50 ký tự -> bị cắt đúng 50 (subtag 08 khai độ dài 50)', () => {
    const payload = buildVietQrPayload(bank, 50_000, 'a'.repeat(80));
    expect(payload).toContain(`0850${'a'.repeat(50)}`);
    expect(payload).not.toContain('a'.repeat(51));
  });

  it('addInfo được trim trước khi đưa vào payload', () => {
    const payload = buildVietQrPayload(bank, 50_000, '  Chia tien  ');
    expect(payload).toContain('0809Chia tien');
  });

  it('accountName KHÔNG nằm trong payload (app ngân hàng tự hiển thị khi quét)', () => {
    const payload = buildVietQrPayload(bank, 50_000, 'Test');
    expect(payload).not.toContain('NGUYEN VAN BINH');
  });
});

describe('BANKS', () => {
  it('mọi BIN đều là 6 chữ số và không trùng', () => {
    const bins = BANKS.map((b) => b.bin);
    expect(new Set(bins).size).toBe(bins.length);
    for (const bin of bins) expect(bin).toMatch(/^\d{6}$/);
  });

  it('có các ngân hàng lớn: Vietcombank 970436, MB 970422, Techcombank 970407', () => {
    expect(findBank('970436')?.shortName).toBe('Vietcombank');
    expect(findBank('970422')?.shortName).toBe('MB Bank');
    expect(findBank('970407')?.shortName).toBe('Techcombank');
  });
});

describe('validation số tài khoản (M-3, Panel #02)', () => {
  it('hai ca Panel bắt được đều bị loại: "abc" và "12"', () => {
    expect(isValidAccountNumber('abc')).toBe(false);
    expect(isValidAccountNumber('12')).toBe(false);
    expect(accountNumberError('abc')).toContain('quá ngắn');
    expect(accountNumberError('12')).toContain('quá ngắn');
  });

  it('biên độ dài: 7 ký tự loại, 8 ký tự qua, 19 ký tự qua, 20 ký tự loại', () => {
    expect(isValidAccountNumber('1234567')).toBe(false);
    expect(isValidAccountNumber('12345678')).toBe(true); // VPBank có TK 8 chữ số
    expect(isValidAccountNumber('1'.repeat(19))).toBe(true);
    expect(isValidAccountNumber('1'.repeat(20))).toBe(false);
    expect(accountNumberError('1'.repeat(20))).toContain('quá dài');
  });

  it('định dạng thật theo ngân hàng trong BANKS đều qua: VCB 13 số, TCB 14 số, VietinBank 12 ký tự chữ-số', () => {
    expect(isValidAccountNumber('0123456789012')).toBe(true);
    expect(isValidAccountNumber('01234567890123')).toBe(true);
    expect(isValidAccountNumber('1023456789AB')).toBe(true);
    expect(isValidAccountNumber('0123456789')).toBe(true);
  });

  it('chuẩn hoá trước khi kiểm: khoảng trắng/chấm/gạch nối được bỏ; ký tự đặc biệt và chuỗi không chữ số bị loại', () => {
    expect(isValidAccountNumber('0123 456 789')).toBe(true);
    expect(isValidAccountNumber('0123-456-789')).toBe(true);
    expect(isValidAccountNumber('0123.456.789')).toBe(true);
    expect(isValidAccountNumber('0123@456789')).toBe(false);
    expect(accountNumberError('0123@456789')).toContain('ký tự đặc biệt');
    expect(isValidAccountNumber('abcdefgh')).toBe(false);
    expect(accountNumberError('abcdefgh')).toContain('ít nhất một chữ số');
    expect(accountNumberError('')).toContain('Chưa nhập');
    expect(accountNumberError('   ')).toContain('Chưa nhập');
  });

  it('hasBank: bank có số TK rác -> false (UI không được khẳng định "có VietQR"); số hợp lệ -> true', () => {
    const garbage: Member = {
      id: 'm1',
      name: 'An',
      bank: { bin: '970436', bankName: 'Vietcombank', accountNumber: 'abc', accountName: 'AN' },
    };
    expect(hasBank(garbage)).toBe(false);
    const valid: Member = {
      id: 'm1',
      name: 'An',
      bank: {
        bin: '970436',
        bankName: 'Vietcombank',
        accountNumber: '0123456789',
        accountName: 'AN',
      },
    };
    expect(hasBank(valid)).toBe(true);
  });
});
