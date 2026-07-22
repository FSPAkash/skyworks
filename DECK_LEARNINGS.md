# Deck Building Protocol

**This is the required process for every Skyworks deliverable deck I build — D5 and onward, and any rebuild of D2/D3/D4. It is not optional guidance. Load and follow it before starting or editing any deck.** Every rule traces to a real mistake caught during D3/D4; the point is to not repeat them.

When building a deck, I will: follow every section below, run the pre-ship checklist in full before declaring the deck done, and never skip the render or the programmatic number audit because the deck "looks fine."

---

## 1. Source of truth is one folder, per deliverable

- The **only** data source for a deck is that deliverable's own Excel workbook (e.g. `D4/D4_Dataset_Classification_Report.xlsx`). Nothing from `D2/`, `D3/`, other `D*/` folders, or any external file counts as data.
- Other deliverables **may contain errors that will be corrected later**. Never validate a number by cross-checking another deliverable, and never reason "X is plausible because D2 says Y." That reasoning is invalid.
- The **kickoff deck** (`kickoff/Skyworks_ICUPP_Kickoff_Deck.html`) is allowed for **naming, weeks, phase, and I-CUPP layer only** — never for data.
- You may reference a prior deliverable as **engagement sequence** ("Built on the D3 lineage map", "Next: D5"). You may **not** assert cross-deliverable data equivalence ("the 4,153 views match the objects resolved in D3") — that is unverifiable from the current workbook. Cut it.

## 2. Every number on a slide must trace to the workbook — audit programmatically

- After building, extract **every number in visible slide copy** (strip HTML tags; ignore CSS widths, page numbers, base64) and recompute each from the workbook. Target: 100% traced.
- Do it in code, comparing computed vs. deck value in a table. Do **not** eyeball it. The `610 vs 630` error on D3 slipped through eyeballing and was only caught by a re-audit.
- **Prefer the workbook's own Summary sheet** when it exists. It is the authoritative statement. If your row-level recomputation disagrees with the Summary, the Summary wins and you must understand *why* they differ before quoting either.

## 3. Watch for inflated / non-atomic row counts

- Detail sheets may count **traversals, not objects**. The D3 "Job Step Chains" sheet re-lists a triggered job's steps under every job that calls it — inflating raw row counts **9-13x** vs. the Summary's object counts. "Step 2: Notify failure" appeared 3,778 times; 1,979 distinct step texts became 69,447 rows.
- Symptom to check: does the Summary figure divide cleanly into the detail row count at a suspicious integer-ish ratio? If a raw count is ~10x the Summary, it is almost certainly a traversal count.
- **Never quote a detail-row count as if it were an object count.** The D3 deck's "18,255 times jobs trigger each other" was 12,267 + 5,988 detail rows; the Summary said 1,070 + 476 *steps*. Use the Summary figures for object/step claims; if you must show row counts, label them "records" in the copy itself (not in a footnote) so the distinction is on the slide.
- Before deduplicating away an inflation, know that dedup **after the fact cannot recover** an upstream-computed figure. D3's 1,070/476 could not be reproduced from the sheet by any (job, step) grouping because the Summary was computed pre-expansion.

## 4. Derived numbers are soft — keep them off the cover

- A number you **compute** (union of distinct objects, a percentage, a sum across sheets) is not a workbook figure. It depends on your parsing/dedup choices.
- D3's "7,206 distinct objects" swung to 6,342 (a **12% difference**) depending on whether malformed view names were forced through a strict `DB.schema.Object` pattern. A cover number gets quoted in meetings on its own — it must be something the reader can find by opening the workbook, because it will not carry any explanation.
- **Rule: cover and overview-slide headlines use only figures the Summary sheet states verbatim.** If a derived figure must appear at all, keep it in the deck body and make the copy itself state plainly what it counts. The reproducibility work happens in your own audit, not on the slide.
- **Do not put methodology / source notes on client-facing slides.** These decks are client deliverables; an on-slide "Note: reconciled against the per-object classification sheet" reads as internal QA and does not belong. Verify everything in your audit; keep the slide clean. (D3 and D4 originally shipped with `srcnote` footers; they were removed.)

## 5. String-parsing is a landmine — read typed columns instead

- The D3 7,206 problem was **1,735 of 4,153 view names** not being clean 3-part strings: SAP objects with slashes and colons (`LIB_ECC_RTP.bv./SAPSLL/CLSNR: Trade Classification Number`), and one literally named `(delete) vFiscalQuarter_Current`.
- Wherever the workbook has a **dedicated typed column** (Medallion Layer, Contains PII, Confidence, Database, Object Type), read it. Do not parse the fully-qualified name string to derive what a column already states.
- If you must parse names, first count how many rows deviate from your expected pattern, and decide explicitly how to handle them. Report the deviation, don't silently drop or merge.

## 6. Render every slide — never trust the source read

- CSS and HTML bugs are invisible in source and obvious in a screenshot. Use headless Chrome to render each slide to PNG and **look at it**.
  - Render helper pattern: force the target slide active, disable reveal animations, screenshot at 1280x720. See `scratchpad/shoot*.sh`.
  - `"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu --hide-scrollbars --window-size=1280,720 --screenshot=out.png --virtual-time-budget=3500 slide.html`
- D3 slide 3 shipped with arrow circles sliced into half-moons (`overflow:hidden` clipping elements at `right:-8px`) and this was only caught by rendering.

## 7. Bar charts must be proportional — and hardcoded widths drift

- Every bar width must be proportional to its printed value. D3 shipped `width:1%` hardcoded for several different small values (1, 7, 15) that then rendered identically — a **data-integrity** bug, not cosmetics.
- Compute widths from values: true linear proportion for values >= 3% of max; a compressed floor band (~1.2-3.0%) for the tiny tail so ordering stays visible. Never let a floor reorder bars — verify monotonicity.
- Always print the exact value beside the bar.
- Add a proportionality gate to the audit: pair each `width:N%` with its `barv`/value, check `abs(w - v/max*100) <= ~1` (or floor-band for tiny values), and check zero ordering violations.

## 8. House style (also enforced by memory + CLAUDE.md)

- **No em dashes or en dashes** — not the literal chars (`—` `–`) and not the entities (`&mdash;` `&ndash;`). Recast the sentence: period, colon, comma, or parentheses. A middot (`·` / `&middot;`) is the house separator for short fragments. Grep for both the char and the entity after building.
- **No emoji.**
- **No single-edge colored border accents** on cards/boxes — no `border-top`/`border-left`/etc. rail in an accent color, on *any* edge. To mark importance use a **whole-card halo** (`box-shadow: var(--halo)` + full accent border + optional tint), or a **tinted header block** (an `--accent-tint` / `--*-tint` filled zone holding the label + number, divided from the body by a hairline). See `.risk`/`.fstep` in D3 and `.tier`/`.find .big` in D4. A small colored dot/tag inside is fine.

## 9. Deck format (carry over from D2)

- Self-contained single HTML. 1280x720 stage, CSS-scaled to viewport. Keyboard + dot nav. Print-to-PDF via `@page 1280x720` (press `p`).
- Reuse the shared CSS and the 5 inline base64 logos (Skyworks mark, Skyworks wordmark, two lockup logos, FS footer logo). Extract from a prior deck's `<style>` block and `logos_named.json`.
- Design tokens: navy `#002554`, accent `#2484B4`, FS green `#84B448`, Manrope font.
- Per-slide chrome: navy topbar (logo + section label + "Confidential"/center title + page N/07), 3px brandstrip, footer with nav + "Powered by" FS logo. Cover + closing reuse `.cover`.
- Editorial pattern per content slide: eyebrow, **claim-headline** (not a label — "Gold sits entirely in the warehouse", not "Layer by Database"), a lede sentence saying *why it matters*, evidence (hero stat / bars / find cards / matrix / pyramid), and a `notebar` with 2 secondary insights. No source/methodology note on the slide (see section 4).
- 7 slides is the current default (cover + 5 content + closing).

## 10. Build via a Python generator, keep it in sync

- Generate the HTML from a `build_d*.py` script rather than hand-editing 400KB of HTML. When you hand-edit the built file, mirror the change back into the builder immediately, then rebuild and diff to confirm they match.
- The `%` character in slide copy collides with Python `%`-formatting — escape literal percentages as `%%` in the template, and verify no `%%` leaked into the output after building.
- The builder and render scripts live in the session scratchpad (temporary). The deck HTML is self-contained and permanent. If regenerability matters, move `build_d*.py` into the `D*/` folder and commit it.

## 11. Independent review is worth it

- For D4-scale work, a second (adversarial, skeptical) pass catches real errors. The D3 `610 vs 630` bug was caught by an independent review agent, not by me. Give the reviewer the same source-of-truth constraint (this workbook only) and have them recompute independently.
- When the reviewer disagrees on a number, **do not "resolve" it by recomputing your own number and getting your own answer back** — that is circular. Find the assumption that produces *their* number, or admit you cannot and remove the figure.

---

## Pre-ship checklist (mandatory — run in full every time before declaring a deck done)

- [ ] Every slide number recomputed from *this* deliverable's workbook; 100% traced (in code, not by eye)
- [ ] Cover/overview headlines are Summary-sheet-verbatim, not derived
- [ ] No detail-row count quoted as an object count; inflation understood and labelled
- [ ] No cross-deliverable data claims; kickoff used only for naming/weeks/phase/layer
- [ ] Every slide rendered to PNG and visually inspected
- [ ] Bar widths proportional to values; zero ordering violations; exact value printed
- [ ] Zero em/en dashes (chars **and** entities), zero emoji, zero single-edge accent rails
- [ ] Both logo lockups present; no methodology/source notes on any slide (client-facing)
- [ ] Builder in sync with built HTML (rebuild + diff clean)
