/**
 * Kiểu dữ liệu lõi của Chia Tiền.
 *
 * Mọi số tiền đều là SỐ NGUYÊN đồng (VND không có đơn vị lẻ trong app này) —
 * thuật toán chia/quyết toán trong lib/split.ts và lib/settle.ts bảo toàn
 * tổng tuyệt đối ở mức nguyên đồng, không bao giờ sinh số thập phân.
 */

/** Thông tin ngân hàng của một thành viên — dùng để sinh mã VietQR thật. */
export interface BankInfo {
  /** Mã BIN của ngân hàng theo chuẩn VietQR/NAPAS (vd Vietcombank = 970436). */
  bin: string;
  /** Tên ngân hàng hiển thị (chọn từ danh sách BANKS trong lib/vietqr.ts). */
  bankName: string;
  /** Số tài khoản nhận tiền. */
  accountNumber: string;
  /** Tên chủ tài khoản (viết hoa không dấu theo hồ sơ ngân hàng). */
  accountName: string;
}

export interface Member {
  id: string;
  name: string;
  /** Tuỳ chọn — có thì mỗi giao dịch quyết toán tới người này mới có VietQR. */
  bank?: BankInfo;
}

/** Ba kiểu chia một khoản chi cho nhóm người tham gia. */
export type SplitMode = 'equal' | 'custom' | 'shares';

export interface Expense {
  id: string;
  title: string;
  /** Tổng số tiền của khoản chi, nguyên đồng, > 0. */
  amount: number;
  /** Người đã trả tiền (member id). */
  payerId: string;
  /** Nhóm người cùng chịu khoản chi này (member id, giữ đúng thứ tự nhập). */
  participantIds: string[];
  mode: SplitMode;
  /** mode = 'custom': số tiền từng người phải chịu, theo member id. Tổng phải = amount. */
  custom: Record<string, number>;
  /** mode = 'shares': trọng số/phần của từng người, theo member id. Mọi trọng số > 0. */
  weights: Record<string, number>;
  createdAt: number;
}

/** Một "cuộc chia" — một chuyến đi / bữa nhậu / kỳ ở trọ chung… */
export interface Session {
  id: string;
  title: string;
  members: Member[];
  expenses: Expense[];
  createdAt: number;
  updatedAt: number;
}

/** Một giao dịch quyết toán: fromId trả cho toId số tiền amount (nguyên đồng). */
export interface Transfer {
  fromId: string;
  toId: string;
  amount: number;
}
