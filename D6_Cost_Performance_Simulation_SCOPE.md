# D6 — Cost & Performance Simulation Model: Scope

Detailed scope for **Deliverable 6, the Cost and Performance Simulation Model**, drawn from the signed Statement of Work (`Skyworks SOW ODS Assessment FS.pdf`) and the kickoff deck. Where the two sources use different shorthand for the same thing, the SOW governs. This document defines what is promised, what is explicitly excluded, and the boundaries a reviewer should hold the deliverable to.

> Sources of truth: SOW Section II.c ("Cost and Performance Impact Simulation") and Section II.d row 6; SOW Section II.e (Out of Scope); SOW Section IV (Assumptions); kickoff deck "Processing / BPC" slide (Score → Classify → Simulate → Prioritize). No figures or commitments in this document originate anywhere else.

---

## 1. What D6 is

An **interactive model** that quantifies the cost and performance impact of moving ODS analytical workloads into the target Bronze / Silver / Gold medallion layers. It turns the D4 classification and D5 architecture baseline into numbers a decision-maker can act on: for each recommended dataset transition, what it is projected to do to **query latency** and **compute cost**, calibrated to Skyworks' actual ODS environment rather than generic benchmarks.

It is the third stage of the BPC engine pipeline: **Score (D4) → Classify (D4) → Simulate (D6) → Prioritize (D7)**. D6 consumes the classified estate and produces the quantified impact that D7's prioritization ranks on.

**SOW deliverable-table definition (row 6, verbatim):** "Interactive model showing projected query latency and compute cost impact for recommended ODS transitions, calibrated to Skyworks' environment."

---

## 2. In scope — the four committed components

The SOW (Section II.c, "Cost and Performance Impact Simulation") commits to exactly four things. Each is a hard requirement for acceptance.

### 2.1 Current-state ODS compute consumption baselining
- Establish the **current-state** compute consumption of the ODS as the reference point all projections are measured against.
- This baseline is what "impact" is relative to; without it, projected deltas have no meaning.
- Grounded in the actual ODS environment: **~1.7 TB, 22 CPUs, ~250 active SSIS jobs, peak concurrency 1,231 batches/sec** (SOW Section II.a). These are the environment parameters the model calibrates to.

### 2.2 What-if simulation for migrating ODS analytical workloads
- Simulate migrating the ODS's **analytical** workloads to the appropriate medallion layers.
- Note the deliberate narrowing: the ODS serves dual duty (transactional + analytical); D6 simulates moving the **analytical** portion. The transactional layer is not the migration target of the simulation.
- "What-if" = scenario-based: the model answers "if this dataset moves to this layer, what happens," not a single fixed prediction.

### 2.3 Projected query latency and compute cost impact per transition
- For **each recommended ODS dataset transition**, produce a projected:
  - **query latency** impact, and
  - **compute cost** impact.
- "Recommended" ties D6 to D4's classification — the transitions simulated are the ones the classification recommends, not an arbitrary set.
- Per-transition granularity is required: this is not a single estate-wide number but a value attached to each dataset move. (This is also what feeds D7, which ranks each transition by, among other things, estimated savings and latency improvement.)

### 2.4 Interactive model calibrated to Skyworks' environment
- The deliverable is an **interactive model**, not a static report. Skyworks must be able to run scenarios themselves.
- **Calibrated to Skyworks' actual ODS environment and cost structures** — the calibration is a named requirement, not a nice-to-have. Generic cloud pricing alone does not satisfy it.
- Per SOW Assumption 7, it ships as an exportable, interactive model Skyworks can **use independently after the engagement concludes**.

---

## 3. How D6 connects to the other deliverables

| Feeds D6 (inputs) | D6 produces | Consumes D6 (outputs) |
|---|---|---|
| **D4 Classification** — which datasets are recommended to move, and to which layer | Per-transition latency + compute-cost projections, and the interactive scenario model | **D7 Prioritized Transition Backlog** — ranks each transition by value, risk, complexity, **estimated savings, and latency improvement** |
| **D5 Architecture Alignment Baseline** — current-state gap to target medallion | Current-state compute baseline | **D9 Executive Summary** — business-case numbers for leadership |

D6 is the point where the assessment stops describing the estate and starts quantifying the economics of changing it.

---

## 4. Timeline, phase, and payment position

- **Phase 3: Impact Simulation and Backlog** (SOW Section II.f).
- **Weeks 8-10.**
- **I-CUPP layer:** P · Processing (BPC), same as D4/D5/D7.
- Phase 3 key activities (SOW): "ODS cost and performance baselining; what-if simulation model build; transition backlog generation; prioritization by value/risk/complexity."
- **Payment:** D6 is part of the **Final Delivery** milestone — 40% / $110,000, triggered by "Delivery and acceptance of all remaining deliverables (Deliverables 6, 7, 8, and 9)" at end of Week 12. D6 is not separately invoiced; it is bundled with D7-D9 in the final milestone.

---

## 5. Explicitly out of scope

These are stated in SOW Section II.e and Assumption 5. D6 models impact; it does not execute anything.

- **Physical migration of datasets** to Fabric medallion layers. Provider recommends and quantifies; Skyworks or a designated partner executes. D6 simulates the move, it does not perform it.
- **Fabric platform provisioning, licensing, or infrastructure setup** — the model does not stand up the target environment.
- **Modification of SSIS packages or ETL pipelines** — no changes to the actual data movement.
- **BI report development or redesign.**
- **Data quality remediation** — surfaced elsewhere, not remediated, and not a variable the cost model is responsible for fixing.
- **Deep assessment of non-ODS systems** — upstream/downstream systems are lineage context only; their compute is not baselined or simulated.
- **Ongoing monitoring or platform access beyond the engagement** — the model is handed over; Provider does not operate it afterward.

---

## 6. Advisory nature and decision authority

- SOW Assumption 4: Provider's recommendations, **including the simulation's projected impacts, are advisory**. Skyworks retains full decision authority over which transitions to act on and when.
- The kickoff reinforces this: recommendations are assistive, not prescriptive. D6 gives Skyworks the numbers to decide with; it does not decide.
- Language on the model and in any presentation of it should be **projected / estimated**, never guaranteed. This matches the "advisory" framing and the SOW's limitation-of-liability posture.

---

## 7. Risks and dependencies specific to D6

Calling these out because D6, more than the earlier deliverables, depends on inputs that may be constrained.

- **Calibration depends on real cost + usage data.** The model must be calibrated to Skyworks' actual environment and cost structures (Section II.c). That requires Skyworks to provide the compute/cost context (Section II.h: "provide business domain context and data ownership information"; weekly SME sessions). Thin cost data weakens calibration.
- **Query-latency projections lean on the baseline.** The current-state baseline (2.1) is built from query-log analysis and the ODS environment parameters. Gaps in query-log coverage propagate into the latency projections.
- **Analytical-workload identification depends on upstream deliverables.** D6 simulates moving *analytical* workloads; which workloads those are comes from the D3 lineage and D4 classification. Any revision to those (e.g. the D1/D2 production-data refresh already in flight) may shift what D6 simulates.
- **Advisory, environment-availability caveat.** Per SOW Assumption 2, timeline assumes timely system access; Assumption 3 notes lineage coverage may be limited where reference-system API/metadata access is not available. Both flow through to how complete the simulation's input set is.

---

## 8. Acceptance checklist

A reviewer should be able to confirm every one of these before accepting D6. Each maps directly to a SOW commitment.

- [ ] A **current-state ODS compute baseline** is established and documented.
- [ ] The model runs **what-if scenarios** for migrating analytical workloads to medallion layers.
- [ ] Every **recommended transition** carries a projected **query-latency** impact.
- [ ] Every **recommended transition** carries a projected **compute-cost** impact.
- [ ] The model is **interactive** — Skyworks can run scenarios themselves.
- [ ] The model is **calibrated to Skyworks' actual ODS environment and cost structures**, not generic benchmarks.
- [ ] Outputs (per-transition savings + latency improvement) are structured so **D7 can rank on them**.
- [ ] The model is delivered as an **exportable, independently usable** artifact (Assumption 7).
- [ ] All projections are framed as **advisory / estimated** (Assumption 4).

---

## 9. One-line summary for the deck

> **D6 — Cost & Performance Simulation Model:** an interactive, Skyworks-calibrated model projecting the query-latency and compute-cost impact of each recommended medallion transition, so leadership can weigh the economics of every move before making it. Phase 3, weeks 8-10.
