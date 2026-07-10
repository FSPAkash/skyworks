# Findability Sciences — Client Deck Design Language

A portable spec for the presentation-deck aesthetic used in the Skyworks "ODS Assessment / I-CUPP" kickoff deck. Copy this file into any new client-deck project and an agent can rebuild the same look and behavior without seeing the original.

This is a **co-branded slide deck** system, descended from the "industrial-window" data-tool aesthetic but adapted for slides: paper-flat white surfaces, hairline borders, uppercase micro-labels, tabular numbers, one restrained brand accent, and a self-contained single-file HTML deck that scales to fit any screen and prints to PDF. Serious, technical, editorial. No marketing gloss, no big shadows, no decorative gradients other than one brand strip.

The earlier version of this file described a windowed dashboard with an iron-oxide-red accent. **This deck rebrands to the client/partner palette below and replaces the dashboard shell with a slide canvas + an integrated footer nav.** Everything else (hairlines, uppercase labels, mono numbers, density discipline, no left rails) carries over.

---

## 1. Core principles

1. **Paper-flat surfaces.** Pure white slides. Chrome (top bar, footer, table headers, card headers) is barely-off-white `#FAFAFA`. Depth is 1px hairlines, never shadows, except the soft shadow under the ODS hero block and the rounded nav buttons.
2. **Hairlines, not boxes.** Every division is a 1px border in one of three grays. Cards = 1px border + small radius.
3. **Sans for prose, tabular figures for data.** One typeface (Manrope) everywhere; numbers, codes, weeks, and counts use `font-variant-numeric: tabular-nums`.
4. **Uppercase micro-labels.** Eyebrows, card headers, field labels, table headers, footer labels: 9.5–11px, uppercase, `letter-spacing: 0.08–0.16em`, color `--ink-3`. This texture is the strongest identity cue.
5. **Two brand colors, used with discipline.** Navy `--navy` carries chrome, headings, and the primary anchor (the ODS block, the active framework rung). Spark-blue `--accent` is the single sparing accent — eyebrows, active states, arrows, chips, focus. Never a large fill.
6. **Density with breathing room.** Slides are information-dense but each slide centers its content; sizes run 10–24px. This is a working document, not a marketing landing page.
7. **No left-edge color rails on cards or rows (hard rule).** Use a tinted background, a colored header band, a halo, or a single-cell inset accent instead.
8. **Medallion colors are status only.** Bronze / Silver / Gold tints appear only where the deck is literally talking about medallion layers. They are never general decoration.
9. **House writing style.** No em dashes, no en dashes, no emojis. Use a middot `·`, comma, colon, parentheses, or a plain hyphen for ranges (`W4-7`). Checkmarks are drawn in CSS, never glyphs/emoji.

---

## 2. Brand palette and tokens

Drop this `:root` in verbatim.

```css
:root{
  --font:"Manrope",-apple-system,BlinkMacSystemFont,"Segoe UI",Tahoma,Arial,sans-serif;

  /* Skyworks palette (client) */
  --navy:#002554; --navy-2:#001E50; --navy-3:#0A3A6B;     /* chrome, headings, anchor blocks */
  --accent:#2484B4; --accent-ink:#16678F;                 /* spark-blue: single sparing accent */
  --accent-soft:#BFE0EE; --accent-tint:#EAF4F9;           /* chip border / tint wash */
  --fs-green:#84B448;                                     /* Findability Sciences (partner) */

  /* medallion (status-only tints) */
  --bronze:#A9722F; --bronze-tint:#F5EEE2;
  --silver:#6F7B88; --silver-tint:#EEF1F3;
  --gold:#B68A1E;  --gold-tint:#F7EFD6;

  /* neutrals */
  --ink:#111315; --ink-2:#3F3F3F; --ink-3:#757575; --ink-4:#A8A8A8;
  --line:#E5E5E5; --line-2:#EFEFEF; --line-strong:#D0D0D0;
  --bg-chrome:#FAFAFA; --bg-stripe:#FAFAFA; --bg-hover:#F4F4F4;
  --ok:#2f7d4f; --ok-soft:#E7F2EB; --warn:#b07d12; --warn-soft:#FAF1DC; --err:#b23a2e; --err-soft:#F7E7E5;

  /* the ONE allowed brand gradient: navy with a spark-blue tail */
  --strip:linear-gradient(to right,var(--navy) 0,var(--navy) 84%,var(--accent) 84%,var(--accent) 100%);
}
```

**Rebranding rule for a new client:** swap `--navy` (client primary) and `--accent` (client secondary / spark), keep `--fs-green` for the FS partner mark, keep the neutral and medallion ramps. The accent must stay a *single* color used sparingly; if the client has no obvious secondary, derive a lighter tint of the primary.

**Brand strip** (`--strip`): a 3px bar under the top bar only. Navy for ~84% of the width, spark-blue for the last ~16%. This is the only gradient in the system. Never use it as a fill.

---

## 3. Typography

| Use | Size | Weight | Transform | Tracking | Color |
|---|---|---|---|---|---|
| Cover H1 | ~40px | 800 | none | -0.02em | `--navy` |
| Slide title (`h2`) | ~26px | 800 | none | -0.01em | `--navy` |
| Lede | 13–14px | 400 | none | 0 | `--ink-2` |
| Eyebrow | 11px | 700 | UPPER | 0.16em | `--accent-ink` |
| Card / section header | 11px | 600–700 | UPPER | 0.08em | `--ink-2`/`--ink-3` |
| Field / footer label | 9.5–11px | 600–700 | UPPER | 0.1–0.12em | `--ink-3` |
| Table header `th` | 10.5px | 600 | UPPER | 0.08em | `--ink-3` |
| Body / cell | 11.5–13px | 400 | none | 0 | `--ink`/`--ink-2` |
| Stat value | 22px (units 11px) | 700 | none | tabular | `--navy` |
| Tiny caption / note | 10–11.5px | 400 | none | 0 | `--ink-3`/`--ink-4` |

Global base: `font-size:14px; line-height:1.45; letter-spacing:-0.005em;` with `font-feature-settings:"tnum" 1; -webkit-font-smoothing:antialiased`. Manrope loaded from Google Fonts with a system fallback (deck still looks right offline / in sandbox).

**Eyebrow pattern** (uppercase kicker with a short accent bar) appears at the top of every content slide:
```html
<div class="eyebrow"><span class="bar"></span>C · COLLECTION</div>
```
```css
.eyebrow{display:flex;align-items:center;gap:9px;font-size:11px;font-weight:700;
  letter-spacing:.16em;text-transform:uppercase;color:var(--accent-ink)}
.eyebrow .bar{width:26px;height:2px;background:var(--accent)}
```

---

## 4. The slide canvas (shell)

The deck is one self-contained HTML file. Every slide is a fixed **1280 × 720** canvas; a single transform scales the stage to fit any viewport.

- **`#stage`** holds all `.slide` sections plus one shared footer. JS sets `stage.style.transform = scale(min(vw/1280, vh/720))`.
- **`.slide`** — `position:absolute; inset:0;` grid `grid-template-rows:46px 3px 1fr 40px` (top bar, brand strip, body, reserved footer band). Only `.slide.active` is visible (opacity toggle, 0.28s).
- **`.topbar`** (46px, navy) — 3-column grid: left = a small spark diamond glyph + the layer id (e.g. "C · Collection"); center = uppercase slide context; right = `NN / 14` page number.
- **`.brandstrip`** (3px) — the `--strip` gradient.
- **`.body`** — `position:relative; padding:30px 48px 22px; display:flex; flex-direction:column; justify-content:center;` (content vertically centered). Dense slides override to `justify-content:flex-start`.
- **Footer** — a single shared bar (see §6), not per-slide.

Reveal animation: body children carry `.reveal d1`…`.reveal d4`; they fade/slide up with a staggered delay when the slide becomes active.

---

## 5. Logo and brand-mark handling (what was done, and the recipe)

The source logos shipped as PNGs with **solid black backgrounds in RGB (no alpha)**, which cannot sit on a white slide. They were processed once, in Python (PIL/Pillow), and the results were embedded as inline base64 so the deck stays a single portable file.

What was produced from the two source marks:

1. **Black background keyed to transparent.** For each logo, black pixels were made transparent while the colored wordmark was preserved using a `max(r,g,b)` luminance threshold (so the navy "SKYWORKS" letters and the green FS leaf survive, only the near-black field drops out). The result was cropped to its bounding box.
2. **Skyworks — full stacked mark** (spark above the wordmark). Used nowhere directly after the lockup work below, but kept as the base.
3. **Skyworks — wordmark only.** A crop of just the "SKYWORKS" wordmark (the bottom band of the stacked logo). Used for tight inline contexts where a one-line mark must sit on the same baseline as another logo.
4. **Skyworks — horizontal lockup.** The stacked logo was split into the spark and the wordmark, then recomposed side by side (spark left, wordmark right, vertically centered) into a new transparent canvas. This is the cover/closing mark, because a horizontal lockup sits at a matching optical height next to the FS logo.
5. **FS logo** — cropped to bbox; plus a **small FS logo** for the footer "Powered by" lockup.

**Why the lockup cards.** On the cover and closing slide, the two marks are shown each inside its own labeled card ("Prepared for" / "Delivered by"), centered within equal-height cards:
```html
<div class="lockups">
  <div class="lock"><span class="lk">Prepared for</span><div class="lk-img"><img class="lk-sky" src="…"></div></div>
  <div class="lock"><span class="lk">Delivered by</span><div class="lk-img"><img class="lk-fs" src="…"></div></div>
</div>
```
This was the fix for a real problem: the Skyworks mark's wordmark sits low (the spark occupies the top), so centering it next to the FS wordmark made FS look floated high. Giving each mark its own centered card removes any cross-mark baseline comparison, and using the **horizontal** Skyworks lockup inside the card keeps the two marks at a matching height.

**Rules for a new deck**
- Always key out solid backgrounds to transparency before placing a logo on white; never place a black-box logo on a white slide.
- Embed logos as inline base64 so the deck is one portable file (no external image dependencies).
- Pair logos in equal labeled lockup cards rather than inline side by side, unless both are simple one-line wordmarks of similar cap height (in which case an inline `· × ·` lockup with the wordmark-only crop is fine, as used in the closing footer line).
- The FS small mark belongs in the footer "Powered by" lockup on every slide.

---

## 6. The integrated footer nav (replaces the old status bar + floating nav)

A single shared footer bar at the bottom of the stage carries navigation, the slide title, and the FS attribution. There is no floating nav pill and no keyboard-hint text, and no per-slide status bar.

```
[ ‹ ] [ › ]  • • • ●(active) • •          Slide Title          POWERED BY [FS] | NN / 14
```

- **Left:** prev/next buttons (`.navbtn`, 28px, white, hairline border, hover tints `--bg-hover`) + dot rail (`.dots i`, 7px; active dot `--accent`, scaled up).
- **Center:** the current slide's title (`.ftitle`, 11.5px, 700, navy), updated by JS from a `titles[]` array.
- **Right:** uppercase "Powered by" label + small FS logo + a 1px divider + `NN / 14` count.
- Navigation: footer buttons, dot clicks, and keyboard (←/→/space/Home/End, `P` prints). Click-to-advance on the slide body is intentionally **off**.
- Print: the footer is hidden in `@media print`.

Each `.slide` reserves a 40px bottom grid row so body content never sits under the footer; tall slides top-align their body.

---

## 7. Components

### Card
```css
.card{background:#fff;border:1px solid var(--line);border-radius:6px}
.card-head{padding:0 14px;height:34px;display:flex;align-items:center;gap:8px;border-bottom:1px solid var(--line-2);
  background:var(--bg-stripe);font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:var(--ink-2)}
.card-body{padding:12–16px}
```
A small `.dot-r` (7px `--accent`) optionally leads a header to mark an input/active card.

### Stat tile
Big number, tiny uppercase label above, optional small unit. The KPI display on the "at a glance" slide and the timeline checkpoints.
```css
.stat{border:1px solid var(--line);border-radius:6px;padding:10px 12px;background:#fff}
.stat .label{font-size:10.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--ink-3)}
.stat .value{font-size:22px;font-weight:700;color:var(--navy);font-variant-numeric:tabular-nums}
.stat .u{font-size:11px;color:var(--ink-3)}
```
Use a count or a ratio as the hero number, never a dollar figure (see §11). The timeline tiles show cumulative deliverable acceptance (`2 / 9`) rather than payment percentages.

### Chip
```css
.chip{display:inline-flex;align-items:center;height:22px;padding:0 8px;border-radius:11px;font-size:11px;
  background:var(--bg-hover);color:var(--ink-2);border:1px solid var(--line-2)}
.chip.accent{background:var(--accent-tint);color:var(--accent-ink);border-color:transparent}
.chip.nowrap{white-space:nowrap}
```

### Week tag (`.wkn`)
The deck's "when" marker, used for **phase-level week ranges only** (for example `W4-7`). It appears in the deliverables table's Weeks column; the per-slide activities header carries the same range in text (`Activities · weeks 4-7`). Do **not** tag individual activities or pipeline steps with finer weeks: the SOW commits only to phase-level weeks, so granular per-activity tags would over-promise.
```css
.wkn{font-size:10px;font-weight:700;font-variant-numeric:tabular-nums;color:var(--accent-ink);
  background:var(--accent-tint);border-radius:4px;padding:2px 7px;display:inline-block;white-space:nowrap}
```
Ranges use a plain hyphen (`W4-7`), never an en dash.

### Eyebrow, lede, section label
- `.lede` — 13–14px `--ink-2`, max ~70ch.
- `.ul` — a small uppercase section label used above grouped content (`Classification output`, `Deliverables`).

### Buttons (forms)
```css
.btn{height:32px;border-radius:5px;border:1px solid var(--line-strong);background:#fff;color:var(--ink);
  font:600 12px var(--font);padding:0 14px;cursor:pointer}
.btn.primary{background:var(--navy);border-color:var(--navy);color:#fff}
.btn.primary:hover{background:var(--navy-2)}
```
Primary action = navy fill. Secondary = white with hairline border.

### Inputs
36px, hairline border, accent focus ring:
```css
input,select{height:36px;border:1px solid var(--line);border-radius:4px;padding:0 10px;width:100%;background:#fff}
input:focus{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-tint)}
```
Read-only "confirmed" inputs render with a stripe background and tabular figures.

### CSS-drawn check (no emoji)
Outcome lists use a drawn checkmark, never a `✓` glyph:
```css
.havitem{position:relative;padding-left:24px}
.havitem::before{content:"";position:absolute;left:2px;top:3px;width:6px;height:11px;
  border:solid var(--accent);border-width:0 2px 2px 0;transform:rotate(40deg)}
```

---

## 8. Signature deck devices

These are the elements that make this specifically an I-CUPP FS deck. Reuse them for cohesion.

### The I-CUPP stepper
A small top-right progress indicator on each layer slide showing the five letters, the current one filled navy (or spark-blue for the BPC/Processing step), earlier ones muted.
```css
.stepper{position:absolute;top:26px;right:48px;display:inline-flex;align-items:center}
.stepper .st{width:25px;height:25px;border-radius:5px;border:1px solid var(--line);background:#fff;
  color:var(--ink-4);font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center}
.stepper .st.done{background:var(--bg-stripe);color:var(--ink-3)}
.stepper .st.on{background:var(--navy);border-color:var(--navy);color:#fff}
.stepper .st.bpc.on{background:var(--accent);border-color:var(--accent)}
.stepper .ln{width:15px;height:1px;background:var(--line-strong)}
```

### Ghost watermark
A giant, very faint layer letter (I / C / U / P / P) bottom-right of each layer slide for editorial depth.
```css
.ghost{position:absolute;right:6px;bottom:-104px;font-size:440px;font-weight:800;line-height:.8;
  color:var(--accent);opacity:.07;pointer-events:none;user-select:none;z-index:0}
.body>*:not(.ghost):not(.stepper){position:relative;z-index:1}
```
It is a **very light blue** (spark-blue at low opacity), never a heavy or dark watermark.

### Lineage flow
Upstream systems → ODS → downstream consumers, on one centerline. Built as a two-row grid: column headers in the top row (aligned), boxes/arrows/ODS in the content row, all vertically centered so the arrows, the ODS hero block, and the downstream boxes share one line.
- `.flow-core` — the navy ODS hero block, the one element allowed a soft shadow (`box-shadow:0 2px 0 var(--accent)` accent underline).
- `.flow-arr` — a labeled arrow (`feeds` / `serves`) sitting on a 1px connector line drawn with `::before`.

### BPC pipeline
Four uniform step cards (Score → Classify → Simulate → Prioritize) joined by accent arrows. All four read identically — do **not** highlight a single step a different color (it reads as arbitrary). The "this is the BPC engine" signal comes from the eyebrow, the title, and the spark-blue stepper, not from one tinted card.

### Medallion cards
Bronze / Silver / Gold definition cards, each with a tinted header band (`--bronze-tint` etc.) and colored header text, body description below. Medallion color appears here and nowhere else.

### Deliverable card (`.dcard`)
A `Dx` badge + title + one-line description, used in rows of four across full width.

---

## 9. Data tables

```css
table.lots{width:100%;border-collapse:separate;border-spacing:0;background:#fff;
  border:1px solid var(--line);border-radius:6px;overflow:hidden}
.lots thead th{background:var(--bg-stripe);border-bottom:1px solid var(--line);padding:8–10px;
  text-align:left;font-size:10.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--ink-3);font-weight:600}
.lots tbody td{padding:8–10px;border-bottom:1px solid var(--line-2);font-size:12.5–13px;color:var(--ink)}
.lots tbody tr:hover td{background:var(--bg-hover)}
```
The deliverables map uses this with a `Phase` column (mono `Ph 1`) and a `Weeks` column carrying `.wkn` chips, plus `.chip.accent` layer chips. Layer chips that would wrap get `.chip.nowrap` and a slightly wider column.

---

## 10. Motion, print, persistence

- **Motion:** restrained, 80–280ms. Slide cross-fade 0.28s; reveal stagger d1–d4; button press `translateY(1px)`; input focus ring 120ms. No bouncy easing.
- **Print to PDF:** `@page{size:1280px 720px;margin:0}`; slides become `position:relative; page-break-after:always`; the footer is hidden. `P` triggers `window.print()`.
- **Persistence (kickoff data capture):** the infrastructure-input slide saves entries to `localStorage` (works on a static host such as GitHub Pages) with Save / Export JSON / Clear. This is per-browser only; for central capture, wire the form to a backend or form service. Never use `localStorage` inside a claude.ai artifact preview — only in the deployed/exported file.

---

## 11. Content conventions for FS client decks

- **No commercial figures on a kickoff deck.** Strip dollar amounts and fee/milestone payment schedules; if a milestone metric is needed, use a non-monetary one (cumulative deliverables, percent complete by deliverable count). Pair the deck with the SOW for anyone who needs commercial or legal terms.
- **No SOW effective date** and **no statement of where the delivery team works from** in the client-facing deck.
- **No "source" citations or section references** in the slide chrome; keep the chrome clean ("Confidential" plus context label only — and in this deck even those moved into the footer attribution).
- **Out-of-scope is always called out explicitly**, grouped, with a clear "excluded" marker (a `×` multiplication sign drawn via CSS, not an emoji).
- **Week ranges are phase-level only.** Show the week range in each slide's activities header (`Activities · weeks 4-7`) and in the deliverables table. Do not assign granular per-activity or per-step week tags; the SOW commits only to phase-level weeks.
- **Framework framing (I-CUPP, BPC) is presentation, not new scope.** Keep it consistent with the SOW's phases and deliverables; mark the Skyworks-owned "Infrastructure" layer as something FS does not provision.

---

## 12. Do / Don't

**Do**
- White slides, hairline borders, uppercase micro-labels, tabular numbers.
- Navy for chrome/anchors; spark-blue accent used sparingly; FS green for the partner mark; medallion tints only for medallion content.
- Equal labeled lockup cards for the two logos; horizontal Skyworks lockup; embed all marks as base64.
- One shared footer with nav + slide title + "Powered by FS" + count.
- Phase-level week ranges in slide headers and the deliverables table; cumulative deliverable counts instead of fees.
- CSS-drawn checks; `·`, commas, colons, parentheses, plain hyphens for ranges.

**Don't**
- ❌ Em dashes, en dashes, or emojis anywhere.
- ❌ Dollar amounts, fee schedules, SOW dates, or team-location statements on the kickoff deck.
- ❌ Left-edge color rails on cards or rows (hard rule) — use tinted bg, a colored header band, a halo, or a single-cell inset accent.
- ❌ Large accent fills or decorative gradients (only the navy→spark brand strip).
- ❌ A black-box logo on a white slide — key out the background first.
- ❌ Highlighting one pipeline step a different color from its peers.
- ❌ A heavy/dark watermark — the ghost letter stays very light spark-blue.
- ❌ Per-activity or per-step week tags — keep weeks at the phase-level range only (headers + deliverables table).
- ❌ Floating nav pills, keyboard-hint captions, or click-the-slide-to-advance — navigation lives in the footer + keyboard.

---

## 13. Quick-start checklist for a new client deck

1. Paste the `:root` (§2); swap `--navy`/`--accent` to the client's two brand colors, keep FS green and the medallion/neutral ramps. Load Manrope.
2. Build the 1280×720 stage with scale-to-fit; each slide = top bar (navy) + 3px brand strip + centered body + reserved 40px footer row.
3. Process logos: key out backgrounds to transparent, crop, build a horizontal client lockup, make a small FS mark, embed all as base64.
4. Cover and closing: two labeled lockup cards ("Prepared for" / "Delivered by").
5. One shared footer: prev/next + dots + slide title + "Powered by FS" + count; keyboard nav; hide in print.
6. Layer slides: eyebrow + title + lede, the I-CUPP stepper top-right, a very-light spark-blue ghost letter, content in cards.
7. Signature devices where relevant: lineage flow (centerline-aligned), BPC pipeline (uniform steps), medallion cards, deliverable cards, the deliverables table with Phase + Weeks columns.
8. Apply content conventions (§11): no money/dates/location, out-of-scope called out, week ranges kept at phase level (headers + deliverables table), framework framing consistent with the SOW.
9. Enforce house style: no em/en dashes, no emojis, CSS-drawn checks.
10. Export a single self-contained HTML file; verify it prints cleanly to 1280×720 PDF pages.
