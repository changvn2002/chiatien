// M5 — Đồng thuận (SPEC §M5, phân xử D1): ĐÚNG 10 dòng theo thứ tự, nguyên
// văn khung. [S] lấy từ phép chia đều hiện hữu của app qua adapter (không
// tự tính lại); [G] = [T] − phần chia đều nhỏ nhất. Thông tin QR đã xác
// nhận lặp lại nguyên vẹn tại màn này. Phần «số chung» theo đúng thứ tự
// cam kết hai giai đoạn §5: C1 hiển thị TRƯỚC, rồi mới nhập số chung ≥ 6
// chữ số, nhập xong mới finalizeSeed → mã ván khi bấm Bắt đầu.
// N=2: ô cảnh báo riêng dưới dòng 6 + checkbox xác nhận riêng nguyên nhãn,
// khoá nút Bắt đầu tới khi tích. Thuật ngữ duy nhất chỉ người trả tiền ở
// màn này: «người được chọn» / «người đãi». KHÔNG danh hiệu vinh dự.

'use client';

import type { MatchParams } from '../engine/types';

export interface ConsentReady {
  params: MatchParams;
  c1: string;
  paramsHash: string;
  seedDevice: number;
  chung: string;
  /**
   * FIX-UX-GAME: màn thiết lập gộp chốt đối chiếu QR NGAY tại nút Bắt
   * đầu (không còn bước M2 riêng để ghi confirmedAt vào draft trước) —
   * mốc đối chiếu đi kèm gói sẵn sàng này; entry ưu tiên giá trị này
   * hơn draft.qr.confirmedAt khi dựng bản ghi ván.
   */
  qrConfirmedAt?: number | null;
}
