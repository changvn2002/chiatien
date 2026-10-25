// M3 — Chọn người chơi (SPEC §M3): mặc định chọn tất cả thành viên phiên,
// chạm để bỏ/chọn; hợp lệ 2–12, ngoài khoảng chặn kèm lý do. Mỗi người:
// badge danh tính thống nhất, tên, chip màu danh tính.
//
// DANH TÍNH MỘT NGUỒN DUY NHẤT (FIX-V3, P0.4): badge ở màn này là
// GameBadge dùng chung toàn game (DiceBear initials dạng app chính —
// nền theo colorIndex, glyph = initialsOf của lib), và chip màu là
// strongHex — cả hai đều tra từ identity map dựng MỘT LẦN trên roster
// ĐẦY ĐỦ của phiên (game/assets/identity.ts), KHÔNG dựng theo tập
// người đang chọn. Hệ quả: một người giữ nguyên màu + glyph ở M3 dù
// ván sau chỉ chọn một tập con, và khớp với vòng/plate trong Phaser
// (PlayerView.colorHex = strongHex cùng map, do entry cấp) lẫn badge
// ở M2/M7. Trạng thái chọn/không chọn đọc bằng viền/nền hàng + nhãn
// chữ «Đang chọn» / «Chưa chọn», KHÔNG bằng việc đổi màu badge.

'use client';

import { useMemo } from 'react';
import type { GameSessionInput } from '../adapter';
import { buildIdentityMapFromSessionMembers } from '../assets/identity';
import type { AvatarPhotoMap } from '../assets/avatar-store';
import type { GameDraft } from '../state';
import { PlayerAvatar, RedAlert, ScreenTitle, SplitEvenButton } from './shared';

export function M3PlayersScreen({
  input,
  draft,
  onDraft,
  onNext,
  onBack,
  onSplitEven,
  photos,
  embedded = false,
}: {
  input: GameSessionInput;
  draft: GameDraft;
  onDraft: (next: GameDraft) => void;
  onNext: () => void;
  onBack: () => void;
  onSplitEven: () => void;
  /** Ảnh avatar trên máy theo member id (FIX-V3 N3) — có ảnh thì hàng người hiện ảnh tròn thay initials. */
  photos?: AvatarPhotoMap;
  /**
   * FIX-UX-GAME: nhúng vào màn thiết lập gộp (nút «Đổi người chơi») — ẩn
   * tiêu đề + hàng nút điều hướng của màn độc lập; chọn xong là áp ngay
   * vào draft, không cần bấm Tiếp tục riêng.
   */
  embedded?: boolean;
}) {
  const selected = draft.selectedPlayerIds;
  // Identity map trên TOÀN BỘ thành viên phiên — không phụ thuộc
  // `selected`, nên bỏ/chọn người không làm ai đổi màu.
  const identityMap = useMemo(() => buildIdentityMapFromSessionMembers(input.members), [input]);
  const n = selected.length;
  const valid = n >= 2 && n <= 12;
  const reason =
    n < 2
      ? 'Cần ít nhất 2 người chơi.'
      : n > 12
        ? 'Một ván tối đa 12 người chơi. Hãy bỏ chọn bớt thành viên.'
        : null;

  function toggle(id: string) {
    const next = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
    // Giữ thứ tự theo thứ tự thành viên của phiên để paramsHash ổn định, dễ đọc.
    const ordered = input.members.map((m) => m.id).filter((mid) => next.includes(mid));
    onDraft({ ...draft, selectedPlayerIds: ordered });
  }

  return (
    <div>
      {embedded ? null : <ScreenTitle>Chọn người chơi</ScreenTitle>}
      <p className="mt-1 text-base text-ink-2">
        Đã chọn {n} người — mỗi người một màu riêng, kèm tên và ảnh.
      </p>
      <div className="mt-4 space-y-2">
        {input.members.map((m) => {
          const on = selected.includes(m.id);
          const identity = identityMap.get(m.id);
          return (
            <button
              key={m.id}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(m.id)}
              className={`flex min-h-11 w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition ${
                on ? 'border-brand bg-brand-50' : 'border-line bg-card'
              }`}
            >
              <PlayerAvatar
                name={m.displayName}
                colorIndex={identity?.colorIndex ?? 0}
                size={32}
                photoDataUrl={photos?.get(m.id)}
                ringHex={identity?.strongHex}
              />
              <span className="flex-1 text-base font-semibold text-ink">{m.displayName}</span>
              {identity ? (
                <span className="flex items-center gap-1.5 text-sm text-ink-2">
                  <span
                    aria-hidden
                    className="inline-block h-4 w-4 rounded-full border border-line-strong"
                    style={{ backgroundColor: identity.strongHex }}
                  />
                  Màu {identity.strongName}
                </span>
              ) : null}
              <span className="text-sm font-semibold text-ink">
                {on ? 'Đang chọn' : 'Chưa chọn'}
              </span>
            </button>
          );
        })}
      </div>
      {reason ? (
        <div className="mt-3">
          <RedAlert>{reason}</RedAlert>
        </div>
      ) : null}
      {embedded ? null : (
        <>
          <button
            type="button"
            disabled={!valid}
            onClick={onNext}
            className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-brand px-4 py-2.5 text-base font-bold text-ink-on-seed disabled:cursor-not-allowed disabled:bg-deck-sand disabled:text-ink transition duration-100 ease-[var(--ease-lock)] hover:bg-brand-600 active:bg-brand-600"
          >
            Tiếp tục
          </button>
          <button
            type="button"
            onClick={onBack}
            className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-line bg-card px-4 py-2.5 text-base font-semibold text-ink"
          >
            Quay lại
          </button>
          <SplitEvenButton onClick={onSplitEven} />
        </>
      )}
    </div>
  );
}
