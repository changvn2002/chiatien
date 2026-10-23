import { describe, expect, it } from 'vitest';
import { BANKS, findBank, vietQrUrl } from './vietqr';
import type { BankInfo } from './types';

const bank: BankInfo = {
  bin: '970436',
  bankName: 'Vietcombank',
  accountNumber: '0123456789',
  accountName: 'NGUYEN VAN AN',
};

describe('vietQrUrl', () => {
  it('đúng format URL ảnh VietQR chính thức', () => {
    const url = vietQrUrl(bank, 150_000, 'Chia tien Da Lat');
    expect(url.startsWith('https://img.vietqr.io/image/970436-0123456789-compact2.png?')).toBe(
      true,
    );
    const parsed = new URL(url);
    expect(parsed.searchParams.get('amount')).toBe('150000');
    expect(parsed.searchParams.get('addInfo')).toBe('Chia tien Da Lat');
    expect(parsed.searchParams.get('accountName')).toBe('NGUYEN VAN AN');
  });

  it('nội dung tiếng Việt có dấu được URL-encode an toàn', () => {
    const url = vietQrUrl(bank, 50_000, 'Quyết toán chuyến đi');
    const parsed = new URL(url);
    expect(parsed.searchParams.get('addInfo')).toBe('Quyết toán chuyến đi');
    expect(url).not.toContain(' ');
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
