import { formatVND } from './money';
import type { Session, Transfer } from './types';

/**
 * Đơn giản hoá nợ (debt simplification).
 *
 * Thuật toán tham lam: lặp lại việc ghép CHỦ NỢ lớn nhất với CON NỢ lớn nhất,
 * chuyển số tiền bằng min(dư nợ, dư có). Mỗi giao dịch luôn "xoá sổ" ít nhất
 * một phía, giao dịch cuối xoá cả hai phía — nên với n người có số dư ≠ 0,
 * số giao dịch ≤ n − 1. Mọi số tiền là nguyên đồng nên cân bằng tuyệt đối,
 * không phát sinh lẻ xu.
 *
 * Thứ tự sắp xếp có tie-break theo member id để kết quả luôn xác định
 * (cùng một dữ liệu vào → cùng một danh sách quyết toán).
 */
export function simplifyDebts(balances: Record<string, number>): Transfer[] {
  const creditors = Object.entries(balances)
    .filter(([, v]) => v > 0)
    .map(([id, v]) => ({ id, amount: v }))
    .sort((a, b) => b.amount - a.amount || a.id.localeCompare(b.id));
  const debtors = Object.entries(balances)
    .filter(([, v]) => v < 0)
    .map(([id, v]) => ({ id, amount: -v }))
    .sort((a, b) => b.amount - a.amount || a.id.localeCompare(b.id));

  const transfers: Transfer[] = [];
  let ci = 0;
  let di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci];
    const debtor = debtors[di];
    const amount = Math.min(creditor.amount, debtor.amount);
    if (amount > 0) {
      transfers.push({ fromId: debtor.id, toId: creditor.id, amount });
      creditor.amount -= amount;
      debtor.amount -= amount;
    }
    if (creditor.amount === 0) ci += 1;
    if (debtor.amount === 0) di += 1;
  }
  return transfers;
}

/**
 * Bản quyết toán dạng text thuần — dán thẳng vào Zalo/Messenger.
 * Chỉ chứa dữ kiện thật từ chính cuộc chia; không có giao dịch thì ghi rõ
 * là nhóm đã cân bằng (đó là sự thật của dữ liệu, không phải nội dung mẫu).
 */
export function buildSettlementText(
  session: Session,
  balances: Record<string, number>,
  transfers: Transfer[],
): string {
  const nameOf = (id: string) => session.members.find((m) => m.id === id)?.name ?? 'Thành viên';
  const total = session.expenses.reduce((s, e) => s + e.amount, 0);
  const lines: string[] = [
    `🧾 QUYẾT TOÁN — ${session.title}`,
    `Tổng chi: ${formatVND(total)} · ${session.expenses.length} khoản · ${session.members.length} người`,
    '',
  ];
  // Chốt chặn trung thực: tổng số dư khác 0 nghĩa là dữ liệu có khoản chia
  // không khớp — bản text phải nói rõ thay vì trình bày như đã cân bằng.
  const discrepancy = Object.values(balances).reduce((s, v) => s + v, 0);
  if (discrepancy !== 0) {
    lines.push(
      `⚠️ CẢNH BÁO: số dư chưa cân bằng — còn ${formatVND(Math.abs(discrepancy))} chưa khớp. Hãy mở app kiểm tra lại các khoản chi tuỳ chỉnh trước khi chuyển tiền.`,
      '',
    );
  }
  if (transfers.length === 0) {
    lines.push('Mọi người đã cân bằng, không ai nợ ai. 🎉');
  } else {
    lines.push('Ai trả ai:');
    transfers.forEach((t, i) => {
      lines.push(`${i + 1}. ${nameOf(t.fromId)} → ${nameOf(t.toId)}: ${formatVND(t.amount)}`);
    });
  }
  lines.push('', 'Số dư từng người (dương = được nhận lại, âm = phải trả thêm):');
  for (const m of session.members) {
    const b = balances[m.id] ?? 0;
    lines.push(`• ${m.name}: ${b > 0 ? '+' : ''}${formatVND(b)}`);
  }
  lines.push('', 'Tính bằng app Chia Tiền.');
  return lines.join('\n');
}
