'use client';

import type { CSSProperties } from 'react';

/**
 * Bộ icon «Nét Chia» của REDESIGN-V3 (TYPE-AND-ICON §2) — thay toàn bộ
 * bộ icon Lucide trong components/. 15 icon lõi chép NGUYÊN path từ
 * `redesign-v3/chiatien/assets/icons/` (lưới 24, vùng sống 2–22, nét 2,0,
 * đầu nét vuông, góc trong vuông tuyệt đối, góc ngoài bo r2); màu qua
 * `currentColor` (mặc định --ink qua CSS color của nơi gọi). Các icon
 * không có bản đối ứng trong bộ 15 (pencil, trash, alert, undo, list,
 * more, wifi-off) được vẽ mới trong file này THEO ĐÚNG luật cấu trúc đó.
 *
 * API tương thích bộ icon cũ ở các call-site: `size`, `className`,
 * `aria-hidden`, `style`. Icon là trang trí — `aria-hidden` mặc định
 * true ngay tại gốc (Panel #05 R2-F2); nơi gọi chịu trách nhiệm nhãn
 * của nút chứa và chỉ override aria-hidden khi có lý do tường minh.
 */
export type CtIconProps = {
  size?: number;
  className?: string;
  'aria-hidden'?: boolean | 'true' | 'false';
  style?: CSSProperties;
};

function base(props: CtIconProps) {
  const { size = 24, className, style } = props;
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'square' as const,
    strokeLinejoin: 'miter' as const,
    className,
    style,
    // Panel #05 R2-F2 (MINOR): icon của hệ LÀ trang trí (khai ở đầu file)
    // nên mặc định aria-hidden="true" ngay tại gốc — trước đây nơi gọi
    // quên truyền là SVG rơi vào DOM thiếu aria-hidden (điển hình IconQr
    // trong nút «VietQR»). Nơi gọi vẫn override tường minh được.
    'aria-hidden': props['aria-hidden'] ?? true,
    focusable: false as const,
  };
}

/* ---------------- Bộ 15 lõi — path chép nguyên từ assets/icons/ ---------------- */

export function IconPlus(props: CtIconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 4v16M4 12h16" />
    </svg>
  );
}

export function IconCheck(props: CtIconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 12.5 9.5 18 20 6" />
    </svg>
  );
}

export function IconX(props: CtIconProps) {
  return (
    <svg {...base(props)}>
      <path d="M5 5l14 14M19 5 5 19" />
    </svg>
  );
}

export function IconChevronRight(props: CtIconProps) {
  return (
    <svg {...base(props)}>
      <path d="M9 4l8 8-8 8" />
    </svg>
  );
}

/** Chevron trái = CÙNG path chevron-right xoay 180° (CSS transform). */
export function IconChevronLeft(props: CtIconProps) {
  const { style, ...rest } = props;
  return (
    <svg {...base({ ...rest, style: { transform: 'rotate(180deg)', ...style } })}>
      <path d="M9 4l8 8-8 8" />
    </svg>
  );
}

/** Chevron xuống = CÙNG path chevron-right xoay 90° (CSS transform). */
export function IconChevronDown(props: CtIconProps) {
  const { style, ...rest } = props;
  return (
    <svg {...base({ ...rest, style: { transform: 'rotate(90deg)', ...style } })}>
      <path d="M9 4l8 8-8 8" />
    </svg>
  );
}

/** Chevron lên = CÙNG path chevron-right xoay −90° (CSS transform). */
export function IconChevronUp(props: CtIconProps) {
  const { style, ...rest } = props;
  return (
    <svg {...base({ ...rest, style: { transform: 'rotate(-90deg)', ...style } })}>
      <path d="M9 4l8 8-8 8" />
    </svg>
  );
}

/** Mũi tên quyết toán bản nét — cho các mũi tên UI nhỏ (không phải vai glyph tĩnh). */
export function IconArrowSettle(props: CtIconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3 9.5h10V6l7 6-7 6v-3.5H3M3 12.7h2.4M7.2 12.7h2.4" />
    </svg>
  );
}

export function IconQr(props: CtIconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h3v3h-3zM20 14v.01M17 20h3v-3" />
    </svg>
  );
}

export function IconBank(props: CtIconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3 9 12 4l9 5M4 9v10M20 9v10M9.3 9v10M14.7 9v10M2.5 20.5h19" />
    </svg>
  );
}

export function IconUsers(props: CtIconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="9" cy="8" r="3.4" />
      <path d="M3.5 20c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5M16 5.2a3.4 3.4 0 0 1 0 6M17.8 15.3c1.9.7 3.2 2.3 3.7 4.7" />
    </svg>
  );
}

export function IconShare(props: CtIconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3v11M7.5 6 12 2.5 16.5 6M5 12v8.5h14V12" />
    </svg>
  );
}

export function IconLink(props: CtIconProps) {
  return (
    <svg {...base(props)}>
      <path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 1 0-6.4-6.4l-1.5 1.5M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 1 0 6.4 6.4l1.5-1.5" />
    </svg>
  );
}

export function IconCopy(props: CtIconProps) {
  return (
    <svg {...base(props)}>
      <rect x="8.5" y="8.5" width="12" height="12" rx="2" />
      <path d="M15.5 8.5v-3a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3" />
    </svg>
  );
}

export function IconReceipt(props: CtIconProps) {
  return (
    <svg {...base(props)}>
      <path d="M5 3h14v18l-2.3-1.6L14.4 21l-2.4-1.6L9.6 21 7.3 19.4 5 21zM8.5 8h7M8.5 12h7M8.5 16h4" />
    </svg>
  );
}

export function IconSplit(props: CtIconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3v18M12 8H6.5A2.5 2.5 0 0 0 4 10.5M12 8h5.5A2.5 2.5 0 0 1 20 10.5M12 16H6a2 2 0 0 0-2 2M12 16h6a2 2 0 0 1 2 2" />
    </svg>
  );
}

export function IconWallet(props: CtIconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3.5 6.5A2.5 2.5 0 0 1 6 4h12.5v3M3.5 6.5V18A2.5 2.5 0 0 0 6 20.5h14.5v-13H6A2.5 2.5 0 0 1 3.5 6.5zM16.8 14h.01" />
    </svg>
  );
}

export function IconLock(props: CtIconProps) {
  return (
    <svg {...base(props)}>
      <rect x="4.5" y="10" width="15" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14.5v2" />
    </svg>
  );
}

/* ---------------- Glyph khía đôi — vai quyết toán TĨNH (IDENTITY §5, LK-22) ----------------
   Path chép nguyên từ assets/glyph-khia-doi.svg (đã ship ở
   public/products/brand/glyph-khia-doi.svg): mũi tên ngang, đuôi chẻ hai
   khía song song — đúng module kẻ đôi của mark, góc trong vuông tuyệt đối.
   Fill = currentColor (nơi gọi giữ --ink). TĨNH tuyệt đối: không
   animation/transition nào được áp lên glyph này (C8). */
export function IconSettleGlyph(props: CtIconProps) {
  const { size = 24, className } = props;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden={props['aria-hidden'] ?? true}
      focusable={false}
    >
      <path d="M 3 9.2 H 13 V 6.4 L 20.4 12 L 13 17.6 V 14.8 H 3 V 13.4 H 5.6 V 10.6 H 3 Z M 7.4 10.6 H 9.8 V 13.4 H 7.4 Z" />
    </svg>
  );
}

/* ---------------- Icon vẽ mới theo luật «Nét Chia» (không có bản đối ứng trong bộ 15) ----------------
   Cùng lưới 24 / vùng sống 2–22 / nét 2,0 / đầu nét vuông / góc trong
   vuông tuyệt đối / góc ngoài bo r2. Render-kiểm ở 16/24px ghi ở W2 log. */

export function IconPencil(props: CtIconProps) {
  return (
    <svg {...base(props)}>
      <path d="M5.2 18.8 6.3 14.9 16.6 4.6a2.05 2.05 0 0 1 2.9 0l.1.1a2.05 2.05 0 0 1 0 2.9L9.3 17.9l-4.1.9z" />
      <path d="M14.8 6.4l2.9 2.9" />
    </svg>
  );
}

export function IconTrash(props: CtIconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3.5 6.5h17M9.5 6.5v-2a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2M5.8 6.5l.9 12.2a2 2 0 0 0 2 1.8h6.6a2 2 0 0 0 2-1.8l.9-12.2M10 10.5v6M14 10.5v6" />
    </svg>
  );
}

export function IconAlertTriangle(props: CtIconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3.8 2.9 19.2a1.8 1.8 0 0 0 1.6 2.6h15a1.8 1.8 0 0 0 1.6-2.6L12 3.8z" />
      <path d="M12 9.5v4.5M12 17.4v.01" />
    </svg>
  );
}

export function IconUndo(props: CtIconProps) {
  return (
    <svg {...base(props)}>
      <path d="M8.5 5 4 9.5 8.5 14" />
      <path d="M4 9.5h9.5a6 6 0 0 1 0 12H9" />
    </svg>
  );
}

export function IconList(props: CtIconProps) {
  return (
    <svg {...base(props)}>
      <path d="M9.5 6h10.5M9.5 12h10.5M9.5 18h10.5M4.2 6h.01M4.2 12h.01M4.2 18h.01" />
    </svg>
  );
}

export function IconMoreHorizontal(props: CtIconProps) {
  const { size = 24, className } = props;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden={props['aria-hidden'] ?? true}
      focusable={false}
    >
      <circle cx="5" cy="12" r="1.7" />
      <circle cx="12" cy="12" r="1.7" />
      <circle cx="19" cy="12" r="1.7" />
    </svg>
  );
}

export function IconWifiOff(props: CtIconProps) {
  return (
    <svg {...base(props)}>
      <path d="M2.5 2.5l19 19" />
      <path d="M8.6 16.4a5 5 0 0 1 6.8 0M5.2 12.8a10.5 10.5 0 0 1 3.4-2.4M18.8 12.8a10.5 10.5 0 0 0-2-1.5M12 20h.01" />
    </svg>
  );
}
