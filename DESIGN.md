---
name: Chia Tiền
description: Chia tiền nhóm kiểu Việt Nam — quyết toán một lần, kèm VietQR.
colors:
  primary: "#B45309"
  primary-deep: "#92400E"
  primary-soft: "#FAECD7"
  paper: "#F7F3EC"
  card: "#FFFFFF"
  ink: "#1C1917"
  muted: "#6F675C"
  line: "#E6DDCF"
  credit: "#177245"
  debt: "#B3352C"
typography:
  display:
    fontFamily: "Outfit, Be Vietnam Pro, ui-sans-serif, system-ui, sans-serif"
    fontWeight: 700
  body:
    fontFamily: "Be Vietnam Pro, ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
  label:
    fontFamily: "Be Vietnam Pro, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 600
rounded:
  lg: "8px"
  xl: "12px"
  2xl: "16px"
  full: "9999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.xl}"
    padding: "10px 16px"
  button-primary-hover:
    backgroundColor: "{colors.primary-deep}"
    textColor: "#FFFFFF"
    rounded: "{rounded.xl}"
    padding: "10px 16px"
  button-ghost:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "8px 12px"
  input:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "10px 12px"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.2xl}"
    padding: "16px"
  chip-selected:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.full}"
    padding: "6px 12px"
---

# Design System: Chia Tiền

## Overview

**Creative North Star: "The Trusted Ledger"**

Chia Tiền looks like a well-kept ledger run by a serious Vietnamese digital
bank: warm paper, dark ink, one amber voice, and numbers that never wobble.
The surface is an Operate tool used one-handed at a restaurant table or at
the end of a trip, so precision and restraint outrank expression — the
brand lives in exact details: tabular money figures, a single amber accent
spent only on actions and selection, and solid colors everywhere. Nothing
decorative stands between the user and the answer to "ai trả ai bao
nhiêu".

The system explicitly rejects the generic AI-template look: no gradients
of any kind, no purple-blue, no cards nested inside cards, no gray text on
colored backgrounds, and no rounded-square icon tiles above headings.

**Key Characteristics:**

- Solid colors only; depth comes from tonal layering and two soft shadows.
- One accent (deep amber) reserved for primary actions, selection, focus.
- Money is always set in Outfit with tabular numerals, right-aligned in
  fields, and formatted the Vietnamese way (`150.000 ₫`).
- Every interactive element is at least 44×44px; focus is always visible
  as a deep-amber outline.
- Vietnamese copy throughout, plain and direct, no finance jargon.

## Colors

A warm, paper-and-ink palette with a single amber accent and two semantic
balance colors. Every text/background pair in the UI measures at least
4.5:1 (WCAG AA); the values below are normative and live as CSS custom
properties in `app/globals.css`.

### Primary

- **Deep Amber** (#B45309): the brand voice. Primary buttons, selected
  payer chips, icons in section titles, focus borders, links. White text
  on it measures 5.02:1.
- **Dark Amber** (#92400E): hover/pressed state of the primary, and text
  on the soft tint (selected participant chips, the share-import banner),
  where it measures 6.09:1.
- **Amber Tint** (#FAECD7): quiet fills only — selected participant chips
  and the editor panel wash (at 40% over paper). Text on it is always
  Dark Amber or Ink, never gray.

### Neutral

- **Warm Paper** (#F7F3EC): the app background; a warm cream, never pure
  white or gray.
- **Card White** (#FFFFFF): raised surfaces — cards, inputs, chips at
  rest.
- **Ink** (#1C1917): primary text and the selected split-mode segment.
  Measures 15.8:1 on paper.
- **Warm Muted** (#6F675C): secondary text, always on paper or white
  (5.0–5.6:1). Never placed on a colored fill.
- **Warm Line** (#E6DDCF): hairline borders and dividers; separation is
  carried jointly by this line, the tonal fill change, and the card
  shadow — the line is never the only signal for an interactive control,
  which always has a label and a strong focus state.

### Semantic

- **Ledger Green** (#177245): positive balances — money a member gets
  back. Text use only, on white or paper (5.4–6.0:1).
- **Brick Red** (#B3352C): negative balances, destructive actions, and
  error text. On its own 10% tint (alerts) it measures 5.2:1.

### Named Rules

**The No Gradient Rule.** No gradient — decorative, brand, or text —
appears anywhere. Emphasis comes from weight, size, and solid color.

**The One Amber Rule.** Amber marks action and selection only. A screen
where amber appears as decoration has already failed review.

## Typography

**Display Font:** Outfit (with Be Vietnam Pro fallback) — headings,
section titles, button labels, avatars, and every money figure.
**Body Font:** Be Vietnam Pro — all other text; chosen because its
Vietnamese diacritics are complete and even at small sizes.

**Character:** A neutral grotesque pairing with a bookkeeping feel:
Be Vietnam Pro is plain and legible, Outfit is slightly geometric and
gives the numbers a printed-ledger crispness. Money always uses tabular
numerals (`font-variant-numeric: tabular-nums`) so columns of amounts
align to the đồng.

### Hierarchy

- **Display** (Outfit, 700, 24–30px, tight leading): the session title,
  edited inline in place.
- **Headline** (Outfit, 700, 20px): the product name in the header.
- **Title** (Outfit, 700, 17–18px): section titles ("Thành viên",
  "Khoản chi", "Quyết toán") and session names in the list.
- **Body** (Be Vietnam Pro, 400, 16px): form values, list content,
  descriptions. Inputs are never smaller than 16px (prevents iOS zoom).
- **Label** (Be Vietnam Pro, 600, 14px): form labels and secondary
  metadata; muted labels stay on paper or white only.
- **Caption** (Be Vietnam Pro, 400, 12px): per-person share breakdowns
  and QR captions.

## Layout

A single centered column, max-width 896px (`max-w-4xl`), with 16px side
padding on phones and 24px from `sm` up. The app is mobile-first: every
flow is designed for a 390px-wide phone held in one hand, and wider
screens only add breathing room plus one split — the settlement section
places balances and transfers side by side from `lg` up.

Vertical rhythm is section-based: 32px between sections, 12px between a
section title and its content, 8–12px between list rows. Related controls
sit tight (8px); unrelated groups breathe (24–32px).

## Elevation & Depth

Depth is tonal first: white cards rest on warm paper, transfer rows are
ruled off with hairlines inside their card instead of floating as cards
of their own. Two soft, warm-tinted shadows support the layering — both
carry a downward offset and a large blur; there are no hard offset
shadows, no colored halos, and no glass or blur effects.

### Shadow Vocabulary

- **Card shadow** (`0 1px 2px rgba(28,25,23,.05), 0 8px 24px rgba(28,25,23,.06)`):
  resting cards and list rows.
- **Lift shadow** (`0 2px 4px rgba(28,25,23,.06), 0 16px 40px rgba(28,25,23,.1)`):
  reserved for raised overlays when a surface must float.

### Named Rules

**The Flat Rows Rule.** Inside a card, rows are separated by hairlines or
whitespace — never by another filled, rounded box. Cards never nest.

## Shapes

Soft but not bubbly: 16px radius for cards and panels, 12px for buttons,
inputs, and icon buttons, 8px for the QR toggle, full-round for person
chips and avatars. Borders are 1px Warm Line everywhere; the single
exception is the editor panel, whose border is amber at 40% to mark it as
the one active workspace on the screen.

## Components

### Buttons

- **Primary:** solid Deep Amber, white Outfit 700 label, 12px radius,
  minimum height 44px. Hover deepens to Dark Amber; disabled drops to
  40% opacity with a not-allowed cursor. One primary action per view.
- **Ghost:** white fill, 1px Warm Line border, Ink label; hover warms
  the border to amber and the text to Dark Amber. Used for secondary
  actions ("Thêm người", "Copy bản quyết toán").
- **Icon button:** 44×44px white square, Warm Line border, muted icon;
  hover darkens the icon, and the destructive variant hovers to Brick
  Red border and icon. Always carries an `aria-label`.
- **Focus (all buttons):** a 2px Dark Amber outline at 2px offset on
  `:focus-visible`, in addition to any border change.

### Chips

- **Person chips** are full-round and carry a 22px avatar plus the name.
  As payer (single choice, radio semantics) the selected chip is solid
  Deep Amber with white text. As participant (multi choice,
  `aria-pressed`) the selected chip is Amber Tint with Dark Amber text
  and a check icon. Minimum height 44px.

### Cards / Containers

- **Card:** white, 1px Warm Line border, 16px radius, card shadow,
  16–20px padding. Session rows, member rows, expense rows, and the two
  settlement panels are cards; nothing inside them is another card.
- **Editor panel:** the add/edit form for members and expenses — Amber
  Tint washed at 40% over paper with a 40%-amber border, 16px radius.
  Its tint is the signal "you are editing here".
- **Empty state:** dashed Warm Line border on a 60%-white wash, centered
  brand icon, an Outfit title, and one sentence of guidance.

### Inputs / Fields

- **Style:** white fill, 1px Warm Line border, 12px radius, 10px×12px
  padding, 16px text. Focus shifts the border to Deep Amber (and the
  global focus outline applies for keyboard users).
- **Placeholder:** a dedicated warm taupe (#786D5B, 5.1:1 on white) —
  never a faded gray.
- **Money input:** right-aligned Outfit figures with a muted "đ" suffix;
  digits group by thousands while typing (`150000` → `150.000`).
- **Error:** messages are Brick Red text with `role="alert"`, naming the
  problem and the fix; a form's save button stays disabled while errors
  exist, with the errors listed above it.

### Navigation

There is no tab bar. The header is a simple app bar — the ÷ logo, the
product name as the page's single `h1`, and a one-line promise — set off
by a hairline. Moving between the session list and a session is a text
back-link ("Tất cả cuộc chia") with a left arrow, at least 44px tall.

### Settlement (signature component)

Two readings of the same truth, side by side on desktop: per-member
balances (paid vs. owed, signed amount in Ledger Green or Brick Red) and
the minimized transfer list ("An → Bình · 500.000 ₫"). A transfer whose
recipient has bank details grows a Deep Amber VietQR toggle; opening it
shows the real VietQR image at 220px with the bank, account number, and
account name captioned beneath. The whole settlement copies to the
clipboard as plain text formatted for Zalo/Messenger.

## Do's and Don'ts

### Do:

- **Do** keep every amount in Outfit with tabular numerals and
  Vietnamese grouping — a number that shifts width breaks trust.
- **Do** spend amber only on actions, selection, and focus.
- **Do** keep touch targets at 44px or more, including text-only
  actions like "Chọn tất cả".
- **Do** name errors with the problem and the recovery, in Vietnamese,
  next to the form that produced them.
- **Do** separate rows inside a card with hairlines (the Flat Rows
  Rule).

### Don't:

- **Don't** use any gradient, anywhere, for any reason.
- **Don't** nest a filled, rounded box inside a card.
- **Don't** put gray or muted text on a colored background; on tints,
  text is Ink, Dark Amber, or the semantic color itself.
- **Don't** use emoji or unicode glyphs as icons — icons come from
  Lucide, in one stroke weight.
- **Don't** shrink text below 16px in inputs, or touch targets below
  44px, to make a layout fit.
