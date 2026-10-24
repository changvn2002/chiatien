'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { IconPlus } from './icons';
import { newId } from '@/lib/id';
import { assignIdentityColors, normalizeMemberName } from '@/lib/identity';
import { computeBalances, sumBalances, totalSpent } from '@/lib/split';
import { buildSettlementText, simplifyDebts } from '@/lib/settle';
import { buildShareUrl } from '@/lib/share';
import type { Expense, Member, Session } from '@/lib/types';
import { GhostButton, PrimaryButton, StatusLine, copyText, useOnlineStatus } from './ui-bits';
import type { ExpenseSave } from './expense-editor';
import type { MemberDraft } from './member-editor';
import {
  buildSummaryShareText,
  loadSeal,
  persistSeal,
  previewSeal,
  rememberPhieuOff,
  sealSession,
  sessionContentKey,
  titleForcesStatic,
  type SealMark,
} from './phieu';
import { SettlementPanel } from './settlement';
import { SessionAppBar } from './session-app-bar';
import { SessionLedger } from './session-ledger';
import { SessionMemberStrip } from './session-member-strip';
import { SessionSettlementStrip } from './session-settlement-strip';
import { SessionSheets } from './session-sheets';
import { expenseFromDraft, touch, type MemberEditState } from './session-view-helpers';
import {
  useSessionKeyboard,
  useStripExpansion,
  useStripHeightPublisher,
} from './session-view-hooks';

/**
 * Màn làm việc MỘT MÀN HÌNH (REDESIGN-V2, "Settlement in Sight"): bỏ
 * toàn bộ wizard/stepper/?buoc= (link cũ có ?buoc= bị bỏ qua lặng lẽ).
 * Mobile: AppBar 48px + Member Strip 56px + Ledger phẳng cuộn nội bộ +
 * Settlement Strip dính đáy (thu gọn = tổng + lệnh đầu; mở rộng tại chỗ
 * = SettlementPanel toàn văn, tối đa 70dvh, đẩy 1 history state).
 * Desktop ≥1024: lưới 2 cột — trái Command Bar + Member Strip + Ledger,
 * phải SettlementPanel thường trực (biến thể stacked) + StatusLine cuối cột.
 * Từ ARC-11, file này là composition root mỏng: giữ state của phiên,
 * dữ liệu dẫn xuất và handler nghiệp vụ; trình bày + hạ tầng tách ra
 * session-app-bar / session-member-strip / session-ledger /
 * session-settlement-strip / session-sheets / session-view-hooks /
 * session-view-helpers (xem docs/ARCHITECTURE.md).
 */
export function SessionView({
  session,
  startExpanded = false,
  onBack,
  onChange,
  onDelete,
  onNotifyUndo,
  qrRequest = null,
}: {
  session: Session;
  startExpanded?: boolean;
  onBack: () => void;
  onChange: (next: Session) => void;
  onDelete: () => void;
  onNotifyUndo: (label: string, undo: () => void) => void;
  /** Yêu cầu mở QR chuyển tiếp từ lớp 1 người nhận (link -> phiếu -> QR). */
  qrRequest?: { index: number; nonce: number } | null;
}) {
  const expandedRef = useRef(startExpanded);
  const { expanded, expandStrip, collapseStrip } = useStripExpansion(startExpanded, expandedRef);
  const [memberEditing, setMemberEditing] = useState<MemberEditState>(null);
  const [expenseEditing, setExpenseEditing] = useState<Expense | 'new' | null>(null);
  const [expenseAction, setExpenseAction] = useState<Expense | null>(null);
  const [sessionActionOpen, setSessionActionOpen] = useState(false);
  const [memberNotice, setMemberNotice] = useState('');
  const [expandedExpenseId, setExpandedExpenseId] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareState, setShareState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [shareUrl, setShareUrl] = useState('');
  const [settledCopied, setSettledCopied] = useState(false);
  const [settledCopyFailed, setSettledCopyFailed] = useState(false);
  // Lớp phiếu (v1.8.0): opt-in theo phiên, mặc định TẮT — trạng thái BẬT
  // chỉ sống trong bộ nhớ của lần mở này, KHÔNG bao giờ được nhớ (§3);
  // chỉ trạng thái TẮT tường minh mới ghi local (rememberPhieuOff).
  const [slipsOn, setSlipsOn] = useState(false);
  // Dấu bản local theo sessionId (§1.7) — không vào payload.
  const [sealState, setSealState] = useState<SealMark | null>(() => loadSeal(session.id));
  // MINOR-1 (Panel #07): sealState chỉ nạp một lần lúc mở phiên — sau
  // khi SỬA phiên, thẻ hoàn tất còn đang hiện sẽ kẹp dấu CŨ (bản/giờ
  // của nội dung trước) cạnh TỔNG MỚI. Dấu hiển thị phải suy lại từ
  // vân tay nội dung HIỆN TẠI: vân tay khớp -> giữ nguyên dấu; lệch
  // -> bản xem trước (previewSeal: bản N+1 + giờ hiện tại + vân tay
  // mới, KHÔNG ghi local — chỉ hành động chốt/copy thật mới persist,
  // và khi đó candidate tính ra đúng cùng bản N+1 này). Sửa ngược nội
  // dung về như cũ -> vân tay khớp lại -> dấu cũ trở lại đúng nghĩa.
  const displaySeal = useMemo<SealMark | null>(() => {
    if (!sealState) return null;
    if (sealState.contentKey === sessionContentKey(session)) return sealState;
    return previewSeal(session, Date.now());
  }, [sealState, session]);
  // Text mặc định vừa thử copy — nguồn cho ô copy thủ công khi thất bại.
  const [lastSummaryText, setLastSummaryText] = useState('');
  const [confirmDeleteSession, setConfirmDeleteSession] = useState(false);
  const [pendingDeleteMember, setPendingDeleteMember] = useState<Member | null>(null);
  const [pendingDeleteExpense, setPendingDeleteExpense] = useState<Expense | null>(null);
  const [titleEditing, setTitleEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState(session.title);
  const [stripFlash, setStripFlash] = useState(false);
  // Luật nhường kẻ đôi (LK-22): hàng tổng ledger cùng khung → Strip/panel nhường.
  const [ledgerTotalVisible, setLedgerTotalVisible] = useState(false);
  const handleTotalVisibility = useCallback((visible: boolean) => {
    setLedgerTotalVisible(visible);
  }, []);
  const [deckNotice, setDeckNotice] = useState('');
  const [focusedExpenseId, setFocusedExpenseId] = useState<string | null>(null);
  const online = useOnlineStatus();
  const memberStripRef = useRef<HTMLDivElement>(null);
  const dockRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const balances = useMemo(() => computeBalances(session), [session]);
  const transfers = useMemo(() => simplifyDebts(balances), [balances]);
  const total = totalSpent(session);
  const discrepancy = sumBalances(balances);
  const colors = useMemo(() => assignIdentityColors(session.members), [session.members]);
  const nameOf = (id: string) => session.members.find((m) => m.id === id)?.name ?? 'Thành viên';
  const allSettled = session.expenses.length > 0 && transfers.length === 0;
  const firstTransfer = transfers[0];
  // Bộ lọc từ khoá tên phiên (§3): khớp -> tĩnh cứng, công tắc bị khoá tắt.
  const staticForced = titleForcesStatic(session.title);
  const slipsEnabled = slipsOn && !staticForced;

  function toggleSlips() {
    if (staticForced) return;
    setSlipsOn((prev) => {
      const next = !prev;
      if (!next) rememberPhieuOff(session.id);
      return next;
    });
  }

  useStripHeightPublisher(rootRef, dockRef);

  function patch(partial: Partial<Session>) {
    onChange(touch(session, partial));
  }

  /* ---------------- Thành viên ---------------- */
  function openMember(member: Member, focusBank = false) {
    setMemberEditing({ kind: 'edit', member, focusBank });
  }

  function saveMember(draft: MemberDraft) {
    if (memberEditing?.kind === 'new') {
      patch({ members: [...session.members, { id: newId(), ...draft }] });
    } else if (memberEditing?.kind === 'edit') {
      const id = memberEditing.member.id;
      patch({
        members: session.members.map((m) =>
          m.id === id ? { ...m, name: draft.name, bank: draft.bank } : m,
        ),
      });
    }
    setMemberEditing(null);
    setMemberNotice('');
  }

  function saveBulkMembers(names: string[]) {
    const created = names.map((name) => ({ id: newId(), name: normalizeMemberName(name) }));
    patch({ members: [...session.members, ...created] });
    setMemberEditing(null);
    setMemberNotice('');
  }

  function requestDeleteMember(member: Member) {
    const related = session.expenses.filter(
      (e) => e.payerId === member.id || e.participantIds.includes(member.id),
    );
    setMemberEditing(null);
    if (related.length > 0) {
      setMemberNotice(
        `Không xoá được ${member.name} vì đã có khoản chi liên quan: ${related
          .map((e) => `“${e.title}”`)
          .join(', ')}. Hãy sửa/xoá các khoản chi đó trước.`,
      );
      return;
    }
    setPendingDeleteMember(member);
  }

  function confirmDeleteMember() {
    if (!pendingDeleteMember) return;
    const snapshot = session;
    const name = pendingDeleteMember.name;
    patch({ members: session.members.filter((m) => m.id !== pendingDeleteMember.id) });
    setPendingDeleteMember(null);
    onNotifyUndo(`Đã xoá thành viên ${name}`, () => onChange(snapshot));
  }

  /* ---------------- Khoản chi ---------------- */
  function applyExpenseDraft(draft: ExpenseSave) {
    if (draft.id) {
      patch({
        expenses: session.expenses.map((e) =>
          e.id === draft.id ? { ...e, ...draft, id: e.id, createdAt: e.createdAt } : e,
        ),
      });
    } else {
      patch({ expenses: [...session.expenses, expenseFromDraft(draft)] });
    }
  }

  function saveExpense(draft: ExpenseSave) {
    applyExpenseDraft(draft);
    setExpenseEditing(null);
  }

  function confirmDeleteExpense() {
    if (!pendingDeleteExpense) return;
    const snapshot = session;
    const title = pendingDeleteExpense.title;
    patch({ expenses: session.expenses.filter((x) => x.id !== pendingDeleteExpense.id) });
    setPendingDeleteExpense(null);
    onNotifyUndo(`Đã xoá khoản chi "${title}"`, () => onChange(snapshot));
  }

  /* ---------------- Copy / chia sẻ ---------------- */
  /**
   * Copy MẶC ĐỊNH (§4 — cả chế độ phiếu lẫn tĩnh): CHỈ text tóm tắt
   * trung tính + link. Không chuỗi mũi tên, không số của cá nhân nào.
   * Dấu bản chỉ được GHI (persist) khi copy thật sự thành công; bản xem
   * trước (previewSeal) dùng để dựng text mà chưa chốt số bản.
   */
  async function handleCopySettlement() {
    const candidate = previewSeal(session, Date.now());
    const text = buildSummaryShareText(session, transfers, candidate, buildShareUrl(session));
    setLastSummaryText(text);
    const ok = await copyText(text);
    if (ok) {
      persistSeal(session.id, candidate);
      setSealState(candidate);
    }
    setSettledCopied(ok);
    setSettledCopyFailed(!ok);
    if (ok) window.setTimeout(() => setSettledCopied(false), 2500);
  }

  /**
   * Copy CHI TIẾT ĐẦY ĐỦ — hành động riêng TƯỜNG MINH (§4), chỉ tồn tại
   * trong Session Action Sheet («Sao chép chi tiết đầy đủ»). Nội dung là
   * buildSettlementText nguyên vẹn của lib (chuỗi lệnh đầy đủ) — không
   * bao giờ là đầu ra mặc định của bất kỳ nút Copy/Chia sẻ nào.
   */
  async function handleCopyDetailed() {
    const ok = await copyText(buildSettlementText(session, balances, transfers));
    setSettledCopied(ok);
    setSettledCopyFailed(!ok);
    if (ok) window.setTimeout(() => setSettledCopied(false), 2500);
  }

  async function handleCopyShareLink() {
    const url = buildShareUrl(session);
    setShareUrl(url);
    // Đầu ra của luồng chia sẻ cũng là text tóm tắt §4 kèm link — không
    // còn copy link trần như một text quyết toán, và tuyệt đối không
    // kèm chi tiết của ai. Ô copy thủ công khi thất bại vẫn là link.
    const candidate = previewSeal(session, Date.now());
    const text = buildSummaryShareText(session, transfers, candidate, url);
    const ok = await copyText(text);
    if (ok) {
      persistSeal(session.id, candidate);
      setSealState(candidate);
    }
    setShareState(ok ? 'copied' : 'failed');
    if (ok) window.setTimeout(() => setShareState('idle'), 3000);
  }

  function openShare() {
    if (session.expenses.length === 0) {
      setDeckNotice('Có khoản chi đầu tiên rồi mới chia sẻ được');
      return;
    }
    setDeckNotice('');
    setShareState('idle');
    setShareUrl('');
    // Điểm «bấm Chia sẻ» là một điểm chốt (§1.3): đóng dấu bản ngay.
    const seal = sealSession(session, Date.now());
    setSealState(seal);
    setShareOpen(true);
  }

  function focusMemberStrip() {
    memberStripRef.current?.scrollIntoView({ block: 'nearest' });
    memberStripRef.current?.focus({ preventScroll: true });
    setStripFlash(true);
    window.setTimeout(() => setStripFlash(false), 600);
  }

  function commitTitle() {
    const next = titleDraft.trim();
    setTitleEditing(false);
    if (next && next !== session.title) patch({ title: next });
    else setTitleDraft(session.title);
  }

  function addMember() {
    setMemberEditing({ kind: 'new', focusBank: false });
  }

  function addExpense() {
    setExpenseEditing('new');
  }

  function startTitleEdit() {
    setTitleDraft(session.title);
    setTitleEditing(true);
  }

  useSessionKeyboard({
    session,
    focusedExpenseId,
    onBack,
    expandedRef,
    collapseStrip,
    onOpenExpenseAction: (expense) => setExpenseAction(expense),
    onNewExpense: addExpense,
    onNewMember: addMember,
    onCopySettlement: handleCopySettlement,
  });

  /* ---------------- Các khối dùng chung ---------------- */
  const panelProps = {
    session,
    balances,
    transfers,
    doubleRuleYielded: ledgerTotalVisible,
    copied: settledCopied,
    copyFailed: settledCopyFailed,
    onCopy: handleCopySettlement,
    onShare: openShare,
    slipsEnabled,
    seal: displaySeal,
    fallbackCopyText: lastSummaryText || undefined,
    qrRequest,
    onEditMember: (m: Member, opts?: { focusBank?: boolean }) =>
      openMember(m, opts?.focusBank ?? false),
  };

  return (
    <div
      ref={rootRef}
      className="relative flex h-[calc(100dvh-104px)] min-w-0 flex-col overflow-x-clip min-[900px]:h-auto min-[900px]:min-h-0"
    >
      {/* R5 (mục 3): KHÔNG còn scrim phủ workspace khi panel mở rộng.
          Lớp sương paper/60 của R2–R4 phủ mờ hàng ledger dưới dải
          thành viên ở mọi màn đã-chốt (panel R4: «lớp sương đông
          cứng», 4/5 ghế) — nay ledger BIẾN MẤT hoàn toàn ở mobile khi
          đã-chốt (xem khối lưới bên dưới), nên không còn nội dung nào
          để phủ sương. R6 (mục 3): fade trong panel (.scroll-fade-y)
          cũng đã XOÁ — dock đặc hoàn toàn, mép vùng cuộn cắt sắc. */}

      <SessionAppBar
        title={session.title}
        editing={titleEditing}
        draft={titleDraft}
        onDraftChange={setTitleDraft}
        onStartEdit={startTitleEdit}
        onCommit={commitTitle}
        onOpenActions={() => setSessionActionOpen(true)}
      />

      {/* R3 (mục 1): khi lớp phiếu BẬT, trạng thái đã-chốt ở ≥1024px
          dùng BỀ RỘNG NỘI DUNG CHÍNH — lưới bỏ cột panel 320/360px,
          cột quyết toán xuống dưới ledger ở bề rộng đầy đủ (cap 920px
          căn giữa ở aside) để lưới phiếu có tỉ lệ giấy tự nhiên và
          trang cuộn thay cho thanh cuộn nội bộ trong khay phiếu.
          Lớp phiếu TẮT -> lưới desktop cũ nguyên vẹn. */}
      {/* R4 (mục 1 — GỐC RỄ lỗi vỡ dải thành viên): lưới workspace có
          SÀN chiều cao 152px (dải thành viên 104px khi wrap 2 hàng +
          48px ledger ló) và KHÔNG bao giờ bị dải quyết toán ép về 0 —
          xem session-settlement-strip: section chuyển sang co được
          (shrink + min-h-0), panel cuộn nội bộ thay vì section phình
          quá chiều cao gốc rồi sơn đè cột trái. */}
      {/* R5 (mục 3): ở trạng thái ĐÃ-CHỐT (panel mobile mở rộng),
          lưới workspace trên mobile CO LẠI vừa dải thành viên
          (bỏ sàn 152px + flex-1 ở <900px) — panel bắt đầu NGAY dưới
          dải thành viên, ledger đã ẩn hoàn toàn (xem bọc ledger ở
          dưới). Desktop ≥900px giữ nguyên hình học cũ. */}
      <div
        className={
          (slipsEnabled
            ? 'grid min-h-[152px] min-w-0 flex-1 items-start min-[900px]:grid-cols-[minmax(0,1fr)_288px] min-[900px]:gap-8 min-[1024px]:grid-cols-[minmax(0,1fr)]'
            : 'grid min-h-[152px] min-w-0 flex-1 items-start min-[900px]:grid-cols-[minmax(0,1fr)_288px] min-[900px]:gap-8 lg:grid-cols-[minmax(0,640px)_320px] xl:grid-cols-[minmax(0,720px)_360px] xl:gap-12') +
          (expanded ? ' max-[899px]:min-h-0 max-[899px]:flex-none' : '')
        }
      >
        <div className="flex min-h-0 min-w-0 flex-col self-stretch lg:self-auto">
          {/* Command Bar desktop */}
          <div className="hidden h-[52px] shrink-0 items-center gap-2 min-[900px]:flex">
            <PrimaryButton
              disabledReason={
                session.members.length === 0 ? 'Thêm ít nhất 1 người để ghi khoản chi' : undefined
              }
              onClick={addExpense}
            >
              <IconPlus size={16} aria-hidden /> Thêm khoản
            </PrimaryButton>
            <GhostButton onClick={addMember}>
              <IconPlus size={16} aria-hidden /> Thêm người
            </GhostButton>
            <span className="ml-auto flex items-center gap-4 text-xs text-ink-2">
              <span className="flex items-center gap-1.5">
                <kbd className="rounded-md border border-line-strong bg-paper px-1.5 py-0.5 font-mono text-[12px] text-ink">
                  N
                </kbd>{' '}
                thêm khoản
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="rounded-md border border-line-strong bg-paper px-1.5 py-0.5 font-mono text-[12px] text-ink">
                  M
                </kbd>{' '}
                thêm người
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="rounded-md border border-line-strong bg-paper px-1.5 py-0.5 font-mono text-[12px] text-ink">
                  ⌘K
                </kbd>{' '}
                hành động
              </span>
            </span>
          </div>
          <SessionMemberStrip
            members={session.members}
            colors={colors}
            stripRef={memberStripRef}
            flash={stripFlash}
            onOpenMember={openMember}
            onAddMember={addMember}
          />
          {/* R5 (mục 3): ĐÃ-CHỐT (panel mobile mở rộng) -> ledger
              biến mất HOÀN TOÀN trên mobile (không lát cắt, không
              scrim, không vệt xám mép phải, không gạch lơ lửng của
              hàng tổng): vùng workspace phía trên panel chỉ còn dải
              thành viên. `hidden` ở <900px, `contents` từ 900px —
              desktop giữ ledger nguyên vẹn như cũ (panel desktop là
              cột riêng, không có sương nào ở đó). Chưa chốt
              (expanded=false) -> `contents` ở mọi bề rộng: workspace
              y hệt trước R5. */}
          <div className={expanded ? 'hidden min-[900px]:contents' : 'contents'}>
            <SessionLedger
              session={session}
              nameOf={nameOf}
              total={total}
              memberNotice={memberNotice}
              expandedExpenseId={expandedExpenseId}
              onFocusExpense={setFocusedExpenseId}
              onOpenExpenseAction={setExpenseAction}
              onAddMember={addMember}
              onAddExpense={addExpense}
              onTotalVisibility={handleTotalVisibility}
              allSettled={allSettled}
            />
          </div>
        </div>

        {/* Cột quyết toán desktop — cùng SettlementPanel, biến thể stacked.
            R3 (mục 1): lớp phiếu bật + ≥1024px -> aside rời cột hẹp,
            nằm tĩnh dưới ledger, cap 920px căn giữa (xem lưới ở trên);
            panel chuyển biến thể row cho vừa bề rộng mới. */}
        <aside
          aria-label="Quyết toán"
          className={
            slipsEnabled
              ? 'sticky top-6 hidden border-l border-line-strong pl-6 min-[900px]:block min-[1024px]:static min-[1024px]:mx-auto min-[1024px]:w-full min-[1024px]:max-w-[920px] min-[1024px]:border-t min-[1024px]:border-l-0 min-[1024px]:pt-6 min-[1024px]:pl-0'
              : 'sticky top-6 hidden border-l border-line-strong pl-6 min-[900px]:block'
          }
        >
          <h2 className="mb-3 font-display text-[25px] font-extrabold text-ink">Quyết toán</h2>
          <SettlementPanel {...panelProps} variant={slipsEnabled ? 'row' : 'stacked'} />
          <StatusLine status={online} className="mt-4" />
        </aside>
      </div>

      <p className="mt-2 hidden h-8 shrink-0 items-center text-xs text-ink-2 min-[900px]:flex">
        N thêm khoản · M thêm người · ⌘K hành động của hàng · C copy quyết toán khi dải mở · Esc lùi
        lớp
      </p>

      <SessionSettlementStrip
        session={session}
        expanded={expanded}
        total={total}
        discrepancy={discrepancy}
        allSettled={allSettled}
        firstTransfer={firstTransfer}
        transfers={transfers}
        nameOf={nameOf}
        panelProps={panelProps}
        online={online}
        deckNotice={deckNotice}
        dockRef={dockRef}
        doubleRuleYielded={ledgerTotalVisible}
        onCollapse={() => collapseStrip()}
        onToggle={() => (expanded ? collapseStrip() : expandStrip())}
        onAddExpense={addExpense}
        onOpenShare={openShare}
        onFocusMembers={focusMemberStrip}
      />

      <SessionSheets
        session={session}
        total={total}
        memberEditing={memberEditing}
        expenseEditing={expenseEditing}
        expenseAction={expenseAction}
        sessionActionOpen={sessionActionOpen}
        shareOpen={shareOpen}
        shareState={shareState}
        shareUrl={shareUrl}
        confirmDeleteSession={confirmDeleteSession}
        pendingDeleteMember={pendingDeleteMember}
        pendingDeleteExpense={pendingDeleteExpense}
        saveMember={saveMember}
        saveBulkMembers={saveBulkMembers}
        openMember={openMember}
        requestDeleteMember={requestDeleteMember}
        saveExpense={saveExpense}
        applyExpenseDraft={applyExpenseDraft}
        confirmDeleteMember={confirmDeleteMember}
        confirmDeleteExpense={confirmDeleteExpense}
        handleCopyShareLink={handleCopyShareLink}
        onCloseMemberEditor={() => setMemberEditing(null)}
        onCloseExpenseEditor={() => setExpenseEditing(null)}
        onCloseExpenseAction={() => setExpenseAction(null)}
        onEditExpenseAction={(expense) => {
          setExpenseEditing(expense);
          setExpenseAction(null);
        }}
        onExpandExpenseAction={(id) => {
          setExpandedExpenseId(id);
          setExpenseAction(null);
        }}
        onDeleteExpenseAction={(expense) => {
          setPendingDeleteExpense(expense);
          setExpenseAction(null);
        }}
        onCloseSessionActions={() => setSessionActionOpen(false)}
        onSessionBack={() => {
          setSessionActionOpen(false);
          onBack();
        }}
        onSessionShare={() => {
          setSessionActionOpen(false);
          openShare();
        }}
        onSessionCopy={() => {
          setSessionActionOpen(false);
          void handleCopySettlement();
        }}
        slipsOn={slipsEnabled}
        slipsStaticForced={staticForced}
        onToggleSlips={toggleSlips}
        onSessionCopyDetailed={() => {
          setSessionActionOpen(false);
          void handleCopyDetailed();
        }}
        onSessionRename={() => {
          setSessionActionOpen(false);
          startTitleEdit();
        }}
        onSessionDeleteRequest={() => {
          setSessionActionOpen(false);
          setConfirmDeleteSession(true);
        }}
        onCloseShare={() => setShareOpen(false)}
        onCancelDeleteSession={() => setConfirmDeleteSession(false)}
        onConfirmDeleteSession={() => {
          setConfirmDeleteSession(false);
          onDelete();
        }}
        onCancelDeleteMember={() => setPendingDeleteMember(null)}
        onCancelDeleteExpense={() => setPendingDeleteExpense(null)}
      />
    </div>
  );
}
