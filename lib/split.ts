import type { Expense, Session } from './types';

/**
 * Tính phần mỗi người phải chịu cho một khoản chi + cân bằng số dư.
 *
 * Nguyên tắc bất biến: tổng phần chịu của một khoản chi LUÔN bằng đúng số tiền
 * của khoản đó (nguyên đồng) — phần lẻ do làm tròn được phân bổ xác định:
 *  - equal : chia sàn, số dư lẻ cộng 1đ cho những người đầu danh sách tham gia.
 *  - custom: lấy đúng số người dùng nhập (validate bắt tổng phải khớp).
 *  - shares: phương pháp phần dư lớn nhất (largest remainder) theo trọng số.
 *
 * Độ bền số học (đợt vá theo test W2, lib/w2-deep.spec.ts là đặc tả):
 *  - Mọi bảng theo member id đều là Object.create(null): member id
 *    "__proto__" phải hoạt động như một khoá thường, không được làm rơi
 *    phần tiền của người đó khỏi bảng tích luỹ (W2-F1).
 *  - Người tham gia được khử trùng ngay tại đây (giữ lần xuất hiện đầu):
 *    gọi trực tiếp với id trùng không còn đếm một người hai lần (W2-F8).
 *  - equal chia bằng BigInt khi amount nguyên: phép nhân base × n trong
 *    float làm tròn sai 1đ ở quanh 2^53 (W2-F2); BigInt giữ tổng khớp
 *    tuyệt đối ở mọi độ lớn mà sanitize cho qua.
 *  - shares chuẩn hoá trọng số theo trọng số lớn nhất TRƯỚC khi nhân với
 *    amount: tỉ lệ luôn nằm trong [0, 1] nên amount × tỉ lệ không bao giờ
 *    tràn Infinity, và tổng trọng số đã chuẩn hoá ≤ số người nên không
 *    tràn khi cộng (trọng số 1e300/1e308 từng sinh Infinity/NaN — W2-F3).
 */

/** Bảng rỗng không prototype — xem ghi chú W2-F1 ở trên. */
function emptyRecord(): Record<string, number> {
  return Object.create(null) as Record<string, number>;
}

/** Phần mỗi người tham gia phải chịu, theo member id. Chỉ gồm người tham gia. */
export function computeShares(expense: Expense): Record<string, number> {
  const { amount, mode } = expense;
  // Khử trùng người tham gia (giữ thứ tự đầu tiên) — một người chỉ chịu
  // đúng một phần, kể cả khi dữ liệu gọi trực tiếp chứa id trùng (W2-F8).
  const participantIds = [...new Set(expense.participantIds)];
  const result = emptyRecord();
  if (participantIds.length === 0 || amount <= 0) {
    for (const id of participantIds) result[id] = 0;
    return result;
  }

  if (mode === 'custom') {
    for (const id of participantIds) {
      const raw = expense.custom[id];
      // Chỉ nhận số hữu hạn; thiếu/không hợp lệ = chịu 0đ như trước với ?? 0,
      // nhưng NaN lọt qua không còn đầu độc tổng (Math.round(NaN) = NaN).
      result[id] =
        typeof raw === 'number' && Number.isFinite(raw) ? Math.max(0, Math.round(raw)) : 0;
    }
    return result;
  }

  if (mode === 'shares') {
    const weights = participantIds.map((id) => {
      const w = expense.weights[id];
      return typeof w === 'number' && Number.isFinite(w) && w > 0 ? w : 0;
    });
    const maxWeight = Math.max(...weights);
    if (maxWeight <= 0) {
      // Không có trọng số hợp lệ — rơi về chia đều để tổng vẫn bảo toàn.
      return computeShares({ ...expense, participantIds, mode: 'equal' });
    }
    // Chuẩn hoá về tỉ lệ [0, 1] theo trọng số lớn nhất (W2-F3): phép nhân
    // với amount sau đó không thể tràn, tổng tỉ lệ ≤ số người tham gia.
    const scaled = weights.map((w) => w / maxWeight);
    const totalScaled = scaled.reduce((s, w) => s + w, 0);
    const raw = scaled.map((w) => (amount * w) / totalScaled);
    const floors = raw.map((r) => Math.floor(r));
    // Phần dư tính bằng BigInt khi amount nguyên: trừ float ở quanh 2^53
    // làm tròn sai khiến tổng lệch khỏi amount (cùng gốc lỗi với W2-F2).
    let remainder: number;
    if (Number.isInteger(amount)) {
      const floorSum = floors.reduce((acc, v) => acc + BigInt(v), BigInt(0));
      remainder = Number(BigInt(amount) - floorSum);
    } else {
      remainder = amount - floors.reduce((s, v) => s + v, 0);
    }
    // Cộng 1đ cho các phần có phần thập phân lớn nhất; hoà thì theo thứ tự tham gia.
    const order = participantIds
      .map((id, i) => ({ id, i, frac: raw[i] - floors[i] }))
      .sort((a, b) => b.frac - a.frac || a.i - b.i);
    participantIds.forEach((id, i) => {
      result[id] = floors[i];
    });
    // remainder bình thường nằm trong [0, số người); vòng lặp có trần vòng
    // cho ca float cực đoan (remainder vượt một vòng phân bổ hoặc âm do
    // sàn bị đẩy qua biên nguyên) — vẫn phải kết thúc với tổng = amount.
    let guard = 0;
    const guardMax = order.length * 4 + 1024;
    let idx = 0;
    while (remainder > 0 && guard < guardMax) {
      result[order[idx % order.length].id] += 1;
      remainder -= 1;
      idx += 1;
      guard += 1;
    }
    let back = 0;
    while (remainder < 0 && guard < guardMax) {
      const entry = order[(order.length - 1 - (back % order.length) + order.length) % order.length];
      if (result[entry.id] > 0) {
        result[entry.id] -= 1;
        remainder += 1;
      }
      back += 1;
      guard += 1;
      // Mọi phần đều đã về 0 mà remainder vẫn âm: không trừ thêm được —
      // chỉ xảy ra khi amount không nguyên/âm bất thường; thoát để không lặp vô hạn.
      if (back > order.length && participantIds.every((id) => result[id] <= 0)) break;
    }
    return result;
  }

  // equal — chia bằng BigInt khi amount nguyên để tổng khớp TUYỆT ĐỐI ở
  // mọi độ lớn (float: base × n làm tròn sai 1đ quanh 2^53 — W2-F2).
  if (Number.isInteger(amount)) {
    const total = BigInt(amount);
    const n = BigInt(participantIds.length);
    const base = total / n;
    const remainder = total % n;
    participantIds.forEach((id, i) => {
      result[id] = Number(base) + (BigInt(i) < remainder ? 1 : 0);
    });
    return result;
  }
  const n = participantIds.length;
  const base = Math.floor(amount / n);
  let remainder = amount - base * n;
  for (const id of participantIds) {
    result[id] = base + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder -= 1;
  }
  return result;
}

export interface ExpenseDraft {
  title: string;
  amount: number;
  payerId: string;
  participantIds: string[];
  mode: Expense['mode'];
  custom: Record<string, number>;
  weights: Record<string, number>;
}

/**
 * Trần NHẬP LIỆU cho một khoản chi ở tầng UI (M-4, Panel chiatien #02):
 * 999.999.999.999 ₫ — ngay dưới 10^12. Quyết định + lý do:
 * - Panel bắt được khoản 999.999.999.999.999 ₫ (~10^15) lọt qua UI và
 *   sinh QR cho lệnh ~5×10^14 ₫: một khoản chi NHÓM thật không bao giờ
 *   tới cỡ đó (khoản nhóm lớn bất thường — thuê nguyên nhà hàng, mua xe
 *   chung — vẫn dưới 10^11 ₫), nên trần này chặn mọi ca rác Panel nêu
 *   trong khi không chạm tới bất kỳ nhu cầu thật nào có thể hình dung.
 * - Trần này THẤP HƠN trần toàn vẹn dữ liệu MAX_AMOUNT_VND = 10^16 ở
 *   lib/sanitize.ts có chủ đích và không mâu thuẫn: sanitize là lớp
 *   TOÀN VẸN (dữ liệu đã tồn tại/link được tạo ở nơi khác vẫn được tính
 *   chính xác tuyệt đối tới 10^16 — bằng chứng DATA-10), còn đây là lớp
 *   NHẬP LIỆU (con số con người gõ vào form trên máy này). Hai lớp,
 *   hai nhiệm vụ — xem thêm docs/ARCHITECTURE.md mục 5.
 */
export const MAX_UI_AMOUNT_VND = 999_999_999_999;

/**
 * Kiểm tra một khoản chi trước khi lưu. Trả về danh sách lỗi tiếng Việt
 * (rỗng = hợp lệ). UI hiển thị nguyên văn các lỗi này cho người dùng.
 */
export function validateExpenseDraft(draft: ExpenseDraft, memberIds: string[]): string[] {
  const errors: string[] = [];
  const memberSet = new Set(memberIds);

  if (!draft.title.trim()) errors.push('Chưa nhập tên khoản chi.');
  if (!Number.isFinite(draft.amount) || draft.amount <= 0) errors.push('Số tiền phải lớn hơn 0.');
  else if (!Number.isInteger(draft.amount)) errors.push('Số tiền phải là số nguyên đồng.');
  // M-4 (Panel #02): trần NHẬP LIỆU ở tầng UI — chặn ngay tại form kèm
  // thông điệp, không đợi sanitize. Xem MAX_UI_AMOUNT_VND ở dưới.
  else if (draft.amount > MAX_UI_AMOUNT_VND)
    errors.push(
      `Số tiền vượt quá giới hạn cho một khoản chi — tối đa ${MAX_UI_AMOUNT_VND.toLocaleString('vi-VN')} ₫. Nếu đây là khoản lớn thật, hãy tách thành nhiều khoản chi.`,
    );
  if (!memberSet.has(draft.payerId)) errors.push('Chưa chọn người trả tiền.');
  if (draft.participantIds.length === 0) errors.push('Chọn ít nhất 1 người cùng chia khoản này.');
  for (const id of draft.participantIds) {
    if (!memberSet.has(id)) errors.push('Có người tham gia không còn trong danh sách thành viên.');
  }

  if (draft.mode === 'custom' && draft.participantIds.length > 0) {
    let sum = 0;
    for (const id of draft.participantIds) {
      const v = draft.custom[id];
      if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) {
        errors.push('Mỗi người tham gia cần một số tiền từ 0 trở lên.');
        break;
      }
      // Trần nhập liệu áp cho cả từng phần tuỳ chỉnh (M-4).
      if (v > MAX_UI_AMOUNT_VND) {
        errors.push(
          `Số tiền của mỗi người không vượt quá ${MAX_UI_AMOUNT_VND.toLocaleString('vi-VN')} ₫.`,
        );
        break;
      }
      sum += v;
    }
    if (errors.length === 0 && sum !== draft.amount) {
      errors.push(
        `Tổng các phần tuỳ chỉnh (${sum.toLocaleString('vi-VN')}đ) chưa bằng số tiền khoản chi (${draft.amount.toLocaleString('vi-VN')}đ).`,
      );
    }
  }

  if (draft.mode === 'shares' && draft.participantIds.length > 0) {
    for (const id of draft.participantIds) {
      const w = draft.weights[id];
      if (typeof w !== 'number' || !Number.isFinite(w) || w <= 0) {
        errors.push('Mỗi người tham gia cần một trọng số lớn hơn 0.');
        break;
      }
    }
  }

  return errors;
}

/**
 * Số dư của từng thành viên trong một cuộc chia:
 *   số dư = tổng đã trả − tổng phải chịu.
 * Số dư dương = người khác đang nợ lại mình (sẽ nhận tiền khi quyết toán).
 * Tổng mọi số dư luôn = 0.
 */
export function computeBalances(session: Session): Record<string, number> {
  // Object.create(null): phép `in` và gán theo member id phải đúng cho cả
  // id "__proto__" — object thường sẽ nuốt khoản của người đó (W2-F1).
  const balances = emptyRecord();
  for (const m of session.members) balances[m.id] = 0;
  for (const expense of session.expenses) {
    if (!(expense.payerId in balances)) balances[expense.payerId] = 0;
    balances[expense.payerId] += expense.amount;
    const shares = computeShares(expense);
    for (const [id, owed] of Object.entries(shares)) {
      if (!(id in balances)) balances[id] = 0;
      balances[id] -= owed;
    }
  }
  return balances;
}

/**
 * Tổng mọi số dư của một cuộc chia. Với dữ liệu hợp lệ con số này LUÔN = 0;
 * UI quyết toán dùng nó làm chốt chặn cuối: khác 0 là phải cảnh báo to cho
 * người dùng, tuyệt đối không trình bày một quyết toán lệch như đã khớp.
 */
export function sumBalances(balances: Record<string, number>): number {
  return Object.values(balances).reduce((s, v) => s + v, 0);
}

/** Tổng số tiền đã chi trong một cuộc chia. */
export function totalSpent(session: Session): number {
  return session.expenses.reduce((s, e) => s + e.amount, 0);
}

/** Tổng số tiền từng người đã trả (theo member id). */
export function paidByMember(session: Session): Record<string, number> {
  const paid = emptyRecord();
  for (const m of session.members) paid[m.id] = 0;
  for (const e of session.expenses) paid[e.payerId] = (paid[e.payerId] ?? 0) + e.amount;
  return paid;
}

/** Tổng số tiền từng người phải chịu (theo member id). */
export function owedByMember(session: Session): Record<string, number> {
  const owed = emptyRecord();
  for (const m of session.members) owed[m.id] = 0;
  for (const e of session.expenses) {
    const shares = computeShares(e);
    for (const [id, v] of Object.entries(shares)) owed[id] = (owed[id] ?? 0) + v;
  }
  return owed;
}
