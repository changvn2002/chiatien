// shared.tsx — Mẩu UI dùng chung cho các màn game: nút «Chia đều cho lành»
// (luật vị trí cuối §4: khu hành động dưới cùng, nút phụ bề rộng đầy đủ,
// giọng trung tính tuyệt đối), nút mute luôn thấy, và các dòng cảnh báo QR.
// Giữ hệ token của app chính (brand Deep Orange #FF5722, Neutral-First).

'use client';

import { useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { createAvatar } from '@dicebear/core';
import { initials } from '@dicebear/collection';
import { memberNameKey, normalizeMemberName } from '@/lib/identity';
import { SPLIT_EVEN_LABEL } from '../copy';

/**
 * Bảng nền đĩa danh tính bậc 100 — MIRROR của `AVATAR_BACKGROUNDS_V4`
 * (components/chiatien/ui-bits.tsx:51-68, nguồn sự thật ở tầng app
 * chính; mirror tại đây kèm ghi nguồn để game không import ngược
 * component của app chính). Thứ tự họ giữ nguyên bảng nguồn:
 * amber, blue, cyan, deep-orange, deep-purple, green, indigo,
 * light-blue, light-green, lime, orange, pink, purple, red, teal,
 * yellow. colorIndex do cơ chế gán hiện hành (lib/identity) cấp
 * 0..11; các ô 12..15 tới được qua guard modulo như bảng nguồn.
 */
const AVATAR_BACKGROUNDS_V4: readonly string[] = [
  '#FFECB3', // amber 100
  '#BBDEFB', // blue 100
  '#B2EBF2', // cyan 100
  '#FFCCBC', // deep-orange 100
  '#D1C4E9', // deep-purple 100
  '#C8E6C9', // green 100
  '#C5CAE9', // indigo 100
  '#B3E5FC', // light-blue 100
  '#DCEDC8', // light-green 100
  '#F0F4C3', // lime 100
  '#FFE0B2', // orange 100
  '#F8BBD0', // pink 100
  '#E1BEE7', // purple 100
  '#FFCDD2', // red 100
  '#B2DFDB', // teal 100
  '#FFF9C4', // yellow 100
];

/**
 * Tên hiển thị ngân hàng từ QR đã giải mã (trước đây ở
 * m2-qr-screen.tsx — file màn chết, D12: helper đưa về đây).
 * BIN không có trong bảng tra -> hiển thị mã BIN nguyên văn, cấm đoán
 * tên ngân hàng (SPEC §M2).
 */
export function bankDisplayOf(
  parsed: { bankName: string | null; bankShortName: string | null; bin: string } | null,
): string | null {
  if (!parsed) return null;
  return parsed.bankName
    ? `${parsed.bankName} (${parsed.bankShortName ?? parsed.bin})`
    : `Mã ngân hàng (BIN): ${parsed.bin}`;
}

const gameBadgeSvgCache = new Map<string, string>();

/**
 * Sinh SVG badge của game — ĐÚNG cơ chế DiceBear của app chính:
 * seed = memberNameKey(tên), font Be Vietnam Pro 700 / cỡ 46, tên một
 * từ ép `chars: 1` cho glyph luôn bằng initialsOf của lib. MÀU theo
 * SPEC step23 §1.2-M6 / §1.3 (sink đĩa DOM): nền là ĐÚNG MỘT ô pastel
 * bậc 100 của bảng AVATAR_BACKGROUNDS_V4 theo colorIndex đã gán
 * (mirror ở đầu file, nguồn components/chiatien/ui-bits.tsx:51-68),
 * và initials LUÔN là mực neutral-900 #212121 trên mọi nền — đĩa đặc
 * bão hoà + initial trắng bị cấm ở tầng DOM. (Plate/canvas trong sân
 * Phaser là bề mặt khác, ngoài phạm vi sink này.)
 *
 * Bằng chứng schema (kiểm tại node_modules, @dicebear/initials
 * 9.4.3 lib/types.d.ts + lib/schema.js): Options của style initials
 * là { backgroundColor, textColor, fontFamily, fontSize, chars,
 * fontWeight } — KHÔNG có `fontColor`; màu chữ đi qua `textColor`
 * (pattern hex 6 ký tự không '#', mặc định ['ffffff']), nền qua
 * `backgroundColor` (cùng pattern). Nên ở đây: backgroundColor =
 * [ô pastel bỏ '#'], textColor = ['212121'].
 */
function gameBadgeSvg(name: string, colorIndex: number): string {
  const paletteSize = AVATAR_BACKGROUNDS_V4.length;
  // Guard runtime như Avatar của app chính: colorIndex lạ/undefined
  // rơi về màu đầu palette thay vì làm sập màn hình.
  const safeIndex = Number.isFinite(colorIndex) ? Math.trunc(colorIndex) : 0;
  const idx = ((safeIndex % paletteSize) + paletteSize) % paletteSize;
  const nameKey = memberNameKey(name);
  const key = `${nameKey}|${idx}`;
  const cached = gameBadgeSvgCache.get(key);
  if (cached) return cached;
  const wordCount = normalizeMemberName(name).split(' ').filter(Boolean).length;
  const rawSvg = createAvatar(initials, {
    seed: nameKey,
    backgroundColor: [AVATAR_BACKGROUNDS_V4[idx].replace('#', '')],
    textColor: ['212121'],
    fontFamily: ['Be Vietnam Pro', 'sans-serif'],
    fontWeight: 700,
    fontSize: 46,
    // Tên một từ: DiceBear mặc định lấy 2 ký tự đầu — ép về 1 cho khớp
    // initialsOf (đúng cơ chế ui-bits / textures).
    ...(wordCount === 1 ? { chars: 1 } : {}),
  }).toString();
  // Như ui-bits: bỏ khối <metadata> RDF của DiceBear (khỏi nhiễm
  // textContent/accessible name của nút chứa badge) và gắn
  // aria-hidden vào thẻ <svg> gốc (badge là trang trí, tên người đã
  // có ở chữ cạnh badge).
  const svg = rawSvg
    .replace(/<metadata[\s\S]*?<\/metadata>/, '')
    .replace(/<svg/, '<svg aria-hidden="true"');
  gameBadgeSvgCache.set(key, svg);
  return svg;
}

/**
 * Badge danh tính DUY NHẤT của game mode ở tầng DOM (FIX-V3 P0.4,
 * tông đổi theo SPEC step23 §1.2-M6): DiceBear `initials` sinh TRỰC
 * TIẾP tại đây (không qua Avatar của app chính nữa) — seed = nameKey,
 * đĩa nền = pastel bậc 100 theo colorIndex, glyph initials LUÔN
 * #212121 — khớp đĩa của Avatar app chính ở workspace. Mọi màn game
 * (M2/M3/M5/M7…) phải dùng component này với colorIndex lấy từ
 * identity map duy nhất (game/assets/identity.ts, dựng trên roster
 * ĐẦY ĐỦ của phiên) — không màn nào tự sinh badge bằng tham số
 * DiceBear riêng hay bằng màu tự gán nữa.
 */
export function GameBadge({
  name,
  colorIndex,
  size = 32,
}: {
  name: string;
  colorIndex: number;
  size?: number;
}) {
  const svg = useMemo(() => gameBadgeSvg(name, colorIndex), [name, colorIndex]);
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 overflow-hidden rounded-full [&>svg]:block [&>svg]:h-full [&>svg]:w-full"
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

/**
 * Avatar của một người trên MỌI bề mặt DOM của game (FIX-V3 N3, lane
 * F): khi người đó có ẢNH CHỤP lưu trên máy (kho `ct-game-avatars-v1`,
 * game/assets/avatar-store.ts — tra theo member id tại lúc hiển thị)
 * thì hiện ẢNH TRÒN đã cắt vuông; không có ảnh → GameBadge (DiceBear
 * initials) đúng contract danh tính như cũ. Mọi màn (M3 / M3B / M5 /
 * M7) phải đi qua component này để nhất quán — không màn nào tự render
 * ảnh hay badge riêng.
 */
export function PlayerAvatar({
  name,
  colorIndex,
  size = 32,
  photoDataUrl,
  ringHex,
}: {
  name: string;
  colorIndex: number;
  size?: number;
  /** Data URL ảnh trên máy của người này; undefined/null = chưa có ảnh. */
  photoDataUrl?: string | null;
  /** Màu viền tuỳ chọn (thường là strongHex của identity map). */
  ringHex?: string;
}) {
  if (photoDataUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- Ảnh avatar là data URL sinh/lưu tại client trên máy này; next/image không áp dụng cho data-URL động
      <img
        src={photoDataUrl}
        alt=""
        aria-hidden
        className="shrink-0 rounded-full object-cover"
        style={{
          width: size,
          height: size,
          boxShadow: ringHex ? `0 0 0 2px ${ringHex}` : undefined,
        }}
      />
    );
  }
  return <GameBadge name={name} colorIndex={colorIndex} size={size} />;
}

/** Nút thoát chia đều — nút phụ full-width đặt dưới hành động chính của màn. */
export function SplitEvenButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-line-strong bg-card px-4 py-2.5 text-base font-semibold text-ink transition hover:border-brand hover:text-brand-deep"
    >
      {SPLIT_EVEN_LABEL}
    </button>
  );
}

/**
 * Icon loa cho nút tiếng — SVG inline CÙNG HỆ «Nét Chia» của app
 * (lưới 24, nét 2, stroke currentColor, đầu nét vuông — như
 * components/chiatien/icons.tsx), thay emoji loa lạc hệ (panel v4).
 * Icon là trang trí: aria-hidden tại gốc, nhãn của nút do aria-label
 * + chữ «Đã tắt tiếng»/«Đang có tiếng» cạnh icon đảm nhiệm.
 */
function SpeakerIcon({ muted }: { muted: boolean }) {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden
      focusable={false}
      className="shrink-0"
    >
      <path d="M4 9.5v5h3.2L12 18V6L7.2 9.5H4z" />
      {muted ? (
        <path d="M16 9.8l5.2 5.2M21.2 9.8L16 15" />
      ) : (
        <path d="M15.5 9.7a3.4 3.4 0 0 1 0 4.6M18.2 7.2a7 7 0 0 1 0 9.6" />
      )}
    </svg>
  );
}

/** Nút tắt/bật tiếng — luôn thấy được trong mọi màn game (SPEC §M6/§9). */
export function MuteButton({ muted, onToggle }: { muted: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={muted}
      aria-label={muted ? 'Bật tiếng' : 'Tắt tiếng'}
      className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-line bg-card px-3 py-2 text-sm font-semibold text-ink transition hover:border-brand hover:text-brand-deep"
    >
      <SpeakerIcon muted={muted} />
      {muted ? 'Tiếng: tắt' : 'Tiếng: bật'}
    </button>
  );
}

/** Khung cảnh báo đỏ (chặn). */
export function RedAlert({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-debt-solid bg-debt-bg px-3 py-2.5 text-base text-debt-ink"
    >
      {children}
    </div>
  );
}

/** Khung cảnh báo vàng (cần đối chiếu). */
export function YellowAlert({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-warning-solid bg-warning-bg px-3 py-2.5 text-base text-ink"
    >
      {children}
    </div>
  );
}

/** Khung thông tin trung tính. */
export function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-grey-50 px-3 py-2.5 text-base text-ink">
      {children}
    </div>
  );
}

export function ScreenTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="font-display text-2xl font-extrabold text-ink">{children}</h2>;
}

/**
 * Chuỗi kỹ thuật (mã cam kết C1, seed…) hiển thị dạng NHÓM 4 KÝ TỰ
 * (đợt PRES vòng 2, mục 12): mỗi nhóm là một span không ngắt dòng, khoảng
 * cách giữa các nhóm là margin thị giác — KHÔNG chèn ký tự trắng vào
 * chuỗi, nên textContent/copy/đối chiếu vẫn là chuỗi gốc nguyên vẹn từng
 * ký tự. Chuỗi chỉ được phép xuống dòng TẠI ranh giới nhóm, không bao
 * giờ ngắt giữa một nhóm hay giữa một từ nhãn đi kèm.
 */
export function GroupedTechString({ value, className }: { value: string; className?: string }) {
  const groups = value.match(/.{1,4}/g) ?? [];
  return (
    <span className={className}>
      {groups.map((group, i) => (
        <span key={i} className="whitespace-nowrap [&:not(:first-child)]:ml-[0.35em]">
          {group}
        </span>
      ))}
    </span>
  );
}

const SHEET_FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * GameSheet (UI-SLIM BS-1/T9/T10) — MỘT mẫu sheet/modal duy nhất của
 * game mode, bám đúng mẫu Sheet của app chính (components/chiatien/
 * sheet.tsx): render qua portal lên document.body (bài học TC6 — không
 * bị chrome của overlay game hay strip che), scrim bg-ink/45, panel
 * bottom-sheet trên mobile (bo góc trên 2xl) và giữa màn hình từ sm,
 * header dính (tiêu đề + nút đóng), thân cuộn riêng max-h 92dvh, Esc
 * đóng, bấm scrim đóng, khoá cuộn nền, focus vào panel khi mở và trả
 * focus về nút đã mở khi đóng, Tab vòng trong panel.
 *
 * KHÁC Sheet của app ở hai điểm có lý do: (1) lớp phủ phủ TOÀN màn
 * (không dừng ở --strip-h — trong game không có strip, overlay game đã
 * phủ kín và sheet phải che được cả header game); (2) z-[60] để đứng
 * trên overlay game (z-40).
 *
 * Dùng cho: «Đổi người chơi», «Đổi nhân vật» (thay panel nhúng trong
 * màn thiết lập — nội dung phía sau giữ nguyên chiều cao/vị trí cuộn/
 * trạng thái vì màn thiết lập vẫn mount nguyên vẹn sau sheet), hộp
 * thoại huỷ ván (play-screen) và thoát ván (entry).
 */
export function GameSheet({
  open,
  onClose,
  title,
  children,
  footer,
  compactHeader = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /**
   * Khối chân sheet render NGOÀI (sibling dưới) div thân cuộn — cấu
   * trúc 3 khối riêng header / thân / footer theo SPEC step23 §2.1.
   * Vắng prop này thì sheet giữ nguyên hành vi cũ (không footer).
   */
  footer?: React.ReactNode;
  /**
   * SPEC step23 §2.1: biến thể header GỌN tuỳ chọn — tiêu đề 19px
   * (thang app), khối header ~52px, nút × giữ vùng chạm 44px. Mặc
   * định (false) giữ nguyên hành vi/kích thước hiện tại cho mọi
   * sheet khác; trần max-h của sheet KHÔNG đổi ở cả hai biến thể.
   */
  compactHeader?: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    openerRef.current = (document.activeElement as HTMLElement | null) ?? null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(SHEET_FOCUSABLE)).filter(
        (el) => el.offsetParent !== null,
      );
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = prevOverflow;
      const opener = openerRef.current;
      if (opener && opener.isConnected) opener.focus();
    };
  }, [open]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Đóng"
        onClick={onClose}
        className="animate-fade-in absolute inset-0 h-full w-full cursor-default bg-ink/45"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        // Addendum §4 / S5-1: đệm safe-area đáy cho TOÀN panel —
        // footer (vd thanh 72px của sheet nhân vật) và thân sheet
        // không còn chui vào vùng home-indicator trên máy có tai thỏ.
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        className="animate-sheet-in relative flex max-h-[min(92dvh,100%)] w-full flex-col overflow-hidden rounded-t-2xl bg-card outline-none sm:max-w-lg sm:rounded-2xl"
      >
        <div
          className={
            compactHeader
              ? 'flex items-center justify-between gap-3 px-4 py-1 sm:px-5'
              : 'flex items-center justify-between gap-3 px-4 pt-4 pb-2 sm:px-5'
          }
        >
          <h2
            className={
              compactHeader
                ? 'min-w-0 truncate text-[19px] leading-[1.2] font-bold text-ink'
                : 'min-w-0 truncate font-display text-2xl font-extrabold text-ink'
            }
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={`Đóng ${title}`}
            className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted transition duration-100 ease-[var(--ease-lock)] hover:bg-grey-50 hover:text-ink ${
              compactHeader ? '' : '-mt-2 -mr-2'
            }`}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
        <div
          className={
            compactHeader
              ? // Biến thể wizard (SPEC step23 §2.1): đệm trên/dưới của
                // thân = 0 — thân sheet đo đúng theo công thức SPEC,
                // không cộng thêm pb-5 của biến thể mặc định.
                'min-h-0 overflow-y-auto px-4 sm:px-5'
              : 'min-h-0 overflow-y-auto px-4 pb-5 sm:px-5'
          }
        >
          {children}
        </div>
        {footer ? <div className="shrink-0">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}
