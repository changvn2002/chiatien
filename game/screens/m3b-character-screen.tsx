// M3B — Chọn nhân vật (FIX-V3 N2b + N3, lane F): bước THÊM vào luồng
// sau M3 (đã chọn người chơi) và trước M4 (chọn game). Gồm:
// 1) Chọn BỘ cho cả bàn — hàng chip bộ (chỉ tên bộ, không mô tả; chip
//    đang chọn = nền neutral-900 + chữ trắng, mẫu segmented). Bộ lấy
//    từ manifest của lane A3; đang tải → khung chờ rõ ràng; vắng/lỗi →
//    bộ dự phòng Adventurers tích hợp kèm ghi chú nhỏ (xem
//    character-sets.ts). ĐỔI BỘ KHÔNG XOÁ GÁN CỦA BỘ KHÁC: gán được
//    nhớ theo từng bộ trong phiên mở sheet (bản đồ theo setId ở dưới),
//    lưới chỉ hiện gán của bộ đang xem (SPEC step23 §2.1, F-20).
// 2) Gán nhân vật TỪNG NGƯỜI — hàng chip người cuộn ngang (đĩa
//    PlayerAvatar + tên + tên nhân vật hiện tại) rồi chạm nhân vật
//    trong lưới 3×4 của bộ; trạng thái ô đọc bằng HÌNH (huy hiệu ✓ đặc
//    brand-500 khi gán cho người đang chọn; đĩa danh tính của chủ sở
//    hữu khi đã gán cho người khác — sprite giữ nguyên sắc, cấm
//    opacity; nhãn chữ trạng thái chỉ còn ở aria-label). Có lối
//    «Tự chọn» ở footer sheet (cơ chế gán mặc định cũ).
// 3) Ảnh avatar (N3) rút gọn thành 1 hàng: đĩa của người đang chọn +
//    nhãn «Ảnh đại diện» + icon-button ghost Camera / ImagePlus
//    (aria-label giữ nguyên văn). Camera getUserMedia CHỈ mở khi
//    người dùng bấm, dừng track ngay sau khi chụp; không mở được/quyền
//    bị từ chối → rơi về chọn file ảnh (input có capture). Ảnh cắt
//    VUÔNG ở giữa ngay trên máy (canvas), hiện TRÒN, lưu ở kho riêng
//    trên máy `ct-game-avatars-v1` — KHÔNG tải lên, KHÔNG vào ván/log/link.
//
// BẤT BIẾN: setId / characterKey sống trong draft (state.ts), ảnh sống
// trong kho ảnh riêng — cả hai là tầng trình diễn thuần, không vào
// engine / paramsHash / seed / bản ghi ván (bằng chứng: handoff lane F).

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { GameSessionInput } from '../adapter';
import { buildIdentityMapFromSessionMembers } from '../assets/identity';
import {
  AVATAR_PHOTO_SIZE,
  centerSquareCrop,
  removeAvatarPhoto,
  setAvatarPhoto,
} from '../assets/avatar-store';
import type { AvatarPhotoMap } from '../assets/avatar-store';
import type { GameDraft } from '../state';
import {
  FALLBACK_SETS,
  canAssignCharacter,
  characterByKey,
  defaultAssignments,
  ensureAssignments,
  loadCharacterSetsDetailed,
  setById,
  takenByOther,
} from './character-sets';
import type { CharacterDef, CharacterSetDef } from './character-sets';
import { PlayerAvatar, ScreenTitle, SplitEvenButton } from './shared';

/**
 * Dòng riêng tư của N3 — SPEC step23 §5.4 (2V-21) BỎ khỏi sheet nhân
 * vật; nơi ở đúng của nó là sheet «Luật chơi & chi tiết» của
 * setup-screen. Hằng giữ nguyên văn tại đây (API cũ) nhưng KHÔNG còn
 * render trong màn này.
 */
export const AVATAR_PRIVACY_LINE =
  'Ảnh chỉ lưu trên máy này — không tải lên máy chủ, không gắn vào link chia sẻ.';

/* ------------------------------------------------------------------ */
/* Icon Lucide (vẽ inline đúng path Lucide — lucide-react không phải  */
/* dependency trực tiếp của app nên không import được; nét 2, stroke  */
/* currentColor như hệ icon của app).                                 */
/* ------------------------------------------------------------------ */

function LucideGlyph({ children }: { children: ReactNode }) {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable={false}
      className="shrink-0"
    >
      {children}
    </svg>
  );
}

function CameraIcon() {
  return (
    <LucideGlyph>
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </LucideGlyph>
  );
}

function ImagePlusIcon() {
  return (
    <LucideGlyph>
      <path d="M16 5h6" />
      <path d="M19 2v6" />
      <path d="M21 11.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7.5" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
      <circle cx="9" cy="9" r="2" />
    </LucideGlyph>
  );
}

function TrashIcon() {
  return (
    <LucideGlyph>
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </LucideGlyph>
  );
}

/** Huy hiệu ✓ trắng trên đĩa đặc brand-500 20px (góc ô lưới). */
function CheckBadge() {
  return (
    <span
      aria-hidden
      className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-500"
    >
      <svg
        width={12}
        height={12}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        focusable={false}
      >
        <path d="M20 6 9 17l-5-5" />
      </svg>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Crop frame idle THẬT từ atlas của nhân vật (kỹ thuật M4/P6).        */
/* ------------------------------------------------------------------ */

interface AtlasFrameInfo {
  sheetW: number;
  sheetH: number;
  frame: { x: number; y: number; w: number; h: number };
}

/** Hình học dự phòng = atlas Adventurers đã ship (768×1728, ô 192, idle_0 ở (0,0)). */
const FALLBACK_FRAME: AtlasFrameInfo = {
  sheetW: 768,
  sheetH: 1728,
  frame: { x: 0, y: 0, w: 192, h: 192 },
};

const atlasCache = new Map<string, Promise<AtlasFrameInfo | null>>();

function loadAtlasFrame(atlasBase: string): Promise<AtlasFrameInfo | null> {
  let pending = atlasCache.get(atlasBase);
  if (!pending) {
    pending = fetch(`${atlasBase}.json`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json: unknown) => {
        if (!json || typeof json !== 'object') return null;
        const root = json as {
          frames?:
            | Record<string, { frame?: AtlasFrameInfo['frame'] }>
            | { filename?: string; frame?: AtlasFrameInfo['frame'] }[];
          meta?: { size?: { w: number; h: number } };
        };
        const size = root.meta?.size;
        if (!size) return null;
        let frame: AtlasFrameInfo['frame'] | undefined;
        if (Array.isArray(root.frames)) {
          frame = (root.frames.find((f) => f.filename?.includes('idle_0')) ?? root.frames[0])
            ?.frame;
        } else if (root.frames) {
          frame = (root.frames['idle_0'] ?? Object.values(root.frames)[0])?.frame;
        }
        return frame ? { sheetW: size.w, sheetH: size.h, frame } : null;
      })
      .catch(() => null);
    atlasCache.set(atlasBase, pending);
  }
  return pending;
}

/**
 * Ảnh nhân vật cắt từ SHEET XEM TRƯỚC của bộ (contract A4): lưới
 * `preview.cols` cột, ô vuông `preview.cell` px, nhân vật ở ô theo
 * đúng thứ tự trong mảng characters của bộ. Nhân vật 3/4 hướng mặt
 * về phía người xem — đây là đường hiển thị chính của màn chọn.
 */
function PreviewCrop({
  characterSet,
  index,
  size,
  className,
  style,
}: {
  characterSet: CharacterSetDef;
  index: number;
  size: number;
  className?: string;
  style?: CSSProperties;
}) {
  const preview = characterSet.preview!;
  const rows = Math.max(1, Math.ceil(characterSet.characters.length / preview.cols));
  const col = index % preview.cols;
  const row = Math.floor(index / preview.cols);
  const scale = size / preview.cell;
  return (
    <span
      aria-hidden
      className={className}
      style={{
        display: 'block',
        width: size,
        height: size,
        backgroundImage: `url(${preview.webp})`,
        backgroundSize: `${preview.cols * preview.cell * scale}px ${rows * preview.cell * scale}px`,
        backgroundPosition: `-${col * preview.cell * scale}px -${row * preview.cell * scale}px`,
        backgroundRepeat: 'no-repeat',
        ...style,
      }}
    />
  );
}

/** Ảnh nhân vật cắt từ atlas thật của bộ — frame idle, hiển thị ở cạnh `size` (đường dự phòng). */
function AtlasCrop({
  character,
  size,
  className,
  style,
}: {
  character: CharacterDef;
  size: number;
  className?: string;
  style?: CSSProperties;
}) {
  const [info, setInfo] = useState<AtlasFrameInfo | null>(null);
  useEffect(() => {
    let alive = true;
    void loadAtlasFrame(character.atlasBase).then((v) => {
      if (alive) setInfo(v);
    });
    return () => {
      alive = false;
    };
  }, [character.atlasBase]);
  const { sheetW, sheetH, frame } = info ?? FALLBACK_FRAME;
  const scale = size / frame.w;
  return (
    <span
      aria-hidden
      className={className}
      style={{
        display: 'block',
        width: size,
        height: (frame.h / frame.w) * size,
        backgroundImage: `url(${character.atlasBase}.webp)`,
        backgroundSize: `${sheetW * scale}px ${sheetH * scale}px`,
        backgroundPosition: `-${frame.x * scale}px -${frame.y * scale}px`,
        backgroundRepeat: 'no-repeat',
        ...style,
      }}
    />
  );
}

/**
 * Ảnh nhân vật ở màn chọn: có sheet xem trước (kèm `characterSet` +
 * `index` của nhân vật trong bộ) → crop từ sheet xem trước; bộ chưa
 * có sheet (bộ dự phòng atlas cũ, hoặc manifest thiếu/sai trường
 * xem trước) → crop frame idle từ atlas như cách cũ.
 */
export function CharacterCrop({
  character,
  characterSet,
  index,
  size,
  className,
  style,
}: {
  character: CharacterDef;
  characterSet?: CharacterSetDef;
  index?: number;
  size: number;
  className?: string;
  style?: CSSProperties;
}) {
  if (characterSet?.preview && typeof index === 'number' && index >= 0) {
    return (
      <PreviewCrop
        characterSet={characterSet}
        index={index}
        size={size}
        className={className}
        style={style}
      />
    );
  }
  return <AtlasCrop character={character} size={size} className={className} style={style} />;
}

/* ------------------------------------------------------------------ */
/* Màn M3B                                                             */
/* ------------------------------------------------------------------ */

export function M3BCharacterScreen({
  input,
  draft,
  onDraft,
  onNext,
  onBack,
  onSplitEven,
  photos,
  onPhotosChanged,
  embedded = false,
}: {
  input: GameSessionInput;
  draft: GameDraft;
  onDraft: (next: GameDraft) => void;
  onNext: () => void;
  onBack: () => void;
  onSplitEven: () => void;
  /** Ảnh avatar trên máy (tra theo member id) — entry sở hữu state, màn này chỉ đọc + báo đổi. */
  photos: AvatarPhotoMap;
  onPhotosChanged: (next: Map<string, string>) => void;
  /**
   * FIX-UX-GAME: nhúng vào màn thiết lập gộp (nút «Đổi nhân vật») — ẩn
   * tiêu đề + đoạn mô tả dài + hàng nút điều hướng; đổi bộ/gán áp ngay
   * vào draft, không cần bấm Tiếp tục riêng. Footer của sheet («Tự
   * chọn» / «Xong») KHÔNG render trong thân này nữa: setup-screen
   * dựng footer và truyền vào GameSheet qua prop `footer` (sibling
   * ngoài div cuộn, SPEC step23 §2.1) bằng đúng các hàm gán mặc
   * định/chốt gán mà màn này dùng nội bộ.
   */
  embedded?: boolean;
}) {
  const players = useMemo(
    () =>
      draft.selectedPlayerIds
        .map((id) => input.members.find((m) => m.id === id))
        .filter((m): m is NonNullable<typeof m> => Boolean(m)),
    [draft.selectedPlayerIds, input],
  );
  const identityMap = useMemo(() => buildIdentityMapFromSessionMembers(input.members), [input]);

  // sets = null nghĩa là manifest ĐANG NẠP: màn hình hiện khung chờ
  // thật, KHÔNG dựng thẻ bộ dự phòng ngay (tránh nháy hình như các
  // đợt trước). Chỉ khi tải LỖI mới chuyển sang bộ dự phòng + ghi chú.
  const [sets, setSets] = useState<readonly CharacterSetDef[] | null>(null);
  const [setsFromFallback, setSetsFromFallback] = useState(false);
  const [activeId, setActiveId] = useState<string>(() => draft.selectedPlayerIds[0] ?? '');
  const active = players.find((p) => p.id === activeId) ?? players[0];

  const set = setById(sets ?? FALLBACK_SETS, draft.characterSetId);
  const assignments = useMemo(
    () => ensureAssignments(draft.selectedPlayerIds, set, draft.characterAssignments),
    [draft.selectedPlayerIds, draft.characterAssignments, set],
  );

  // Gán theo TỪNG BỘ (SPEC step23 §2.1 F-20): draft chỉ giữ gán của bộ
  // đang chọn, nên màn này nhớ thêm bản đồ setId → gán của mọi bộ đã
  // xem trong phiên mở màn/sheet. Đổi bộ = cất gán bộ hiện tại vào bản
  // đồ rồi khôi phục gán đã nhớ của bộ đích (chưa từng xem → gán mặc
  // định của bộ đó); lưới luôn chỉ hiện gán của bộ đang xem.
  const assignmentsBySetRef = useRef<Record<string, Record<string, string>>>({});
  useEffect(() => {
    assignmentsBySetRef.current[set.setId] = assignments;
  }, [assignments, set.setId]);

  // Tải manifest các bộ (lane A3) — đang tải giữ trạng thái chờ;
  // vắng/lỗi mới dùng bộ dự phòng (kèm cờ để hiện ghi chú trung tính).
  useEffect(() => {
    let alive = true;
    void loadCharacterSetsDetailed().then((result) => {
      if (alive) {
        setSets(result.sets);
        setSetsFromFallback(result.fromFallback);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  // Đồng bộ draft: chốt bộ hiệu lực + gán bảo toàn/không trùng. Chỉ
  // gọi onDraft khi thật sự lệch để không lặp vô hạn. Chưa tải xong
  // manifest thì CHƯA chốt gì vào draft (tránh chốt nhầm bộ dự phòng).
  useEffect(() => {
    if (!sets) return;
    const mismatch =
      draft.characterSetId !== set.setId ||
      JSON.stringify(draft.characterAssignments) !== JSON.stringify(assignments);
    if (mismatch) {
      onDraft({ ...draft, characterSetId: set.setId, characterAssignments: assignments });
    }
  }, [draft, set, assignments, onDraft, sets]);

  function chooseSet(next: CharacterSetDef) {
    if (next.setId === set.setId) return;
    // Cất gán của bộ đang xem trước khi chuyển (không xoá gán bộ khác).
    assignmentsBySetRef.current[set.setId] = assignments;
    const saved = assignmentsBySetRef.current[next.setId];
    onDraft({
      ...draft,
      characterSetId: next.setId,
      characterAssignments: saved
        ? ensureAssignments(draft.selectedPlayerIds, next, saved)
        : defaultAssignments(draft.selectedPlayerIds, next),
    });
  }

  function assign(characterKey: string) {
    // Chọn tay cũng phải qua LUẬT CÂN BẰNG MẪU (character-sets.ts):
    // nhân vật đã có người khác giữ, hoặc mẫu gốc của nhân vật đó đã
    // đông hơn các mẫu ít người nhất → từ chối, giữ nguyên gán cũ.
    if (!active || !canAssignCharacter(assignments, active.id, characterKey, set)) return;
    onDraft({
      ...draft,
      characterSetId: set.setId,
      characterAssignments: { ...assignments, [active.id]: characterKey },
    });
  }

  function skipAutoAssign() {
    onDraft({
      ...draft,
      characterSetId: set.setId,
      characterAssignments: defaultAssignments(draft.selectedPlayerIds, set),
    });
    onNext();
  }

  /* ---------------- Ảnh avatar (N3) ---------------- */
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const captureInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraForId, setCameraForId] = useState<string | null>(null);
  const [photoNote, setPhotoNote] = useState('');

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
    setCameraForId(null);
  }, []);

  // Dừng camera khi rời màn (đổi người đang chọn thì dừng ngay trong
  // handler chạm chip người — xem nút chọn người ở dưới).
  useEffect(() => stopCamera, [stopCamera]);

  async function startCamera() {
    if (!active) return;
    setPhotoNote('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      setCameraForId(active.id);
      setCameraOn(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play().catch(() => undefined);
        }
      });
    } catch {
      // Không có camera / quyền bị từ chối → rơi về chọn file ảnh (input có capture).
      setPhotoNote(
        'Không mở được camera (chưa cấp quyền hoặc máy không có camera). Chọn ảnh có sẵn — trên điện thoại vẫn chụp trực tiếp được.',
      );
      captureInputRef.current?.click();
    }
  }

  /** Cắt VUÔNG ở giữa ngay trên máy rồi lưu vào kho ảnh riêng. */
  function savePhotoFromSource(
    memberId: string,
    source: CanvasImageSource,
    sourceWidth: number,
    sourceHeight: number,
  ) {
    const crop = centerSquareCrop(sourceWidth, sourceHeight);
    const canvas = document.createElement('canvas');
    canvas.width = AVATAR_PHOTO_SIZE;
    canvas.height = AVATAR_PHOTO_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setPhotoNote('Máy này không xử lý được ảnh. Hãy thử ảnh khác.');
      return;
    }
    ctx.drawImage(
      source,
      crop.sx,
      crop.sy,
      crop.size,
      crop.size,
      0,
      0,
      AVATAR_PHOTO_SIZE,
      AVATAR_PHOTO_SIZE,
    );
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    onPhotosChanged(setAvatarPhoto(memberId, dataUrl));
    setPhotoNote('Đã lưu ảnh đại diện trên máy này.');
  }

  function capturePhoto() {
    const video = videoRef.current;
    const targetId = cameraForId;
    if (!video || !targetId || video.videoWidth === 0) return;
    savePhotoFromSource(targetId, video, video.videoWidth, video.videoHeight);
    stopCamera(); // Dừng track ngay sau khi chụp.
  }

  function onPickPhotoFile(file: File | null) {
    if (!file || !active) return;
    const targetId = active.id;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      savePhotoFromSource(targetId, img, img.naturalWidth, img.naturalHeight);
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setPhotoNote('Không đọc được ảnh này. Hãy thử ảnh khác.');
    };
    img.src = url;
  }

  const activeIdentity = active ? identityMap.get(active.id) : undefined;
  const activePhoto = active ? photos.get(active.id) : undefined;

  // Màu SPEC §1.3 (tokens v4): thang «neutral» của SPEC = thang grey
  // Material của app (grey-700 #616161 = neutral-700, grey-900 #212121
  // = neutral-900, grey-300 #E0E0E0 = neutral-300, grey-100 #F5F5F5 =
  // neutral-100) — dùng class grey-* để trúng hex, vì @theme chỉ khai
  // neutral tới bậc 500 (neutral-700/900 của Tailwind mặc định lệch hex).
  return (
    <div>
      {embedded ? null : (
        <>
          <ScreenTitle>Chọn nhân vật</ScreenTitle>
          <p className="mt-1 text-base text-ink-2">
            Cả bàn dùng chung một bộ. Mỗi người một nhân vật riêng, không trùng nhau; app chia đều
            các mẫu để mọi người dễ phân biệt.
          </p>
        </>
      )}

      {/* --- Chọn bộ: nhãn 20 + gap 8 + chip 44 = khối 72px --- */}
      <div className={`flex h-5 items-center gap-1.5 ${embedded ? '' : 'mt-5'}`}>
        <h3 className="text-[12px] leading-[1.2] font-semibold text-grey-700">BỘ NHÂN VẬT</h3>
        {sets ? (
          <span className="text-[12px] leading-[1.2] text-grey-700">· {set.characters.length}</span>
        ) : null}
      </div>
      {!sets ? (
        <div
          role="status"
          aria-live="polite"
          className="mt-2 rounded-xl border border-grey-300 bg-grey-100 px-4 py-6"
        >
          <p className="text-[14px] leading-[1.35] font-semibold text-ink">Đang tải bộ nhân vật…</p>
          <p className="mt-1 text-[13px] leading-[1.35] text-grey-700">
            Danh sách bộ sẽ hiện ngay khi tải xong.
          </p>
          <div aria-hidden className="mt-4 space-y-2">
            <div className="h-4 w-2/3 animate-pulse rounded bg-grey-300" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-grey-300" />
            <div className="h-4 w-3/5 animate-pulse rounded bg-grey-300" />
          </div>
        </div>
      ) : (
        <>
          <div className="mt-2 flex gap-2">
            {sets.map((s) => {
              const chosen = s.setId === set.setId;
              return (
                <button
                  key={s.setId}
                  type="button"
                  aria-pressed={chosen}
                  onClick={() => chooseSet(s)}
                  className={`flex h-11 flex-1 items-center justify-center rounded-full px-[14px] text-[14px] leading-[1.2] font-semibold transition ${
                    chosen ? 'bg-grey-900 text-white' : 'border border-grey-300 bg-card text-ink'
                  }`}
                >
                  {s.name}
                </button>
              );
            })}
          </div>
          {setsFromFallback ? (
            <p className="mt-2 text-[13px] leading-[1.35] text-grey-700">
              Không tải được danh sách bộ nhân vật — đang dùng bộ có sẵn trên máy.
            </p>
          ) : null}

          {/* --- Chọn người: nhãn 20 + gap 8 + chip 56 --- */}
          <h3 className="mt-4 flex h-5 items-center text-[12px] leading-[1.2] font-semibold text-grey-700">
            CHỌN NGƯỜI
          </h3>
          <div className="mt-2 flex h-14 gap-2 overflow-x-auto">
            {players.map((p) => {
              const identity = identityMap.get(p.id);
              const isActive = active?.id === p.id;
              const ch = characterByKey(set, assignments[p.id]);
              return (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => {
                    stopCamera();
                    setActiveId(p.id);
                  }}
                  className={`flex h-14 shrink-0 items-center gap-2 rounded-full py-2 pr-4 pl-3 text-left transition ${
                    isActive
                      ? 'border-2 border-brand-500 bg-card'
                      : 'border-2 border-transparent bg-grey-100'
                  }`}
                >
                  <PlayerAvatar
                    name={p.displayName}
                    colorIndex={identity?.colorIndex ?? 0}
                    size={28}
                    photoDataUrl={photos.get(p.id)}
                  />
                  <span className="flex flex-col">
                    <span
                      className={`text-[14px] leading-[1.2] font-semibold ${
                        isActive ? 'text-brand-950' : 'text-ink'
                      }`}
                    >
                      {p.displayName}
                    </span>
                    <span className="text-[13px] leading-[1.35] text-grey-700">
                      {ch ? ch.name : 'Chưa có nhân vật'}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* --- Lưới nhân vật: 4 hàng × 108 + 3 gap 8 = 456px (bộ 12) --- */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            {set.characters.map((c, idx) => {
              const mine = active ? assignments[active.id] === c.characterKey : false;
              const taken = active ? takenByOther(assignments, c.characterKey, active.id) : false;
              // Bị chặn bởi luật cân bằng mẫu: nhân vật còn trống nhưng mẫu
              // gốc của nó đã đông hơn các mẫu ít người nhất trong bộ.
              const modelBlocked =
                !mine && !taken && active
                  ? !canAssignCharacter(assignments, active.id, c.characterKey, set)
                  : false;
              const blocked = taken || modelBlocked;
              const owner = taken
                ? players.find((p) => p.id !== active?.id && assignments[p.id] === c.characterKey)
                : undefined;
              const ownerIdentity = owner ? identityMap.get(owner.id) : undefined;
              return (
                <button
                  key={c.characterKey}
                  type="button"
                  disabled={blocked}
                  aria-disabled={blocked || undefined}
                  aria-pressed={mine}
                  aria-label={
                    taken
                      ? `${c.name} — ${owner?.displayName ?? 'Người khác'} đã chọn, không chọn được`
                      : modelBlocked
                        ? `${c.name} — mẫu này đã đủ người, không chọn được`
                        : undefined
                  }
                  onClick={() => assign(c.characterKey)}
                  className={`relative flex h-[108px] flex-col items-center rounded-xl p-2 text-center transition ${
                    mine
                      ? 'border-2 border-brand-500 bg-card'
                      : blocked
                        ? 'border border-grey-300 bg-grey-100'
                        : 'border border-grey-300 bg-card'
                  }`}
                >
                  {mine ? <CheckBadge /> : null}
                  {owner ? (
                    <span aria-hidden className="absolute top-1 right-1">
                      <PlayerAvatar
                        name={owner.displayName}
                        colorIndex={ownerIdentity?.colorIndex ?? 0}
                        size={20}
                        photoDataUrl={photos.get(owner.id)}
                      />
                    </span>
                  ) : null}
                  <CharacterCrop character={c} characterSet={set} index={idx} size={56} />
                  <span className="mt-1.5 flex h-[30px] w-full items-start justify-center text-center text-[12px] leading-[15px] font-semibold text-ink">
                    {c.name}
                  </span>
                </button>
              );
            })}
          </div>
          {set.characters.length < players.length ? (
            <p className="mt-2 text-[13px] leading-[1.35] text-grey-700">
              Bộ có {set.characters.length} nhân vật cho {players.length} người — hết nhân vật
              trống, app gán lặp, ưu tiên mẫu ít người chọn nhất.
            </p>
          ) : null}

          {/* --- Hàng avatar gọn 56px (N3) --- */}
          {active ? (
            <>
              <div className="mt-4 flex h-14 items-center gap-3">
                <PlayerAvatar
                  name={active.displayName}
                  colorIndex={activeIdentity?.colorIndex ?? 0}
                  size={32}
                  photoDataUrl={activePhoto}
                />
                <span className="text-[14px] leading-[1.2] font-semibold text-ink">
                  Ảnh đại diện
                </span>
                {!cameraOn ? (
                  <span className="ml-auto flex items-center gap-2">
                    <button
                      type="button"
                      aria-label="Chụp ảnh làm avatar"
                      onClick={() => void startCamera()}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full text-ink transition hover:bg-grey-100"
                    >
                      <CameraIcon />
                    </button>
                    <button
                      type="button"
                      aria-label="Chọn ảnh có sẵn"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full text-ink transition hover:bg-grey-100"
                    >
                      <ImagePlusIcon />
                    </button>
                    {activePhoto ? (
                      <button
                        type="button"
                        aria-label="Xoá ảnh"
                        onClick={() => {
                          onPhotosChanged(removeAvatarPhoto(active.id));
                          setPhotoNote('Đã xoá ảnh đại diện — quay về ký tự viết tắt.');
                        }}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-full text-debt-ink transition hover:bg-grey-100"
                      >
                        <TrashIcon />
                      </button>
                    ) : null}
                  </span>
                ) : null}
              </div>

              {cameraOn ? (
                <div className="mt-2">
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    className="aspect-square w-full max-w-[320px] rounded-full object-cover"
                    style={{ transform: 'scaleX(-1)' }}
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg bg-brand px-4 py-2.5 text-base font-bold text-ink-on-seed transition duration-100 ease-[var(--ease-lock)] hover:bg-brand-600 active:bg-brand-600"
                    >
                      Chụp ảnh
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg border border-line bg-card px-4 py-2.5 text-base font-semibold text-ink"
                    >
                      Đóng camera
                    </button>
                  </div>
                </div>
              ) : null}
              {photoNote ? (
                <p role="status" className="mt-2 text-[13px] leading-[1.35] text-grey-700">
                  {photoNote}
                </p>
              ) : null}
              <input
                ref={captureInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                aria-hidden
                tabIndex={-1}
                onChange={(e) => {
                  onPickPhotoFile(e.target.files?.[0] ?? null);
                  e.target.value = '';
                }}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                aria-hidden
                tabIndex={-1}
                onChange={(e) => {
                  onPickPhotoFile(e.target.files?.[0] ?? null);
                  e.target.value = '';
                }}
              />
            </>
          ) : null}

          {embedded ? null : (
            <>
              <button
                type="button"
                onClick={() => {
                  onDraft({
                    ...draft,
                    characterSetId: set.setId,
                    characterAssignments: assignments,
                  });
                  onNext();
                }}
                className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-brand px-4 py-2.5 text-base font-bold text-ink-on-seed transition duration-100 ease-[var(--ease-lock)] hover:bg-brand-600 active:bg-brand-600"
              >
                Tiếp tục
              </button>
              <button
                type="button"
                onClick={skipAutoAssign}
                className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-line-strong bg-card px-4 py-2.5 text-base font-semibold text-ink"
              >
                Tự chọn
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
        </>
      )}
    </div>
  );
}
