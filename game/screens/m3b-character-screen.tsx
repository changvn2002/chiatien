// M3B — Chọn nhân vật (FIX-V3 N2b + N3, lane F): bước THÊM vào luồng
// sau M3 (đã chọn người chơi) và trước M4 (chọn game). Gồm:
// 1) Chọn BỘ cho cả bàn — thẻ từng bộ: tên + ảnh xem trước THẬT (crop
//    từ sheet xem trước riêng của bộ — nhân vật 3/4 hướng mặt về phía
//    người xem; bộ không có sheet xem trước thì crop frame idle từ
//    atlas như cũ) + số nhân vật. Bộ lấy từ manifest của lane A3;
//    đang tải → khung chờ rõ ràng; vắng/lỗi → bộ dự phòng Adventurers
//    tích hợp kèm ghi chú nhỏ (xem character-sets.ts).
// 2) Gán nhân vật TỪNG NGƯỜI — chọn người (PlayerAvatar + tên +
//    strongHex) rồi chạm nhân vật trong lưới LỚN của bộ; nhân vật đã
//    có người khác giữ thì mờ + nhãn «Đã có người chọn» (một ván
//    không trùng nhân vật khi bộ còn đủ). Có lối «Để app tự chọn».
// 3) Chụp ảnh làm avatar (N3): camera getUserMedia CHỈ mở khi người
//    dùng bấm, dừng track ngay sau khi chụp; không mở được/quyền bị
//    từ chối → rơi về chọn file ảnh (input có capture). Ảnh cắt VUÔNG
//    ở giữa ngay trên máy (canvas), hiện TRÒN, lưu ở kho riêng trên
//    máy `ct-game-avatars-v1` — KHÔNG tải lên, KHÔNG vào ván/log/link.
//
// BẤT BIẾN: setId / characterKey sống trong draft (state.ts), ảnh sống
// trong kho ảnh riêng — cả hai là tầng trình diễn thuần, không vào
// engine / paramsHash / seed / bản ghi ván (bằng chứng: handoff lane F).

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
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
  modelAssignmentCount,
  setById,
  takenByOther,
} from './character-sets';
import type { CharacterDef, CharacterSetDef } from './character-sets';
import { PlayerAvatar, ScreenTitle, SplitEvenButton } from './shared';

/** Dòng riêng tư BẮT BUỘC của N3 — giữ đúng ý, không yếu đi. */
export const AVATAR_PRIVACY_LINE =
  'Ảnh chỉ lưu trên máy này để hiện trong game — không tải lên máy chủ, không đính kèm link chia sẻ.';

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
    // Đổi bộ → gán lại mặc định của bộ mới (phân biệt theo thứ tự bộ).
    onDraft({
      ...draft,
      characterSetId: next.setId,
      characterAssignments: defaultAssignments(draft.selectedPlayerIds, next),
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
        'Không mở được camera (chưa được cấp quyền hoặc máy không có camera). Hãy chọn ảnh có sẵn — trên điện thoại, nút chọn ảnh vẫn cho chụp trực tiếp.',
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
  const activeCharacter = active ? characterByKey(set, assignments[active.id]) : undefined;
  const activePhoto = active ? photos.get(active.id) : undefined;

  return (
    <div>
      <ScreenTitle>Chọn nhân vật</ScreenTitle>
      <p className="mt-1 text-base text-ink-2">
        Cả bàn dùng chung một bộ nhân vật. Mỗi người chọn một nhân vật của riêng mình — không hai
        người trùng một nhân vật. App cũng chia đều các mẫu nhân vật cho cả bàn, để mọi người trông
        khác nhau rõ rệt và dễ phân biệt trong sân.
      </p>

      {/* --- Chọn bộ --- */}
      <h3 className="mt-5 text-base font-bold text-ink">1 · Chọn bộ cho cả bàn</h3>
      {!sets ? (
        <div
          role="status"
          aria-live="polite"
          className="mt-2 rounded-lg border border-line bg-grey-50 px-4 py-6"
        >
          <p className="text-base font-semibold text-ink">Đang tải bộ nhân vật…</p>
          <p className="mt-1 text-sm text-ink-2">
            Chờ một chút — danh sách bộ và nhân vật sẽ hiện ngay khi tải xong.
          </p>
          <div aria-hidden className="mt-4 space-y-2">
            <div className="h-4 w-2/3 animate-pulse rounded bg-line" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-line" />
            <div className="h-4 w-3/5 animate-pulse rounded bg-line" />
          </div>
        </div>
      ) : (
        <>
          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {sets.map((s) => {
              const chosen = s.setId === set.setId;
              return (
                <button
                  key={s.setId}
                  type="button"
                  aria-pressed={chosen}
                  onClick={() => chooseSet(s)}
                  className={`rounded-lg border-2 px-3 py-3 text-left transition ${
                    chosen ? 'border-brand bg-brand-50' : 'border-line-strong bg-card'
                  }`}
                >
                  <span className="flex flex-wrap gap-1.5" aria-hidden>
                    {s.characters.slice(0, 4).map((c, idx) => (
                      <CharacterCrop
                        key={c.characterKey}
                        character={c}
                        characterSet={s}
                        index={idx}
                        size={52}
                      />
                    ))}
                  </span>
                  <span className="mt-2 flex items-center gap-2">
                    <span className="font-display text-[18px] font-extrabold text-ink">
                      {s.name}
                    </span>
                    {chosen ? (
                      <span className="text-sm font-semibold text-brand-deep">Đã chọn</span>
                    ) : null}
                  </span>
                  <span className="mt-0.5 block text-sm text-ink-2">
                    {s.characters.length} nhân vật{s.theme ? ` · ${s.theme}` : ''}
                  </span>
                </button>
              );
            })}
          </div>
          {setsFromFallback ? (
            <p className="mt-2 text-sm text-ink-2">
              Không tải được danh sách bộ nhân vật — đang dùng bộ có sẵn trên máy.
            </p>
          ) : null}
        </>
      )}

      {sets ? (
        <>
          {/* --- Chọn người --- */}
          <h3 className="mt-6 text-base font-bold text-ink">
            2 · Chọn từng người rồi chạm nhân vật
          </h3>
          <div className="mt-2 flex flex-wrap gap-2">
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
                  className={`flex min-h-11 items-center gap-2 rounded-lg border px-3 py-2 text-left transition ${
                    isActive ? 'border-brand bg-brand-50' : 'border-line bg-card'
                  }`}
                >
                  <PlayerAvatar
                    name={p.displayName}
                    colorIndex={identity?.colorIndex ?? 0}
                    size={32}
                    photoDataUrl={photos.get(p.id)}
                    ringHex={identity?.strongHex}
                  />
                  <span className="text-base font-semibold text-ink">{p.displayName}</span>
                  {identity ? (
                    <span
                      aria-hidden
                      className="inline-block h-4 w-4 rounded-full border border-line-strong"
                      style={{ backgroundColor: identity.strongHex }}
                    />
                  ) : null}
                  <span className="text-sm text-ink-2">{ch ? ch.name : 'Chưa có nhân vật'}</span>
                </button>
              );
            })}
          </div>

          {/* --- Xem trước người đang chọn --- */}
          {active && activeCharacter ? (
            <div className="mt-4 flex items-center gap-4 rounded-lg border border-line bg-grey-50 px-4 py-3">
              <CharacterCrop
                character={activeCharacter}
                characterSet={set}
                index={set.characters.findIndex(
                  (c) => c.characterKey === activeCharacter.characterKey,
                )}
                size={96}
              />
              <div>
                <p className="text-sm text-ink-2">Đang chọn cho</p>
                <p className="font-display text-[20px] font-extrabold text-ink">
                  {active.displayName}
                </p>
                <p className="text-base text-ink">
                  Nhân vật: <strong>{activeCharacter.name}</strong> · Bộ {set.name}
                </p>
              </div>
            </div>
          ) : null}

          {/* --- Lưới nhân vật LỚN --- */}
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {set.characters.map((c, idx) => {
              const mine = active ? assignments[active.id] === c.characterKey : false;
              const taken = active ? takenByOther(assignments, c.characterKey, active.id) : false;
              // Bị chặn bởi luật cân bằng mẫu: nhân vật còn trống nhưng mẫu
              // gốc của nó đã đông hơn các mẫu ít người nhất trong bộ.
              const modelBlocked =
                !mine && !taken && active
                  ? !canAssignCharacter(assignments, active.id, c.characterKey, set)
                  : false;
              const modelCount =
                modelBlocked && active
                  ? modelAssignmentCount(assignments, c.characterKey, set, active.id)
                  : 0;
              const blocked = taken || modelBlocked;
              return (
                <button
                  key={c.characterKey}
                  type="button"
                  disabled={blocked}
                  aria-pressed={mine}
                  onClick={() => assign(c.characterKey)}
                  className={`flex min-h-11 flex-col items-center gap-1 rounded-lg border-2 px-2 py-2 transition ${
                    mine
                      ? 'border-brand bg-brand-50'
                      : blocked
                        ? 'border-line bg-grey-50'
                        : 'border-line-strong bg-card'
                  }`}
                >
                  <span className={blocked ? 'opacity-40' : undefined}>
                    <CharacterCrop character={c} characterSet={set} index={idx} size={72} />
                  </span>
                  <span className={`text-sm font-semibold ${blocked ? 'text-ink-2' : 'text-ink'}`}>
                    {c.name}
                  </span>
                  {mine ? (
                    <span className="text-xs font-semibold text-brand-deep">Đang chọn</span>
                  ) : null}
                  {taken ? (
                    <span className="text-xs font-semibold text-ink-2">Đã có người chọn</span>
                  ) : null}
                  {modelBlocked ? (
                    <span className="text-xs font-semibold text-ink-2">
                      Mẫu này đã có {modelCount} người chọn — chọn mẫu khác để dễ phân biệt
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
          {set.characters.length < players.length ? (
            <p className="mt-2 text-sm text-ink-2">
              Bộ này có {set.characters.length} nhân vật cho {players.length} người chơi — khi hết
              nhân vật trống, app gán lặp lại, ưu tiên mẫu đang ít người chọn nhất.
            </p>
          ) : null}

          {/* --- Ảnh avatar của người đang chọn (N3) --- */}
          {active ? (
            <div className="mt-6 rounded-lg border border-line-strong bg-card px-4 py-4">
              <h3 className="text-base font-bold text-ink">
                Ảnh đại diện của {active.displayName}
              </h3>
              <div className="mt-3 flex items-center gap-3">
                <PlayerAvatar
                  name={active.displayName}
                  colorIndex={activeIdentity?.colorIndex ?? 0}
                  size={72}
                  photoDataUrl={activePhoto}
                  ringHex={activeIdentity?.strongHex}
                />
                <p className="text-sm text-ink-2">
                  {activePhoto
                    ? 'Đang dùng ảnh chụp — ảnh tròn này sẽ hiện ở các màn của game thay cho ký tự viết tắt.'
                    : 'Chưa có ảnh — đang hiện ký tự viết tắt như thường. Chụp hoặc chọn một ảnh để thay.'}
                </p>
              </div>

              {cameraOn ? (
                <div className="mt-3">
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
                      className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg bg-brand px-4 py-2.5 text-base font-bold text-ink-on-seed"
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
              ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void startCamera()}
                    className="inline-flex min-h-11 items-center rounded-lg bg-brand px-4 py-2.5 text-base font-bold text-ink-on-seed"
                  >
                    Chụp ảnh làm avatar
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex min-h-11 items-center rounded-lg border border-line-strong bg-card px-4 py-2.5 text-base font-semibold text-ink"
                  >
                    Chọn ảnh có sẵn
                  </button>
                  {activePhoto ? (
                    <button
                      type="button"
                      onClick={() => {
                        onPhotosChanged(removeAvatarPhoto(active.id));
                        setPhotoNote('Đã xoá ảnh đại diện — quay về ký tự viết tắt.');
                      }}
                      className="inline-flex min-h-11 items-center rounded-lg border border-line bg-card px-4 py-2.5 text-base font-semibold text-debt-ink"
                    >
                      Xoá ảnh
                    </button>
                  ) : null}
                </div>
              )}
              {photoNote ? (
                <p role="status" className="mt-2 text-sm text-ink-2">
                  {photoNote}
                </p>
              ) : null}
              <p className="mt-3 text-sm font-semibold text-ink">{AVATAR_PRIVACY_LINE}</p>
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
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => {
              onDraft({ ...draft, characterSetId: set.setId, characterAssignments: assignments });
              onNext();
            }}
            className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-brand px-4 py-2.5 text-base font-bold text-ink-on-seed"
          >
            Tiếp tục
          </button>
          <button
            type="button"
            onClick={skipAutoAssign}
            className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-line-strong bg-card px-4 py-2.5 text-base font-semibold text-ink"
          >
            Để app tự chọn
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
      ) : null}
    </div>
  );
}
