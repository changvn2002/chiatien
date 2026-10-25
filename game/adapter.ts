// adapter.ts — Cổng MỘT CHIỀU duy nhất giữa game module và app chính
// (ARCHITECTURE §2.2). Game chỉ ĐỌC dữ liệu phiên qua file này; mọi import
// từ lib/ của game module đều đi qua đây (kể cả hàm thuần parse/tra cứu
// VietQR và hàm định dạng tiền), để kỷ luật `git diff -- lib` = 0 và ranh
// giới một chiều kiểm chứng được bằng cách rà import trong game/.
//
// Nguồn dữ kiện bám đúng cách session-view.tsx đang lấy:
// - thành viên: session.members (id ổn định + name hiển thị);
// - phép chia đều HIỆN HỮU của app: lib/split.ts `computeShares` với một
//   khoản chi mode 'equal' — game KHÔNG tự tính lại phép chia, chỉ gọi
//   đúng hàm của app qua adapter này (SPEC §M5 dòng 5: [S] lấy từ phép
//   chia đều hiện hữu, không tự tính lại ở tầng game).

import { computeShares } from '@/lib/split';
import { formatGrouped, formatVND, parseVNDInput } from '@/lib/money';
import { crc16Ccitt, findBank } from '@/lib/vietqr';
import { assignIdentityColors, memberNameKey } from '@/lib/identity';
import type { Expense, Session } from '@/lib/types';

/** Hợp đồng chỉ-đọc của ARCHITECTURE §2.2 — giữ đúng hình dạng này. */
export interface GameSessionInput {
  members: ReadonlyArray<{ id: string; displayName: string }>;
  /**
   * Phần chia đều hiện tại của từng thành viên (VND) cho tổng hoá đơn của
   * PHIÊN (totalSpent) — chỉ để hiển thị/kiểm trần mặc định. Khi tổng của
   * ván khác tổng phiên, màn hình phải gọi `equalSharesFor` (vẫn qua
   * adapter, vẫn là hàm chia đều của app) cho đúng tổng của ván.
   */
  equalShareByMemberId: Readonly<Record<string, number>>;
  /** Tổng tiền hiện tại của phiên (tổng mọi khoản chi) — để đối chiếu ở M1. */
  sessionTotalVnd: number;
  /** Tiêu đề phiên (chỉ để hiển thị ngữ cảnh). */
  sessionTitle: string;
}

/** Dựng đầu vào game từ một Session của app — hàm thuần, không ghi gì. */
export function buildGameSessionInput(session: Session): GameSessionInput {
  const members = session.members.map((m) => ({ id: m.id, displayName: m.name }));
  const total = session.expenses.reduce((s, e) => s + e.amount, 0);
  const ids = members.map((m) => m.id);
  const shares =
    ids.length > 0 && total > 0
      ? equalSharesFor(total, ids)
      : Object.fromEntries(ids.map((id) => [id, 0]));
  return {
    members,
    equalShareByMemberId: shares,
    sessionTotalVnd: total,
    sessionTitle: session.title,
  };
}

/**
 * Phần chia đều của app cho một tổng + một tập người chơi, bằng ĐÚNG hàm
 * `computeShares` của lib với khoản chi mode 'equal' (chia sàn, dư lẻ cộng
 * 1 ₫ cho người đầu danh sách — cùng luật làm tròn của app chính).
 * Thứ tự `playerIds` quyết định ai nhận phần dư lẻ, giống hệt app.
 */
export function equalSharesFor(
  totalVnd: number,
  playerIds: readonly string[],
): Record<string, number> {
  if (playerIds.length === 0) return {};
  if (!Number.isFinite(totalVnd) || totalVnd <= 0) {
    return Object.fromEntries(playerIds.map((id) => [id, 0]));
  }
  const probe: Expense = {
    id: 'game-adapter-probe',
    title: 'game',
    amount: Math.round(totalVnd),
    payerId: playerIds[0],
    participantIds: [...playerIds],
    mode: 'equal',
    custom: {},
    weights: {},
    createdAt: 0,
  };
  return computeShares(probe);
}

/* --- Tái xuất có kiểm soát cho game module (vẫn qua cổng adapter) --- */

/** Định dạng tiền như app chính: 150000 -> "150.000 ₫". */
export const formatMoney = formatVND;
/** Định dạng nhóm nghìn cho ô nhập: 150000 -> "150.000". */
export const formatMoneyGrouped = formatGrouped;
/** Đọc chuỗi người dùng gõ thành số nguyên đồng (bỏ ký tự không phải số). */
export const parseMoneyInput = parseVNDInput;
/** Tra ngân hàng theo mã BIN bằng bảng BANKS của lib — không có thì undefined (cấm đoán). */
export const findBankByBin = findBank;
/** CRC16-CCITT của lib — dùng kiểm tra CRC của payload EMV ở game/qr/emv.ts. */
export const crc16 = crc16Ccitt;
/** Chuẩn hoá tên để so trùng (lib/identity) — dùng ở M2 cho cảnh báo trùng tên thành viên. */
export const nameKeyOf = memberNameKey;
/** Gán màu avatar của app theo tên (lib/identity) — dùng để Avatar ở ui-bits nhận đúng colorIndex. */
export const identityColorsOf = assignIdentityColors;
