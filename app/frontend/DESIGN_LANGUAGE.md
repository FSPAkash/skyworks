# Design Language — BPC for Data

The visual system behind the Findability Sciences "BPC for Data" assessment app. Named internally the **DCW / "paper" system**: a white paper surface, one FS-green accent, one hairline, hard corners. Distilled from `src/styles/app.css` and the inline `<style>` blocks in the page/component files.

---

## 1. Principles

1. **Paper, not glass.** Surfaces are flat white with a single hairline border. No cards floating on tinted panels, no nested backgrounds. Depth comes from two named shadows only, used sparingly.
2. **One accent.** FS green is the sole brand color. Everything else is ink (near-black to faint grey). Status colors (ok/warn/err) exist but are muted and rare.
3. **Hard corners.** `border-radius: 0` everywhere. The only rounded things are dots, pills that are explicitly circular, and notification badges.
4. **Hairline discipline.** There is essentially *one* border weight — `1px solid var(--hair)`. Structure reads through alignment and whitespace, not heavy rules.
5. **Uppercase micro-labels.** Meta/labels are small, uppercase, letter-spaced, weight 700-800. Content text is sentence-case and calm.
6. **Tabular numbers.** Any figure uses `font-variant-numeric: tabular-nums` (body sets `"tnum" 1`) so columns of numbers align.
7. **Restraint on motion.** Only the header/footer drift and a few micro-fades. All animation respects `prefers-reduced-motion`.

---

## 2. Color tokens

All colors are CSS custom properties on `:root`. Use the token, never a raw hex.

### Surfaces & ink
| Token | Value | Use |
|---|---|---|
| `--paper` | `#FFFFFF` | card / surface |
| `--page` | `#FFFFFF` | full-page backdrop |
| `--tile` | `#F5F5F3` | tile fill, hover fill, stat background |
| `--tile-2` | `#EEEEEC` | deeper hover |
| `--ink` | `#20241C` | primary text |
| `--ink-2` | `#53564D` | body text |
| `--ink-3` | `#8A8D82` | micro-labels |
| `--ink-4` | `#B4B6AC` | faint text, disabled dots |
| `--hair` | `#E6E4DC` | **the one hairline** |
| `--hair-2` | `#EEEDE7` | fainter hairline |

### Accent (FS green)
| Token | Value | Use |
|---|---|---|
| `--accent` | `#6E9C3A` | green accent (eyebrows, dots) |
| `--accent-ink` | `#4E6E28` | darker green for green text on light |
| `--accent-tint` | `#EDF4E1` | green wash — chips, active nav, emphasized cells, icon pads |
| `--accent-soft` | `#C7E0A6` | soft green (strip tail, active borders) |
| `--fs-green` | `#84B448` | the brand mark green — solid fills, primary buttons |

### Status (muted, rare)
| Token | Value | Soft pair |
|---|---|---|
| `--ok` | `#4E8A3A` | `--ok-soft` `#E7F1DA` |
| `--warn` | `#B07D12` | `--warn-soft` `#F7EFDA` |
| `--err` | `#B23A2E` | `--err-soft` `#F6E7E4` |

### Rule
Text on green fills is `#fff`. Green text on light uses `--accent-ink` (not `--fs-green`, which fails contrast for small text). Chips/pads use `--accent-tint` bg + `--accent-ink` text.

### Back-compat aliases
The CSS carries a block of alias tokens (`--line`, `--green-ink`, `--grid-line`, `--ds-red`, `--ds-blue`, etc.) that map older component names onto the paper palette. **Do not author against these** — they exist so legacy inline styles keep rendering. New work uses the primary tokens above.

---

## 3. The one gradient & two shadows

```
--strip: linear-gradient(90deg, fs-green 0, fs-green 82%, accent-soft 82%);
--halo:  0 18px 40px -18px rgba(110,156,58,.34), 0 3px 10px -5px rgba(110,156,58,.20);   /* green lift */
--soft:  0 1px 2px rgba(32,34,28,.05), 0 14px 30px -18px rgba(32,34,28,.16);              /* neutral lift */
```

- **`--strip`** — the single brand device: a 3px bar under the header (green, with a short soft-green tail at 82%). Also used as the 45deg `.spark` mark.
- **`--halo`** — green-tinted shadow. Marks the *one* elevated anchor on a view (a highlighted card, a gate banner, a modal). Do not scatter it.
- **`--soft`** — neutral shadow for transient hover on buttons.

Elevation is binary: flat (hairline) or lifted (one halo). No z-index shadow ramp.

---

## 4. Typography

- **Family:** `Manrope`, then system fallback stack. One family for everything.
- **Base:** 14px / line-height 1.5 / `letter-spacing: -0.006em` / antialiased.
- **Numbers:** tabular everywhere.

| Role | Spec |
|---|---|
| `h1.page` | 30px / 800 / `letter-spacing:-.025em` |
| `.stat .value` | 27px / 800 / tabular |
| `.eyebrow` | 11px / 700 / `letter-spacing:.2em` / uppercase / green, with a 22×2px `.bar` |
| `.lede` | 14px / `--ink-2` / max-width 70ch |
| `.card-head` | 10px / 700 / uppercase / `.12em` / `--ink-3` |
| micro-labels (`.ul`, `.label`, `.nav-group`) | 9–11px / 700–800 / uppercase / `.12–.16em` / `--ink-3/4` |

**Pattern:** headings and labels are tight and uppercase-loud; body copy is loose and quiet. The eyebrow → h1 → lede stack opens most pages.

---

## 5. Layout & shell

```
grid: 222px sidebar | 1fr main
fixed header (56px) + fixed footer (42px); .app pads top/bottom by those heights
.main: max-width 1180px, padding 30px 44px 40px, own scroll
```

- **Header (`.topbar`)** — fixed, white with a slow drifting ivory/green wash (`ivoryDrift`, 22s), backdrop blur, hairline bottom, and the `--strip` bar pinned 3px under it. Left = brand lockup; center = "BPC for Data" badge + engagement subtitle; right = actions (Run full / notifications / role chip / sign-out).
- **Sidebar (`.sidebar`)** — sticky, white, hairline right. Grouped nav with uppercase `.nav-group` headers.
- **Footer (`.footer`)** — same drift/blur as header, hairline top, "Powered by" + FS logo + "Confidential".

### Spacing
Grid gaps and paddings cluster at **14 / 18 / 22 / 30px**. Cards pad 18px. Stats pad ~15–17px. Keep to this scale.

### Grid helpers
`.grid` + `.g2`…`.g5`. Responsive: `.g5→3col` under 1180px; everything → 1col under 820px.

---

## 6. Components

### Card
```
.card       flat white, 1px hair, radius 0
.card.hi    box-shadow: halo, border transparent   (the elevated one)
.card-head  46px tall, tile bg, hairline bottom, uppercase micro-label; often a .dot-r accent dot
.card-body  padding 18px
```

### Stat
```
.stat        tile bg, no border
.stat.hi     white bg + halo
.label(9.5 upper) / .value(27/800 tabular) / .u(green unit) / .sub(faint)
```

### Chips & pills
- `.chip` — 21px tall, hard corner, uppercase 9.5px. Variants: default (hair border), `.accent` (tint bg + accent-ink), `.solid` (fs-green + white).
- `.wkn` — small tabular badge on tint (week/number tags).
- `.st` status pill — uppercase 9px with a 5px leading dot: `.delivered` (ok), `.in-progress` (accent), `.planned` (grey).
- `.nav-tag` — tiny outlined tag pushed to row end (e.g. `Ready`, `3/7`).

### Buttons
```
.btn          34px, tile bg, hair border, 700/11.5px; hover→tile-2 + soft shadow; active→translateY(1)
.btn.primary  fs-green bg, white; hover→accent-ink + halo
:disabled     opacity .4
```
Toolbar buttons in the header (`.tb-logout`, `.tb-runfull`, `.tb-bell`) share this shape at 11px uppercase, `border-radius:0`.

### Table (`table.lots`)
White, hairline frame. `thead th` on tile, uppercase 10px. `tbody td` 13px `--ink-2`, hairline row separators, `:hover` row → tile, last row no border. `.dn` = emphasized tabular green number.

### Nav link
```
.navlink            9px 11px, 12.5px/600, radius 0
:hover              tile
.active             accent-ink text + accent-tint bg + 700
.nav-hero           14px/800 (Overview)
.ic                 21px square, hair border, tile — turns fs-green + white when active
.dotm               5px dot, ink-4 — fs-green when active
```

### Inputs (from inline modals)
```
height 32–38px, 1px hair, tile or paper bg, 600 weight
:focus  border fs-green + box-shadow 0 0 0 3px accent-tint   (the standard focus ring)
```

### Gate banner (`.gate`)
White card with **halo**, hairline, 42px square tinted icon pad — the single hero callout on a view.

### Check / exclude marks
`.hav` (green CSS checkmark) and `.exc` (red CSS ✕), drawn with borders/gradients — used for included/excluded lists.

---

## 7. Modals & overlays

Built inline (e.g. `.so-overlay`/`.so-modal` in `App.jsx`) but consistent:
- Scrim: `rgba(20,24,18,.34)` + `backdrop-filter: blur(3px)`, centered flex, `z-index:200`.
- Panel: `--paper`, 1px hair, **halo**, ~420px, ~22px padding, hard corners.
- Title 16/800, sub 12.5/`--ink-2`, standard focus-ring inputs, `.btn`/`.btn primary` action row, a quiet uppercase text `.so-cancel` below.
- Rendered via `createPortal` to `document.body`; body scroll locked while open.

**z-index scale:** header/footer/sidebar `40` → notif popup `150–151` → modals `200`.

---

## 8. Motion

- `ivoryDrift` — 22s ease-in-out background-position loop on header & footer.
- Micro-fades: `tbNotifIn` (.14s), `so`/`sb` slide-ins (~.14s).
- Button: `transform .1s`, shadow `.16s`.
- **Always** gate ambient animation behind `@media (prefers-reduced-motion: reduce)`.

Keep motion sub-200ms and functional; the only long loop is the ambient header wash.

---

## 9. Authoring conventions

- **Tokens only.** No raw hex in components; reach for `--ink-*`, `--accent-*`, `--hair`.
- **Radius 0.** Never round a rectangle. Round only true circles (dots, circular badges).
- **One border.** Default to `1px solid var(--hair)`. Reserve halo for one anchor per view.
- **Labels uppercase + tracked; body sentence-case + calm.**
- **Numbers tabular.**
- **Page-local styles** live in an inline `<style>` block scoped by a component prefix (`.so-`, `.sb-`, `.tb-`) — matching the existing pattern — but must still consume the root tokens.
- **Green text** on light is always `--accent-ink`, never `--fs-green`.
- **Do not use a colored left/side border-rail** as a box accent; use a top-border, a dot, or a tint fill instead.
- **Don't author against the back-compat aliases.**

---

## 10. Quick reference

```
Surface   paper #FFF · tile #F5F5F3 · hair #E6E4DC
Ink       ink #20241C · ink-2 #53564D · ink-3 #8A8D82 · ink-4 #B4B6AC
Accent    fs-green #84B448 · accent-ink #4E6E28 · accent-tint #EDF4E1
Font      Manrope · 14/1.5 · tabular nums · labels 700-800 uppercase tracked
Corners   0 (circles excepted)
Border    1px solid hair
Lift      --halo (green, one per view) · --soft (neutral hover)
Brand     3px --strip under header · 45deg .spark mark
Shell     222px sidebar | 1fr main · header 56 · footer 42 · main max 1180
```
