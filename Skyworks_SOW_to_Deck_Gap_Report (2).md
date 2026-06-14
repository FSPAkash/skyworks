# Skyworks ODS Assessment — SOW to Kickoff Deck Gap Report

**Confidential.** Internal QA artifact comparing the executed Statement of Work against the kickoff deck that summarizes it.

**Sources compared**
- Source of truth: `Skyworks_SOW_ODS_Assessment_FS.pdf` (10 pages) and `Skyworks_SOW_Summary.txt`
- Summary under review: `Skyworks_ICUPP_Kickoff_Deck.html` (14 slides)

**Method:** every SOW clause was mapped to where, if anywhere, it appears in the deck, then classified as Covered, Reframed, Partial, Omitted, or Added.

---

## 1. Verdict

The deck faithfully represents the *delivery substance* of the SOW: all nine deliverables, four phases, in-scope activities, every out-of-scope category, the Skyworks responsibilities, the assumptions, and the engagement outcome are present and accurate.

What the deck does **not** carry is the *commercial and legal* half of the SOW (fee, milestone payment schedule, IP, confidentiality, liability, termination, change management). That is expected for a client kickoff, but it means the deck is not a stand-in for the SOW with any commercial or legal audience.

A handful of items were deliberately removed or reframed during the build at the client's direction, and the deck layers on an FS presentation framework (I-CUPP, BPC emphasis, indicative weekly cadence) that is not in the SOW. These are framing, not new commitments.

---

## 2. Coverage matrix

Status legend: **Covered** (faithful), **Reframed** (same substance, different presentation), **Partial** (some detail dropped), **Omitted** (absent), **Added** (in deck, not in SOW).

| SOW element | SOW ref | In deck | Status |
|---|---|---|---|
| Engagement objective and outcome | II(a), Summary 1–2 | Slides 1, 3, 14 | Covered |
| ODS profile: 1.7 TB, 22 CPUs, ~250 SSIS jobs, 1,231 batches/sec peak | II(a) | Slides 2, 3, 5 | Covered |
| Dual-duty ODS pain (performance, governance, cost) | II(a) | Slide 3 | Covered |
| Proprietary BPC accelerator | II(a), V | Slides 4, 8 | Covered (emphasized) |
| ODS is the primary target; lineage systems are context only | II(b) | Slides 5, 7 | Covered |
| Nine named lineage reference systems (SAP, Kinaxis, SKY Apps, PLM, EDI, PROMIS, CRM, Warehouse, Enterprise Analytics) | II(b) | Slides 5, 7 | Covered |
| Discovery and metadata ingestion activities | II(c) | Slide 6 | Covered |
| Lineage mapping activities | II(c) | Slide 7 | Covered |
| Usage-score classification + scoring drivers | II(c) | Slide 8 | Covered |
| Cost and performance impact simulation | II(c) | Slide 8 (Simulate, D6) | Covered |
| Transition backlog generation | II(c) | Slide 8 (Prioritize, D7) | Covered |
| Nine deliverables D1–D9 with descriptions | II(d) | Slides 6–10 | Covered |
| Four phases, weeks 1–12 active + up to 4 weeks acceptance | II(f) | Slide 11 | Covered |
| Milestone acceptance window (10 business days) | III(b) | Slide 11 note | Covered |
| Out of scope — all six categories | II(e), Summary 4 | Slide 12 | Covered |
| Skyworks responsibilities (sponsor/POC, read-only access, weekly SME sessions, domain context, status reviews/sign-off) | II(h) | Slide 13 | Covered |
| Assumptions: read-only, 5-business-day access SLA, lineage API caveat, advisory recommendations, exportable/owned outputs | IV | Slides 5, 8, 9, 13, 14 | Covered |
| Transition to execution outcome | VII (Summary) | Slide 14 | Covered |
| Engagement length 16 weeks | I | Slide 1 ("16 weeks") | Covered |
| SOW effective date (Jan 21, 2026) | I | Removed during build | Omitted (intentional) |
| Project fee $275,000 | III(a) | Not shown | Omitted (intentional) |
| Milestone payment schedule (30% / 30% / 40%) | III(a) | Reframed to cumulative deliverables (2 / 5 / 9 of 9) on slide 11 | Reframed (intentional) |
| Travel expense cap ($10,000, pre-authorized) | III(c) | Not shown | Omitted |
| Provider personnel — 5 roles (1 Solution Architect, 2 Data Engineers, 1 Data Analyst & Systems Engineer, 1 Project Manager) | II(g) | Slide 2 shows count "5"; roles not listed | Partial |
| Personnel location / remote delivery | II(g), IV(6) | Removed during build | Omitted (intentional) |
| Security: unique per-person credentials, no sharing, MFA | II(g) | Not shown | Omitted |
| IP: deliverables owned by Skyworks upon payment | V | Slide 9 ("owned by Skyworks on payment") | Covered |
| IP: BPC and all FS tools/algorithms remain FS property; no license granted | V | Not explicitly stated | Partial |
| Data handling: deletion within 30 days + written certification | V | Not shown | Omitted |
| Confidentiality (2-year survival) | VI | "Confidential" marker only | Omitted (detail) |
| Limitation of liability | VII | Not shown | Omitted (contract term) |
| Change management (formal change-request process) | VIII | Referenced indirectly on slide 12 ("scoped separately via change request") | Partial |
| Termination (convenience / for cause) | IX | Not shown | Omitted (contract term) |

---

## 3. Intentional deviations (client-directed during the build)

These were requested and are not defects; logged so the rationale is on record.

- **All dollar amounts removed** ($275,000 fee, $82,500 / $82,500 / $110,000 milestones, $10,000 travel cap). The payment-milestone percentages (30/30/40) were reframed on the timeline slide as cumulative deliverable acceptance (2 of 9 → 5 of 9 → 9 of 9), because a bare 30/30/40 with no fee context was meaningless.
- **SOW effective date removed** everywhere.
- **All references to where the FS team works from removed** (originally "remote, from India"; now just team size).
- **"source" wording and SOW section citations removed** from slide chrome and body copy.
- **House style:** no em dashes, no en dashes, no emojis anywhere.

---

## 4. Additions in the deck, not in the SOW (framing, not commitments)

- **I-CUPP framework** (Infrastructure, Collection, Unification, Processing, Presentation). A presentation lens over the SOW's phases and deliverables. "Infrastructure" is positioned as the Skyworks-owned input layer that FS does not provision, which is consistent with the SOW's out-of-scope section rather than a new claim.
- **Indicative per-activity week tags.** *(Removed.)* An earlier draft assigned finer-grained weeks to individual activities (for example W4-5). These were dropped so the deck shows only phase-level week ranges, matching the SOW's level of commitment. Week ranges now appear in each slide's activities header and in the deliverables table.
- **Slide 5 interactive input form** (target platform, access model, access grantor/owner, lineage systems available). A kickoff data-capture aid for confirming the Skyworks-owned infrastructure layer; not a SOW deliverable. Entries persist locally in the browser.
- **BPC pipeline visualization** (Score → Classify → Simulate → Prioritize). A diagram of the SOW methodology, not a new scope.

---

## 5. Minor wording differences (no material gap)

| Item | SOW wording | Deck wording | Note |
|---|---|---|---|
| D7 Prioritized Transition Backlog | Ranked by risk, effort, impact, estimated savings, latency improvement | Ranked by value, risk, complexity | Deck is a simplification; broaden if precision matters to the audience |
| D5 Architecture Alignment Baseline | Current-state alignment percentage to target, with gap analysis | Current-state gap analysis | Equivalent; the "percentage" detail is dropped |
| Recommendations | "Assistive, not prescriptive" / "advisory" | "Advisory" | Equivalent |

---

## 6. Recommended actions

1. Whenever the deck travels to a commercial or legal reader, pair it with the SOW. Fee, IP scope, confidentiality, liability, change management, and termination are not in the deck by design.
2. If the client expects team composition, add the four personnel roles to slide 2 (the deck currently shows only the headcount of 5).
3. Optionally align the D7 description with the SOW's full ranking factors (risk, effort, impact, estimated savings, latency improvement).
4. If the kickoff audience includes anyone who will rely on it for IP terms, consider one line noting that BPC remains FS intellectual property while the deliverables are owned by Skyworks on payment (the deck states the second half but not the first).
