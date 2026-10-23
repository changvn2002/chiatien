import { describe, expect, it } from 'vitest';
import { BANKS, buildVietQrPayload, crc16Ccitt, findBank } from './vietqr';
import type { BankInfo } from './types';

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
