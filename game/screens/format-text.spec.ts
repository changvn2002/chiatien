import { describe, expect, it } from 'vitest';
import { formatAmountsInText, humanizeCapViolation } from './format-text';

describe('formatAmountsInText', () => {
  it('format một số dài thành dạng phân nghìn dấu chấm', () => {
    expect(formatAmountsInText('tổng hoá đơn 1260000 ₫')).toBe('tổng hoá đơn 1.260.000 ₫');
    expect(formatAmountsInText('2000000')).toBe('2.000.000');
    expect(formatAmountsInText('500000')).toBe('500.000');
    expect(formatAmountsInText('1000')).toBe('1.000');
  });

  it('format MỌI số dài trong cùng một chuỗi', () => {
    expect(
      formatAmountsInText(
        'Vượt trần tổng hiệu dụng cho nhóm 4 người: tổng hoá đơn 1260000 ₫ > 666667 ₫.',
      ),
    ).toBe('Vượt trần tổng hiệu dụng cho nhóm 4 người: tổng hoá đơn 1.260.000 ₫ > 666.667 ₫.');
    expect(formatAmountsInText('gánh thêm tối đa 945000 ₫ > trần 500000 ₫')).toBe(
      'gánh thêm tối đa 945.000 ₫ > trần 500.000 ₫',
    );
  });

  it('giữ nguyên số dưới 1000', () => {
    expect(formatAmountsInText('nhóm 4 người, ván tối đa 40 giây, 999 ₫')).toBe(
      'nhóm 4 người, ván tối đa 40 giây, 999 ₫',
    );
  });

  it('giữ nguyên chuỗi không có số', () => {
    expect(formatAmountsInText('Số tiền này vượt trần của game nên chưa chơi được.')).toBe(
      'Số tiền này vượt trần của game nên chưa chơi được.',
    );
    expect(formatAmountsInText('')).toBe('');
  });
});

describe('humanizeCapViolation — dịch chuỗi trần của engine sang tiếng người (Addendum §6)', () => {
  it('trần tổng hiệu dụng: nêu hoá đơn hiện tại + mức nhóm chơi được + việc cần làm', () => {
    expect(
      humanizeCapViolation(
        'Vượt trần tổng hiệu dụng cho nhóm 4 người: tổng hoá đơn 1260000 ₫ > 666667 ₫.',
      ),
    ).toBe(
      'Hoá đơn đang là 1260000 ₫ — nhóm 4 người chỉ chơi được tới 666667 ₫. Giảm tổng hoá đơn để chơi.',
    );
    // Điểm render format tiếp: số ra dạng phân nghìn như trước.
    expect(
      formatAmountsInText(
        humanizeCapViolation(
          'Vượt trần tổng hiệu dụng cho nhóm 4 người: tổng hoá đơn 1260000 ₫ > 666667 ₫.',
        ),
      ),
    ).toBe(
      'Hoá đơn đang là 1.260.000 ₫ — nhóm 4 người chỉ chơi được tới 666.667 ₫. Giảm tổng hoá đơn để chơi.',
    );
  });

  it('trần tổng: nêu hoá đơn hiện tại + mức tối đa của game', () => {
    expect(
      humanizeCapViolation('Vượt trần tổng: tổng hoá đơn 3000000 ₫ > trần tổng 2000000 ₫.'),
    ).toBe('Hoá đơn đang là 3000000 ₫, cao hơn mức tối đa của game là 2000000 ₫.');
  });

  it('gánh-thêm: nêu số người đãi có thể phải gánh thêm + mức cho phép', () => {
    expect(
      humanizeCapViolation(
        'Vượt trần gánh-thêm: người được chọn sẽ gánh thêm tối đa 945000 ₫ > trần gánh-thêm 500000 ₫.',
      ),
    ).toBe('Người đãi có thể phải gánh thêm tới 945000 ₫, quá mức cho phép 500000 ₫.');
  });

  it('không khớp mẫu nào → trả nguyên văn', () => {
    expect(humanizeCapViolation('Chuỗi lạ không theo mẫu trần.')).toBe(
      'Chuỗi lạ không theo mẫu trần.',
    );
    expect(humanizeCapViolation('')).toBe('');
  });
});
