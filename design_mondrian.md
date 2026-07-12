# Design Mondrian — De Stijl / Architect-Grid Design Language

The "BPC for Data" console design language introduced in commit `da978c4`
(*full design redo*). It replaces the earlier green-tinted "glass" (DCW paper)
system with a flat, geometric, De Stijl / architect's grid-paper aesthetic.

This document is the reference for that language so it can be re-applied or
compared against later systems. It describes **design only** — tokens, surfaces,
borders, shadows, accents. Functionality (RBAC, meters, Genie, keep-alive, the
Login pipeline animation) is orthogonal and lives in the JSX/backend.

---

## 1. Intent

- Look as if **Mondrian drew it on an architect's drafting sheet**: flat white
  cells, crisp charcoal rule lines, right angles, primary De Stijl accents used
  sparingly.
- **No glass.** No `backdrop-filter` blur on surfaces, no glow shadows, no
  gradient drift on the chrome. Surfaces are opaque and flat.
- **Everything sits on the grid.** Uniform hairline/rule borders, real gaps
  between cells (no shared-seam bleed), square corners everywhere
  (`border-radius:0`).
- White boxes must **pop** against a light neutral page, lifted only by crisp,
  low-diffusion drop shadows.

---

## 2. Color tokens

Defined in `app/frontend/src/styles/app.css` `:root`.

### Paper palette
| Token | Value | Role |
|-------|-------|------|
| `--paper` | `#FFFFFF` | Card / surface — pure white so it pops |
| `--page` | `#ECECE7` | Light neutral page backdrop (white boxes stand out) |
| `--tile` | `#F2F2EF` | Tile / hover fill |
| `--tile-2` | `#EEEEEC` | Deeper tile |
| `--ink` | `#20241C` | Primary text |
| `--ink-2` | `#53564D` | Body text |
| `--ink-3` | `#8A8D82` | Micro-labels |
| `--ink-4` | `#B4B6AC` | Faint |
| `--hair` | `#E6E4DC` | The one hairline (light dividers) |
| `--hair-2` | `#EEEDE7` | Fainter hairline |

### FS green — the single brand accent
| Token | Value | Role |
|-------|-------|------|
| `--accent` | `#6E9C3A` | FS green accent |
| `--accent-ink` | `#4E6E28` | Darker green for text on light |
| `--accent-tint` | `#EDF4E1` | Green wash: chips, emphasised cells |
| `--accent-soft` | `#C7E0A6` | Soft green |
| `--fs-green` | `#84B448` | Brand mark green (strips, primary buttons) |

### Status
`--ok #4E8A3A` / `--ok-soft #E7F1DA` · `--warn #B07D12` / `--warn-soft #F7EFDA`
· `--err #B23A2E` / `--err-soft #F6E7E4`

### De Stijl accents — the defining layer
Charcoal grid lines plus primary-color accents, **used sparingly** (mostly as
stage color-coding on the Login pipeline animation and thin top-accents).

| Token | Value | Role |
|-------|-------|------|
| `--dark` | `#1B1D18` | Charcoal "black" for grid lines |
| `--grid-line` | `#2C2E28` | Rule-line color (borders on cards, chrome seams) |
| `--grid-w` | `1.5px` | Line weight — present but not heavy |
| `--grid-cell` | `32px` | Drafting-paper cell size |
| `--grid-faint` | `rgba(27,29,24,.07)` | Fine background grid (available; not used as page bg — the busy grid was removed) |
| `--ds-red` | `#C8322A` | De Stijl red |
| `--ds-blue` | `#2C5AA8` | Infrastructure stage |
| `--ds-teal` | `#2E9A8F` | Collection stage |
| `--ds-yellow` | `#E7B92E` | Unification stage |
| `--ds-lilac` | `#8A6FC4` | Presentation stage |
| (`--fs-green`) | `#84B448` | Processing stage |

ICUP stage color map (Login animation legend / node top-bars):
Infrastructure = blue, Collection = teal, **Processing = FS green** (the only
green node), Unification = yellow, Presentation = lilac.

---

## 3. Shadows — geometric elevation

Crisp, low-diffusion drop shadows. **No glow, no colored halo.** A hard 2–3px
offset "ledge" plus a soft directional drop.

```css
--soft: 0 2px 0 rgba(27,29,24,.05), 0 6px 16px -8px rgba(27,29,24,.22);
--halo: 0 3px 0 rgba(27,29,24,.06), 0 14px 30px -14px rgba(27,29,24,.30);
--lift: 0 10px 24px -12px rgba(27,29,24,.34);   /* hover elevation */
```

- `--soft` — default card/tile elevation.
- `--halo` — emphasised / raised surfaces (despite the name, it is **not** a
  glow; it is a stronger geometric drop).
- `--lift` — hover state (`.card.lift:hover`).

---

## 4. Surfaces & borders

- **Borders are uniform.** Cards, stats, buttons, sub-containers all use
  `var(--grid-w) solid var(--grid-line)` (1.5px charcoal) — never doubled,
  never mismatched thick inner borders.
- **Real gaps.** Grids use `gap:14px`; no shared-seam background-bleed trick.
- **Square everything.** `border-radius:0` throughout.
- **Outlined, not filled.** Accent boxes are outlined "missing boxes," never
  solid black/color fills (the early Mondrian solid blocks were rejected).
- **Flat fills.** `--paper` on cards, `--tile` on sub-fills. No blur, no gradient.

### Chrome (topbar / footer)
- Flat `--paper` background (no ivory drift gradient, no `backdrop-filter`).
- Charcoal seam: `border-bottom:var(--grid-w) solid var(--grid-line)`.
- Subtle directional shadow only: `box-shadow:0 4px 14px -8px rgba(27,29,24,.28)`.
- Topbar carries a 4px `--fs-green` brand strip (`.topbar::after`), z-index 40.
- Layering: topbar/footer z-index **40**; setup blur backdrop **39** (so
  Sign out / header buttons stay clickable through the blur); Genie panel **60**.

### Status dots
Square, not round — `width/height` with no `border-radius` — to match the grid.

---

## 5. Login pipeline animation (DataScene)

Geometric SVG data-pipeline that frames the login card (design-relevant because
it carries the ICUP color-coding).

- `preserveAspectRatio="xMidYMid meet"`, width-only scaling (`height:auto`),
  scene hidden below 1200px.
- Square icon nodes (`S = 132`), 3 + 3 balanced columns mirroring on shared rows.
- Right-angle connectors only, drawn in sequence via `stroke-dashoffset`, routed
  **around** the card, each colored by the ICUP stage it feeds into.
- Generic step titles only (Connect, Catalog, Map, Enrich, Package, Report) —
  no ERP/CRM/CLOUD, no step numbers.

---

## 6. Typography

- Font: **Manrope** (system fallback stack).
- Base 14px, `line-height:1.5`, `letter-spacing:-0.006em`, tabular numerals on.
- Micro-labels: uppercase, wide tracking (`.09em`–`.18em`), weight 700–800.

---

## 7. What Mondrian removed vs. the prior glass system

| Prior "glass" (DCW paper) | Mondrian |
|---------------------------|----------|
| `--page:#FFFFFF` full white | `--page:#ECECE7` light neutral |
| `backdrop-filter:blur(14px) saturate(1.2)` on chrome | flat opaque `--paper` |
| Ivory drift gradient topbar (`ivoryDrift` anim) | flat white + charcoal seam |
| Green glow shadows (`--halo` green rgba) | charcoal geometric drops |
| Green `--strip` gradient brand bar | solid `--fs-green` strip |
| Soft hairline `--hair` borders only | 1.5px charcoal `--grid-line` rules |
| single FS-green accent | FS green + De Stijl primaries (blue/teal/yellow/lilac/red) |

---

## 8. Files

- `app/frontend/src/styles/app.css` — tokens, chrome, cards, stats, buttons,
  tables, nav, gates.
- Inline `<style>` blocks in `pages/Login.jsx`, `pages/Overview.jsx`,
  `pages/LayerPage.jsx`, `pages/Admin.jsx`, `components/ChatBot.jsx` — per-page
  geometric treatments (meter tiles, sub-containers, Genie panel, savebar).

The design language is centered on `app.css`; the inline blocks consume its
tokens.
