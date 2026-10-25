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

import { useMemo, useState } from 'react';
import { createCommitment } from '../engine';
import type { MatchParams } from '../engine/types';
import { equalSharesFor, formatMoney } from '../adapter';
import type { GameSessionInput } from '../adapter';
import { unlockAudio } from '../audio/sound';
import { QR_SOURCES } from '../copy';
import type { GameDraft } from '../state';
import { buildIdentityMapFromSessionMembers } from '../assets/identity';
import type { AvatarPhotoMap } from '../assets/avatar-store';
import { bankDisplayOf } from './m2-qr-screen';
import { GroupedTechString, InfoBox, PlayerAvatar, ScreenTitle, SplitEvenButton } from './shared';

export interface ConsentReady {
  params: MatchParams;
  c1: string;
  paramsHash: string;
  seedDevice: number;
  chung: string;
}

export function M5ConsentScreen({
  input,
  draft,
  abandonedCount,
  onStart,
  onBack,
  onOpenRules,
  onSplitEven,
  photos,
}: {
  input: GameSessionInput;
  draft: GameDraft;
  /** Số cam kết đã bị bỏ trong phiên — hiển thị tối thiểu tại M5 của ván sau (SPEC §M6). */
  abandonedCount: number;
  onStart: (ready: ConsentReady) => void;
  onBack: () => void;
  onOpenRules: () => void;
  /** Bấm ở M5 = huỷ ý định; entry ghi cam kết bị bỏ nếu C1 đã hiển thị trong lần này. */
  onSplitEven: () => void;
  /** Ảnh avatar trên máy theo member id (FIX-V3 N3) — thẻ quanh tâm hiện ảnh tròn khi người có ảnh. */
  photos?: AvatarPhotoMap;
}) {
  const players = useMemo(
    () =>
      draft.selectedPlayerIds
        .map((id) => input.members.find((m) => m.id === id))
        .filter((m): m is NonNullable<typeof m> => Boolean(m))
        .map((m) => ({ id: m.id, name: m.displayName })),
    [draft, input],
  );
  const game = draft.game ?? 'g2';
  const params: MatchParams = useMemo(
    () => ({ game, players, totalVnd: draft.totalVnd }),
    [game, players, draft.totalVnd],
  );

  // Giai đoạn 1 của cam kết: seed_device sinh bằng crypto.getRandomValues
  // ngay khi màn đồng thuận mở (tham số ván đã khoá ở các bước trước),
  // C1 hiển thị TRƯỚC khi số chung được tiết lộ (SPEC §5.2 a–b).
  const [commit] = useState(() => {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    const seedDevice = buf[0] >>> 0;
    const { c1, paramsHash } = createCommitment(seedDevice, params);
    return { seedDevice, c1, paramsHash };
  });

  const [chung, setChung] = useState('');
  const [twoConfirmed, setTwoConfirmed] = useState(false);

  const shares = useMemo(
    () => equalSharesFor(draft.totalVnd, draft.selectedPlayerIds),
    [draft.totalVnd, draft.selectedPlayerIds],
  );
  const shareValues = draft.selectedPlayerIds.map((id) => shares[id] ?? 0);
  const minShare = shareValues.length ? Math.min(...shareValues) : 0;
  const maxShare = shareValues.length ? Math.max(...shareValues) : 0;
  const total = draft.totalVnd;
  const extra = total - minShare;
  const n = players.length;
  const chungValid = /^\d{6,}$/.test(chung.trim());
  const canStart = chungValid && (n !== 2 || twoConfirmed);

  const qr = draft.qr;
  const sourceLabel = QR_SOURCES.find((s) => s.id === qr.source)?.label;
  const confirmerName = input.members.find((m) => m.id === qr.confirmerId)?.displayName;
  // Danh tính cho thẻ người chơi quanh tâm (FIX-V3 P1.6, pattern 6):
  // identity map DUY NHẤT của game (REBUILD-C2-ID contract) dựng trên
  // roster đầy đủ của phiên + GameBadge dùng chung ở shared.tsx —
  // không tự chế badge/màu ở màn này.
  const identityMap = useMemo(() => buildIdentityMapFromSessionMembers(input.members), [input]);
  const colorIndexOf = (id: string) => identityMap.get(id)?.colorIndex ?? 0;

  return (
    <div>
      {/* Dòng 1 — tiêu đề, không danh hiệu, không hình vinh danh. */}
      <ScreenTitle>Chơi để chọn người đãi?</ScreenTitle>

      {/* FIX-V3 P1.6 (pattern 6 + 7): VẪN ĐÚNG 10 dòng SPEC, chỉ đổi
          TRÌNH BÀY — dòng 3 thành thẻ người chơi quanh một tâm, dòng
          4+5 thành CẶP THỊ GIÁC tiền cạnh nhau, dòng 6 nêu «gánh thêm
          tối đa» nổi bật ngay dưới cặp. Chữ của từng dòng giữ nguyên
          văn (bảng đối chiếu ở handoff lane D).
          FIX-V4 D2: đổi THỨ TỰ HIỂN THỊ (chữ từng dòng vẫn nguyên
          văn) — cặp tiền dòng 4+5 và dòng 6 lên TRƯỚC vòng đội hình
          dòng 3, để ở khung nhìn đầu 390×844 thấy đủ: tiêu đề + cặp
          thẻ tiền + phần đầu vòng đội hình (panel v4 frame 05: phải
          cuộn mới thấy tiền). Thứ tự hiển thị mới: 2, 4, 5, 6, 3,
          7, 8, 9, 10. */}
      <ol className="mt-4 grid list-none grid-cols-1 gap-3 text-base leading-relaxed text-ink sm:grid-cols-2">
        {/* Dòng 2 — cơ chế theo game. */}
        <li className="sm:col-span-2">
          {game === 'g2'
            ? 'Game: Mâm cơm xoay — kết quả do may rủi thuần túy, không ai điều khiển được. Mâm quay 1 vòng, đũa dừng ở ai thì người đó đãi.'
            : 'Game: Đấu trường tự động — kết quả do may rủi thuần túy, các nhân vật tự đánh nhau, không ai điều khiển được. Người đứng vững cuối cùng là người đãi.'}
        </li>
        {/* Dòng 4 — tổng tiền: nửa trái của CẶP THỊ GIÁC tiền, số là
            chữ lớn nhất khối. */}
        <li className="rounded-lg border border-line-strong bg-card px-4 py-3">
          Tổng hoá đơn hôm nay:{' '}
          <span className="font-display block text-[32px] leading-tight font-extrabold text-ink">
            {formatMoney(total)}
          </span>
        </li>
        {/* Dòng 5 — đối chiếu chia đều: nửa phải của cặp. [S] từ phép chia đều hiện hữu qua adapter. */}
        <li className="rounded-lg border border-line-strong bg-card px-4 py-3">
          Nếu chia đều như thường: mỗi người{' '}
          <span className="font-display block text-[32px] leading-tight font-extrabold text-ink">
            {minShare === maxShare
              ? formatMoney(minShare)
              : `${formatMoney(minShare)} – ${formatMoney(maxShare)} (lệch tối đa 1 ₫ do làm tròn)`}
          </span>
        </li>
        {/* Dòng 6 — hệ quả, chữ không nhỏ hơn các dòng khác, không gấp.
            «Gánh thêm tối đa» là con số nổi bật của dòng, ngay dưới cặp tiền. */}
        <li className="rounded-lg border border-warning-solid bg-warning-bg px-4 py-3 sm:col-span-2">
          Nếu chơi: một người sẽ trả toàn bộ {formatMoney(total)} — tức{' '}
          <strong className="font-display text-[20px] font-extrabold">
            gánh thêm tối đa {formatMoney(extra)}
          </strong>{' '}
          so với chia đều. Những người còn lại không phải trả.
        </li>
        {n === 2 ? (
          <li className="sm:col-span-2">
            <div className="rounded-lg border border-warning-solid bg-warning-bg px-3 py-2.5">
              <p>Nhóm chỉ có 2 người: một trong hai người sẽ trả toàn bộ hoá đơn này.</p>
              <label className="mt-2 flex cursor-pointer items-start gap-2.5">
                <input
                  type="checkbox"
                  checked={twoConfirmed}
                  onChange={(e) => setTwoConfirmed(e.target.checked)}
                  className="mt-1 h-5 w-5 shrink-0"
                />
                <span>Cả hai đều đã hiểu: một trong hai người sẽ trả toàn bộ hoá đơn này.</span>
              </label>
            </div>
          </li>
        ) : null}
        {/* Dòng 3 — nhóm: thẻ người chơi (GameBadge + tên + màu danh
            tính) bày QUANH MỘT TÂM (vòng tròn mâm/bàn, pattern 6 —
            UNITE VS 1.4). >8 người / màn hẹp: vòng giữ nguyên bố cục
            quanh tâm, thẻ thu nhỏ (badge 30px, chữ 11px) — không rơi
            về danh sách chữ. Câu nguyên văn của dòng nằm ngay dưới
            vòng để chữ vẫn đọc đủ. */}
        <li className="sm:col-span-2">
          <div
            aria-hidden
            className="relative mx-auto aspect-square w-full max-w-[280px] rounded-full border border-line bg-card sm:max-w-[340px]"
          >
            <div className="absolute top-1/2 left-1/2 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-line-strong bg-brand-50 text-center">
              <span className="font-display text-[20px] font-extrabold text-ink">{n} người</span>
              <span className="px-1 text-[11px] leading-tight text-ink-2">cùng chơi quanh bàn</span>
            </div>
            {players.map((p, i) => {
              const angle = (Math.PI * 2 * i) / Math.max(n, 1) - Math.PI / 2;
              const compact = n > 8;
              return (
                <span
                  key={p.id}
                  className="absolute flex w-16 -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5"
                  style={{
                    left: `${50 + 37 * Math.cos(angle)}%`,
                    top: `${50 + 37 * Math.sin(angle)}%`,
                  }}
                >
                  <PlayerAvatar
                    name={p.name}
                    colorIndex={colorIndexOf(p.id)}
                    size={compact ? 30 : 40}
                    photoDataUrl={photos?.get(p.id)}
                    ringHex={identityMap.get(p.id)?.strongHex}
                  />
                  <span
                    className={`max-w-16 text-center leading-tight font-semibold break-words text-ink ${
                      compact ? 'text-[11px]' : 'text-xs'
                    }`}
                  >
                    {p.name}
                  </span>
                </span>
              );
            })}
          </div>
          <p className="mt-3">
            Nhóm: {n} người — {players.map((p) => p.name).join(', ')}
          </p>
        </li>
        {/* Dòng 7 — điều kiện theo game. */}
        <li className="sm:col-span-2">
          {game === 'g1' ? (
            <>
              Nếu hoà đến cùng, những người đồng hạng sẽ cùng đãi, mỗi người trả một phần bằng nhau
              của hoá đơn (xem{' '}
              <button
                type="button"
                onClick={onOpenRules}
                className="font-semibold text-brand-deep underline"
              >
                luật hoà
              </button>
              ). Ván chính tối đa 40 giây.
            </>
          ) : (
            'Mâm chỉ dừng ở đúng một người — G2 không có kết quả hoà. Chỉ quay 1 vòng.'
          )}
        </li>
        {/* Dòng 8 — mô hình tin cậy. */}
        <li className="sm:col-span-2">
          Ván chạy trên máy của một thành viên trong nhóm. Cả nhóm cùng xem từ lúc bấm bắt đầu tới
          khi có kết quả. Nếu máy bị đóng giữa ván, app khôi phục đúng ván này, không quay ván khác
          thay thế.
        </li>
        {/* Dòng 9 — mã ván. */}
        <li className="sm:col-span-2">
          Mã ván sẽ hiện ngay khi bấm Bắt đầu, trước khi game chạy — dùng để nhận diện và xem lại
          đúng ván này.
        </li>
        {/* Dòng 10 — nhắc đồng thuận. */}
        <li className="sm:col-span-2">
          Chỉ bấm Bắt đầu khi từng người trong nhóm đã thấy màn hình này và đồng ý.
        </li>
      </ol>

      {/* Thông tin QR đã xác nhận lặp lại nguyên vẹn (R2-3 Bước 2). */}
      <div className="mt-4">
        <InfoBox>
          {qr.parseFailed || !qr.parsed ? (
            <p>
              QR của quán chưa giải mã được ở bước đối chiếu — màn kết quả sẽ hướng dẫn người đãi
              quét QR gốc tại quầy hoặc trên hoá đơn.
            </p>
          ) : (
            <>
              <p className="font-semibold">QR đã đối chiếu ở bước trước</p>
              {qr.parsed.accountName ? (
                <p className="mt-1">
                  Tên chủ tài khoản: <strong>{qr.parsed.accountName}</strong>
                </p>
              ) : (
                <p className="mt-1">QR không ghi tên chủ tài khoản.</p>
              )}
              <p>Ngân hàng: {bankDisplayOf(qr.parsed)}</p>
              <p>
                Số tài khoản: <span className="font-figure">{qr.parsed.maskedAccount}</span>
              </p>
              {confirmerName && sourceLabel ? (
                <p className="mt-1">
                  Đã được {confirmerName} đối chiếu theo nguồn: {sourceLabel}.
                </p>
              ) : null}
            </>
          )}
        </InfoBox>
      </div>

      {draft.replayOf ? (
        <p className="mt-3 text-base font-semibold text-ink">
          Ván mới sẽ thay thế kết quả ván {draft.replayOf.code} (
          {resultPayerNames(draft.replayOf, input)} đãi). Ván cũ vẫn được ghi trong nhật ký phiên.
        </p>
      ) : null}

      {abandonedCount > 0 ? (
        <p className="mt-3 text-sm text-ink-2">
          Trong phiên này đã có {abandonedCount} cam kết bị bỏ (đã hiện mã cam kết rồi không chơi
          tiếp) — con số này được ghi công khai trong nhật ký phiên.
        </p>
      ) : null}

      {/* Số chung — theo đúng thứ tự cam kết hai giai đoạn: C1 hiện trước.
          FIX-V3 P1.6: trình bày thành BƯỚC HÌNH đọc lần đầu hiểu ngay —
          Bước 1 máy hiện mã cam kết C1 (ghi rõ máy làm), Bước 2 một
          thành viên KHÁC nhập số chung (ghi rõ người làm). Nội dung
          các dòng chữ gốc giữ nguyên trong từng bước. */}
      <div className="mt-5 rounded-lg border border-line-strong bg-card px-4 py-4">
        <p className="text-sm font-bold tracking-wide text-brand-deep uppercase">
          Bước 1 · Máy hiện mã cam kết
        </p>
        <p className="mt-1 text-sm text-ink-2">
          Người làm bước này: máy đang mở ván này — cả nhóm chỉ cần nhìn và nhận diện mã.
        </p>
        <p className="mt-2 text-base text-ink">
          Mã cam kết của máy (C1):{' '}
          {/* Nhóm 4 ký tự (PRES vòng 2, mục 12): hết cảnh break-all ngắt
              giữa chuỗi («…2466f / 3a38»); chuỗi gốc giữ nguyên khi
              đối chiếu/copy — xem GroupedTechString ở shared.tsx. */}
          <GroupedTechString value={commit.c1} className="font-mono font-bold" />
        </p>
        <p className="mt-1 text-sm text-ink-2">
          Mã này được tạo và hiển thị trước khi số chung được nhập, để cả nhóm nhận diện đúng ván
          này.
        </p>
        <div className="mt-5 border-t border-line pt-4">
          <p className="text-sm font-bold tracking-wide text-brand-deep uppercase">
            Bước 2 · Một thành viên khác nhập số chung
          </p>
          <p className="mt-1 text-sm text-ink-2">
            Người làm bước này: một thành viên khác trong nhóm, tự tay nhập trên máy sau khi đã thấy
            mã cam kết ở bước 1.
          </p>
        </div>
        <label className="mt-3 mb-1.5 block text-base font-semibold text-ink" htmlFor="m5-chung">
          Số chung — một thành viên khác tự tay nhập (ít nhất 6 chữ số)
        </label>
        <input
          id="m5-chung"
          inputMode="numeric"
          // Viền MỘT nét trung tính như ô dán QR ở M1 (PRES vòng 2, mục
          // 11): bỏ focus:border-brand-deep; khi focus chỉ viền đổi
          // sang line-strong #534946 (DESIGN.md), outline tắt bằng
          // style nội tuyến vì luật :focus-visible ở globals.css là
          // CSS không-layer, đè utility outline-none.
          style={{ outline: 'none' }}
          // F6 (audit PWA native-feel): khi focus, cuộn ô số chung về
          // giữa màn hình để bàn phím ảo không che (cùng cơ chế
          // scrollIntoView block:center như ô dán QR ở M1). F9: ô này
          // đã có inputMode="numeric" và font text-base (16px) từ
          // trước — giữ nguyên.
          onFocus={(e) => e.currentTarget.scrollIntoView({ block: 'center' })}
          className="w-full rounded-lg border border-line-strong bg-card px-3 py-2.5 font-figure text-base text-ink placeholder:text-placeholder focus:border-[#534946]"
          placeholder="Ví dụ: 483920"
          value={chung}
          onChange={(e) => setChung(e.target.value.replace(/\D/g, ''))}
        />
        <p className="mt-1.5 text-sm text-ink-2">
          Đừng dùng ngày sinh, số may mắn hay số tròn — hãy chọn một dãy số bất kỳ mà cả nhóm cùng
          thấy lúc nhập.
        </p>
        {chung && !chungValid ? (
          <p className="mt-1 text-sm text-debt-ink">Số chung cần ít nhất 6 chữ số.</p>
        ) : null}
      </div>

      {/* Thanh đáy CỐ ĐỊNH của màn (pattern 7 — Viettel Money 2.6 /
          ZaloPay 2.4): CTA chính luôn trong tầm ngón cái kể cả khi
          nội dung đồng thuận dài; nút phụ đi cùng thanh. */}
      {/* FIX-V4 D2: đệm đáy của thanh sticky tính cả safe-area
          (env(safe-area-inset-bottom)) để nút cuối không sát cạnh
          máy tai thỏ/gesture bar; nội dung phía trên thanh (đặc biệt
          cặp thẻ tiền nay ở đầu màn) luôn cuộn lên khỏi thanh được. */}
      <div className="sticky bottom-0 z-20 mt-5 bg-canvas/95 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
        <button
          type="button"
          disabled={!canStart}
          onClick={() => {
            // Mở khoá audio + phát nhạc nền TRONG handler của nút Bắt đầu (autoplay policy, SPEC §9).
            unlockAudio();
            onStart({
              params,
              c1: commit.c1,
              paramsHash: commit.paramsHash,
              seedDevice: commit.seedDevice,
              chung: chung.trim(),
            });
          }}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-brand px-4 py-2.5 text-base font-bold text-ink-on-seed disabled:cursor-not-allowed disabled:bg-deck-sand disabled:text-ink"
        >
          Cả nhóm đồng ý — Bắt đầu
        </button>
        <button
          type="button"
          onClick={onBack}
          className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-line bg-card px-4 py-2.5 text-base font-semibold text-ink"
        >
          Quay lại
        </button>
        <SplitEvenButton onClick={onSplitEven} />
      </div>
    </div>
  );
}

/** Tên người đãi của một bản ghi cũ — cho dòng bổ sung bắt buộc của luồng chơi lại. */
export function resultPayerNames(
  record: {
    log: {
      result: { kind: string; payerId?: string; payerIds?: string[] };
      params: { players: { id: string; name: string }[] };
    };
  },
  input: GameSessionInput,
): string {
  const nameOf = (id: string) =>
    record.log.params.players.find((p) => p.id === id)?.name ??
    input.members.find((m) => m.id === id)?.displayName ??
    'Người chơi';
  const r = record.log.result;
  if (r.kind === 'single' && r.payerId) return nameOf(r.payerId);
  if (r.kind === 'co-payers' && r.payerIds) return r.payerIds.map(nameOf).join(', ');
  return 'Người chơi';
}
