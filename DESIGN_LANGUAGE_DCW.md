# Findability Sciences — Client Deck Design Language

A portable spec for the presentation-deck aesthetic used in the DCW "I-CUPP and the AI Factory" proposal deck. Copy this file into any new client-deck project and an agent can rebuild the same look and behavior without seeing the original.

This is a **co-branded slide deck** system: paper-flat white surfaces, hairline borders, uppercase micro-labels, tabular numbers, one restrained brand accent, and a self-contained single-file HTML deck that fills the viewport width (scrolling vertically when needed) and prints to PDF. Serious, technical, editorial. No marketing gloss, no big shadows, no decorative gradients other than one brand strip.

The deck uses a **warm paper palette with an iron-oxide-red accent** (DCW's brand). An earlier sibling of this system used a Skyworks navy/spark-blue palette; the rule of "one client primary, one sparing accent, FS green for the partner mark, everything else neutral" carries over regardless of which client colours are swapped in. Everything else (hairlines, uppercase labels, mono numbers, density discipline, no left rails) is palette-independent.

---

## 1. Core principles

1. **Paper-flat surfaces.** Pure white slides (`--paper`) on a warm page backdrop (`--page`). Tiles/cards are warm off-white (`--tile`, `--tile-2`). Depth is 1px hairlines and the two named shadows (`--halo`, `--soft`), never ad-hoc box-shadows.
2. **Hairlines, not boxes.** Every division is a 1px border in the warm hairline gray (`--hair`). Cards = tinted fill + radius, or hairline + radius.
3. **One typeface, tabular figures for data.** Manrope everywhere (it serves as both `--sans` and `--mono`); numbers, counts, page numbers and stat values use `font-variant-numeric: tabular-nums`.
4. **Uppercase micro-labels.** Eyebrows, card headers, field labels, table headers, footer labels: 9–11.5px, uppercase, `letter-spacing: 0.08–0.16em`, color `--ink-3`/`--ink-4`. This texture is the strongest identity cue.
5. **One brand accent, used with discipline.** Iron-oxide red `--accent` carries eyebrows, active states, arrows, chips, the brand strip, halos, and the single emphasised column/word. Amber `--amber` is a secondary status tint only (e.g. a "Today" tag). Never a large flat accent fill except a modal header band or an emphasised table column tint.
6. **Density with breathing room.** Slides are information-dense but each slide centres or evenly distributes its content; sizes run 9–47px. A working document, not a marketing landing page.
7. **No left-edge color rails on cards or rows (hard rule).** Use a tinted background, a colored header band, a halo, or a single-cell inset accent instead. (Reconfirmed repeatedly on this deck.)
8. **No UI hint text.** Do not write "click to see", "hover to reveal", or any instruction telling the audience to interact. Rely on hover affordances only (cursor, a faint lift, a subtle `+` / `↓` glyph that appears on hover).
9. **House writing style.** No em dashes, no en dashes, no emojis. Use a middot `·`, comma, colon, parentheses, or a plain hyphen for ranges. Checkmarks and arrows are drawn in CSS/SVG, never glyphs/emoji.

---

## 2. Brand palette and tokens

Drop this `:root` in verbatim. Manrope is loaded from Google Fonts with a system fallback (the deck still looks right offline / in sandbox).

```css
:root{
  --sans:"Manrope",-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;
  --mono:"Manrope",-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;

  --paper:#FFFFFF;            /* slide surface */
  --page:#E9E6E1;            /* warm backdrop behind the stage */
  --tile:#F6F4F0;            /* card / tile fill */
  --tile-2:#F1EDE7;          /* hover / second tile */
  --ink:#201D1A;             /* primary text */
  --ink-2:#55514B;           /* body text */
  --ink-3:#8C867D;           /* micro-labels */
  --ink-4:#B6AFA5;           /* faint labels, disabled */
  --accent:#DD4B14;          /* iron-oxide red: the single brand accent */
  --accent-ink:#B23A0E;      /* darker accent for text on light */
  --accent-tint:#FBEDE4;     /* accent wash: chips, emphasised cells, icon pads */
  --amber:#E0A52E;           /* secondary status tint only (e.g. "Today") */
  --hair:#E7E3DC;            /* the one hairline gray */

  /* the ONE allowed brand gradient: red with a short amber tail, brand strip only */
  --strip:linear-gradient(90deg,#DD4B14 0,#DD4B14 82%,#E0A52E 82%);

  /* the two named shadows; never invent ad-hoc ones */
  --halo:0 18px 40px -18px rgba(221,75,20,.34),0 3px 10px -5px rgba(221,75,20,.20);
  --soft:0 1px 2px rgba(32,29,26,.05),0 14px 30px -18px rgba(32,29,26,.18);
}
```

- **`--halo`** is the brand-red glow used to lift the one anchor/hero element on a slide (the "after" panel, the active engine layer, the ROI hero, pop-out cards, the active ladder dot). **`--soft`** is a neutral lift for hover states on tiles.
- **`--strip`** is a 3px bar under the top bar only. Red for ~82% of the width, amber for the last ~18%. The only gradient in the system. Never a fill.

**Rebranding rule for a new client:** swap `--accent`/`--accent-ink`/`--accent-tint` (client brand) and the `--strip` stops; keep the warm neutral ramp (or swap `--page`/`--tile` to a cool ramp if the client is cool-toned), keep FS green for the partner mark if shown. The accent must stay a *single* color used sparingly.

---

## 3. Typography

| Use | Size | Weight | Transform | Tracking | Color |
|---|---|---|---|---|---|
| Cover H1 | 47px | 800 | none | -0.03em | `--ink` (accent on the emphasised word via `h1 em`) |
| Slide title (`h2`) | 26–32px | 800 | none | -0.025em | `--ink`; `h2 em` = `--accent` |
| Lede | 13.5–14px | 400 | none | 0 | `--ink-2`; `b` = `--ink` |
| Eyebrow | 11px | 600 | UPPER | 0.20em | `--accent`, with a 22px accent bar via `::before` |
| Card / section header | 9.5–11px | 600–700 | UPPER | 0.08–0.14em | `--ink-3`/`--accent-ink` |
| Field / footer / mono label | 9–12px | 600–700 | UPPER | 0.06–0.16em | `--ink-3`/`--ink-4` |
| Body / cell | 11–13.5px | 400–600 | none | 0 | `--ink`/`--ink-2` |
| Stat / hero value | 21–47px | 800 | none | -0.02–-0.03em, tabular | `--ink`; unit in `--accent` |
| Tiny caption / note | 9–11px | 400–600 | none/UPPER | 0–0.13em | `--ink-3`/`--ink-4` |

Global base: `font-size:14px; line-height:1.5; letter-spacing:-0.006em;` with `font-feature-settings:"tnum" 1; -webkit-font-smoothing:antialiased`.

**Eyebrow pattern** (uppercase kicker with a short accent bar) appears at the top of every content slide:
```html
<div class="eyebrow reveal d1">The shift · what moves to the centre</div>
```
```css
.eyebrow{font-family:var(--mono);font-size:11px;font-weight:600;letter-spacing:0.2em;
  text-transform:uppercase;color:var(--accent);display:flex;align-items:center;gap:11px}
.eyebrow::before{content:"";width:22px;height:2px;background:var(--accent);display:block}
```
Titles take an emphasised word via `<em>` (rendered `font-style:normal;color:var(--accent)`).

---

## 4. The slide canvas (shell)

The deck is one self-contained HTML file. Every slide is a fixed **1280 × 720** canvas; a single transform scales the stage to the viewport.

- **`#stage`** (`position:absolute; top:0; left:50%; width:1280; height:720; transform-origin:top center`) holds all `.slide` sections, then the modal overlays, all as direct children. **Scaling rule: fill width, keep aspect.** JS sets `stage.style.transform = translate(-50%,0) scale(vw/1280)` and `body.style.height = 720*s`, so a shorter window **scrolls vertically** rather than letterboxing. Print resets it (`@media print{#stage{transform:none} body{height:auto}}`).
- **`.slide`** — `position:absolute; inset:0; background:var(--paper); border-radius:14px;` grid `grid-template-rows:58px 3px 1fr 50px` (top bar, brand strip, body, reserved footer band). Only `.slide.active` is visible (opacity toggle, 0.3s).
- **`.topbar`** (58px, white, hairline bottom) — 3-column grid: left = DCW logo + 1px divider + uppercase context (`.ctx`); center = uppercase slide label (`.tc`); right = `NN / NN` page number (`.tr`).
- **`.brandstrip`** (3px) — the `--strip` gradient.
- **`.body`** — `position:relative; padding:40px 56px 30px; display:flex; flex-direction:column; justify-content:center; overflow:hidden`. Add `.top` to top-align dense slides. Give a slide its own body class (e.g. `.ecobody`, `.body.top`) when it needs bespoke vertical distribution (`justify-content:space-between`).
- **Footer** — a single shared bar appended by JS to each slide (see §6).

Reveal animation: body children carry `.reveal d1`…`.reveal d4`; they fade/translate up with a staggered delay (.05/.14/.24/.34s) when the slide becomes active (`@keyframes rv`).

---

## 5. Logo and brand-mark handling

- DCW and FS marks live in `deck-assets/` as `dcw.png` / `fs.png` (already transparent on white). The DCW mark sits in the top bar of every slide; the small FS mark sits in the footer "Powered by" lockup on every slide.
- **Cover lockup cards.** The cover pairs the two marks each inside its own labeled card ("Prepared for" / "Delivered by"), centred within equal-height cards (`.lockrow > .lock`), so there is no cross-mark baseline comparison.
- Always key out solid backgrounds to transparency before placing a logo on white; never place a black-box logo on a white slide. Keep marks as external files in `deck-assets/` (this deck) or inline base64 (for a single fully-portable file).

---

## 6. The integrated footer nav

A single shared footer bar (`.statusbar`) is appended by JS to the bottom row of each slide. No floating nav pill, no keyboard-hint text.

```
[ ‹ ] [ › ]   • • ●(active) • • •         SLIDE TITLE         POWERED BY [FS] | NN / NN
```

- **Left:** prev/next buttons (`.navbtn`, 26px, `--tile`, rounded, hover `--tile-2`, disabled at the ends) + dot rail (`.dots i`, 7px; active dot `--accent`, widened to a 20px pill).
- **Center:** the current slide's title (`.ftitle`), read from each slide's `data-title`.
- **Right:** uppercase "Powered by" + small FS logo + 1px divider + `NN / NN` count. The count derives from `slides.length` via `pad(idx)/pad(n-1)` — it updates itself when slides are added or removed, but the hardcoded `.tr` page numbers in each slide's top bar must be updated by hand.
- Navigation: footer buttons, dot clicks, keyboard (←/→/space/PageUp/PageDown/Home/End, `P` prints). Click-to-advance on the slide body is intentionally **off**. Any open modal swallows the keys and closes on Esc/Space/Enter; changing slides auto-closes modals.

---

## 7. Components

### Tile / card
Warm-fill rounded card, no border by default; hairline only when it must separate from a same-tone neighbour.
```css
.tile{background:var(--tile);border-radius:11–15px;padding:13–18px}
.tile.lift:hover{background:var(--paper);box-shadow:var(--soft);transform:translateY(-2px)}
```
The one anchor/hero element per slide is promoted to `background:var(--paper);box-shadow:var(--halo)`.

### Chip
```css
.chip{display:inline-flex;align-items:center;height:21px;padding:0 9px;border-radius:11px;
  font-family:var(--mono);font-size:9px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;
  background:var(--paper);color:var(--ink-2);border:1px solid var(--hair)}
.chip.accent{background:var(--accent-tint);color:var(--accent-ink);border-color:transparent}
```

### Stat / hero value
Big tabular number, tiny uppercase mono label above, small accent unit. Used for the ROI hero (`₹ 55.8 Cr`) and metric cards. Hero number `--ink`, unit `--accent`. Never a bare dollar; this deck uses `₹ Crore` for money (Indian convention) when commercial figures are explicitly wanted (see §11).

### Pills / step nav (click-driven slides)
Small mono uppercase buttons for stepping an interactive visual (the era pills on slide 2, the stage pills). Active = `background:var(--accent-tint);color:var(--accent-ink);border-color:transparent`.

### Range slider (calculator inputs)
```css
input[type=range]{-webkit-appearance:none;height:4px;border-radius:3px;background:var(--hair)}
input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:15px;height:15px;border-radius:50%;
  background:var(--accent);box-shadow:var(--halo);cursor:pointer}
```
Live value shown beside the label in mono `--accent-ink`, tabular.

### CSS-drawn check (no emoji)
```css
.havitem{position:relative;padding-left:21px;font-size:11–12px;font-weight:600;color:var(--ink-2)}
.havitem::before{content:"";position:absolute;left:2px;top:2px;width:5px;height:9px;
  border:solid var(--accent);border-width:0 2px 2px 0;transform:rotate(40deg)}
```

### Arrows / connectors
Chevrons between pipe steps are inline SVG paths (`stroke:currentColor`, accent), never glyphs. Flow connectors between stacked tiers are a single centred SVG up/down chevron + one mono label, never a row of dashes.

---

## 8. Signature deck devices

These make it specifically a DCW I-CUPP / AI-Factory deck. Reuse for cohesion.

### The I-CUPP pipe
Five uniform borderless tiles (`I → C → U → P → P`) on a flow rail, joined by accent chevron gaps (`.pipe > .step` + `.gap`). Each step: big letter (`.L`), mono uppercase name (`.nm`, `--accent-ink`), one-line description (`p`). All five read identically; the "engine" emphasis comes from copy and from haloing the relevant step(s), not from arbitrary recolouring. Steps can be `<button>`s to make them interactive (popups or connector-draw, below).

### Genie pop-out modal (click-to-reveal)
A shared overlay at `#stage` level. Any element with `data-shot="path.png"` (+ `data-label`, optional `data-layers`) genies a real screenshot up out of the clicked box: JS sets `--gx/--gy` to the trigger centre as `transform-origin`, then a `scale(.12)→scale(1)` keyframe (`cubic-bezier(.22,1,.28,1)`, ~0.42s). Image is `width:auto;height:auto;max-width:100%;max-height:~520px` (never a fixed width). The optional placement card (`.glayers`) is an **in-flow flex sibling** of the modal, only rendered when `data-layers` is present (hidden otherwise). Scrim/Esc/Space/slide-change all dismiss.

### Ecosystem detail pop-out (slide-3 / slide-5 modal)
A second shared overlay (`.escrim` / `.ecard`) reusing the same genie scale animation. Any element with `data-items="Name~desc::Name~desc"` (+ `data-ek` kicker, `data-en` name, optional `data-ico` icon key) opens a paper card: solid **accent header band** (`.ehd`) with an icon pad (or the I-CUPP layer letter as fallback), kicker + title, then one accent-dot row per item. Item text is a flex column — bold name on its own line, description as a caption beneath (never run together inline). Used for the ecosystem tiers and the I/C/U layers.

### Stacked ecosystem tiers (slide 3)
Mirrors an "integrated AI ecosystem" diagram as three stacked tiers — Industry Verticals (top), Core Products (middle), I-CUPP Foundation (bottom) — each row = a left tier label (mono, with a **3px accent left divider**, the one allowed vertical accent rule since it is a label gutter, not a card rail) + a grid of clickable tiles. A single centred up-chevron + mono label bridges tiers to show the bottom-up build ("built into core products", "packaged into verticals"). The body distributes the tiers across the full slide height (`justify-content:space-between`).

### Concentric "shifting core" (slide 2)
An SVG of nested filled bands (a red core disc + thick warm-gray rings) that morph on click between eras (Domain → Tech → Data → AI at the core). Click-driven via pills + arrows (no autoplay). Whatever sits at the core is the red `--accent`; orbiting rings are a warm-gray depth ramp. Labels are white Manrope at the top of each band. A horizontal "connector" label (the era tag) bridges the narrative (left) and the circles (right).

### Reach-line connectors (slide 5)
Click an engine I-CUPP layer (Processing / Presentation) to **draw SVG S-curves** down to the value-ladder rungs it powers, lighting the layer and its rungs. Lines animate in via `stroke-dasharray`/`getTotalLength()`; an overlay SVG spans the region; lines re-route on resize. Engine layers carry a permanent `--halo` and a `↓` affordance; the non-engine layers (I/C/U) instead open the ecosystem detail pop-out; the ladder rungs keep their own genie screenshot modals.

### ROI calculator (slide 7)
Live calculator for a process-manufacturing plant: range-slider inputs (output value, energy spend, downtime cost in `₹ Cr`, reporting hours/week) on a tile, a haloed hero gain (`₹ NN Cr`), four metric cards (yield ₹, energy ₹, uptime ₹, effort hrs), and a footer of `% blended uplift` + payback. Benchmark levers shown as chips. Recomputes on every `input`. Numbers use Indian grouping and tabular figures. Frame estimates as "what our other process-manufacturing clients see", with conservative published benchmarks (yield +2%, energy -6%, downtime -35%, effort -60%).

### Comparison table (slide 8)
Hairline table with a tinted header row; the emphasised column (e.g. "Enterprise AI") gets an `--accent-tint` fill, bold ink, and accent header text. Row labels are mono uppercase. Pair with a haloed callout listing CSS-drawn check items in two columns.

---

## 9. Data tables

```css
.cmp{width:100%;border-collapse:separate;border-spacing:0;background:var(--paper);
  border:1px solid var(--hair);border-radius:13px;overflow:hidden}
.cmp thead th{background:var(--tile);border-bottom:1px solid var(--hair);
  font-family:var(--mono);font-size:10.5px;font-weight:700;letter-spacing:0.1em;
  text-transform:uppercase;color:var(--ink-3);text-align:left;padding:11px 22px}
.cmp tbody td{border-bottom:1px solid var(--hair);font-size:13.5px;color:var(--ink-2);padding:11px 22px}
.cmp tbody tr:last-child td{border-bottom:none}
.cmp td.ent{background:var(--accent-tint);font-weight:700;color:var(--ink)}   /* emphasised column */
```

---

## 10. Motion, print

- **Motion:** restrained, 80–280ms for chrome; signature visuals run longer on purpose (band morph ~900ms, reach-line draw ~550ms, genie ~420ms). Slide cross-fade 0.3s; reveal stagger d1–d4. No bouncy easing except the genie's single ease-out-back.
- **Print to PDF:** `@page{size:1280px 720px;margin:0}`; slides become `position:relative; page-break-after:always`; footer hidden; `P` triggers `window.print()`.
- **Headless rendering note (for agents):** Chromium/Edge `--screenshot` with `--virtual-time-budget` freezes `requestAnimationFrame` and CSS-animation-delayed `.reveal` elements at an arbitrary mid-frame, so screenshots often show animated visuals half-drawn or lower tiers faded. To verify *layout/geometry*, temporarily neutralise the animation (e.g. set `.reveal{opacity:1}`, or zero the morph/draw durations) before screenshotting; trust that the resting state, not the frozen frame, is what ships.

---

## 11. Content conventions for this deck

- **Commercial figures are allowed here, on purpose.** Unlike a kickoff deck, this proposal deck *wants* an ROI story. Use `₹ Crore`, Indian digit grouping, tabular figures, and ground every benchmark in published process-industry ranges, framed as client outcomes ("what our other process-manufacturing clients see"). Keep the levers visible and conservative.
- **The naming arc escalates deliberately.** SIOP is the **Mini AI Factory** (proof on one line) → chlor-alkali is the **first full AI Factory line** → the site is **the one AI Factory** ("the AI Factory for Sahupuram"). Keep this progression consistent across slides.
- **Framework framing (I-CUPP, the AI Factory) is the spine.** Infrastructure / Collection / Unification / Processing / Presentation, with the last two as "the engine". The same five layers map onto any line; that repeatability is the "AI at scale" message.
- **No "source" citations or instructional chrome on slides.** Keep chrome to the context label + page number. No "click to see" hints (§1.8).

---

## 12. Do / Don't

**Do**
- White slides on a warm page, hairline borders, uppercase mono micro-labels, tabular numbers.
- Iron-oxide red `--accent` used sparingly; amber only as a status tint; the two named shadows only.
- One emphasised word/column/anchor per slide, lifted with `--halo`.
- Interactive visuals click-driven with hover affordances; pop-outs reuse the genie scale animation and paper/accent tokens.
- One shared footer with nav + slide title + "Powered by FS" + count; keyboard nav; hidden in print.
- CSS/SVG checks and arrows; `·`, commas, colons, parentheses, plain hyphens for ranges.

**Don't**
- Em dashes, en dashes, or emojis anywhere.
- Left-edge color rails on cards or rows (hard rule). The only vertical accent line allowed is a tier-**label** gutter divider, not a card rail.
- UI hint / "click to see" text — hover affordances only.
- Large flat accent fills or extra gradients (only the red→amber brand strip; modal header bands and one emphasised table column are the allowed accent fills).
- Ad-hoc box-shadows — use `--halo` (brand lift) or `--soft` (neutral hover) only.
- A black-box logo on a white slide — key out the background first.
- Recolouring one pipeline step differently from its peers for decoration; emphasis comes from copy + halo.
- Trusting a headless mid-animation screenshot for layout sign-off (§10).

---

## 13. Quick-start checklist for a new client deck

1. Paste the `:root` (§2). Swap `--accent`/`--accent-ink`/`--accent-tint` and the `--strip` stops to the client brand; keep (or re-tone) the warm neutral ramp. Load Manrope.
2. Build the 1280×720 stage with **fill-width scaling** (`scale(vw/1280)`, `transform-origin:top center`, body scrolls when shorter); each slide = 58px top bar + 3px brand strip + body + 50px reserved footer row, `border-radius:14px`.
3. Put the client mark in the top bar and a small FS mark in the footer "Powered by" lockup; cover uses two labeled lockup cards.
4. One shared footer appended by JS: prev/next + dots + slide title (`data-title`) + "Powered by FS" + `NN / NN` count; keyboard nav; hidden in print. Remember the hardcoded `.tr` page numbers must be updated by hand when slide count changes.
5. Content slides: eyebrow (with accent bar) + title (with one `<em>` accent word) + lede, then content in warm tiles; one anchor element lifted with `--halo`.
6. Reuse the signature devices where relevant (§8): I-CUPP pipe, genie + ecosystem pop-outs, stacked tiers, shifting-core circles, reach-line connectors, ROI calculator, comparison table.
7. Apply house style (§1, §11): no em/en dashes, no emojis, no hint text, CSS/SVG checks and arrows, `₹ Crore` for money, the Mini → full → one AI Factory naming arc.
8. Verify layout with animation neutralised before trusting headless screenshots (§10). Export a single self-contained HTML file; confirm it prints cleanly to 1280×720 PDF pages.
