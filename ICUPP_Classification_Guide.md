# I-CUPP Intake and Classification Guide

A reusable, client- and use-case-agnostic procedure for sorting any project's deliverables, activities, and scope into the I-CUPP framework. Give this to Claude along with a project, and Claude will interview you about how the work is delivered, then produce a consistent I-CUPP mapping, in any domain. Claude asks before it classifies; the intake interview is in the section below.

I-CUPP has five layers, read in the order work flows:

**I**nfrastructure → **C**ollection → **U**nification → **P**rocessing → **P**resentation

The owner provides the ground (I); you pull in raw material (C); you connect it into a coherent picture (U); you apply analysis to decide (P, Processing); you package it so people can act and own it (P, Presentation).

The two layers that both start with P are distinct: **Processing** is the analysis/engine; **Presentation** is the packaging/handover. Keep them separate.

Infrastructure is not always already in place. Sometimes the client owns it and you assess or use it as-is; sometimes it is partial or missing, and the engagement includes recommending, designing, or even standing up that foundation. It is the same layer either way. What changes is the **posture** (see rule 4): Provided, Advise, or Build.

---

## How to use this guide (for Claude, read first)

You are helping a delivery team place a project's deliverables, activities, and scope into I-CUPP. **Do not classify immediately.** First run the intake interview below to learn how the work is being delivered, then apply the classification logic in the reference sections.

Rules of engagement:
- Ask one topic at a time, in order. Wait for the answer before moving on. Keep each question short and offer the likely options so the person can just pick.
- **Start with the overall delivery mode (agentic, manual, or hybrid).** It sets the default for every layer; each layer can override it.
- For every layer, capture two attributes in addition to its contents: the **execution mode** (manual / agentic / hybrid) and the **engine or tooling** that does the work. For Processing specifically, capture whether it relies on **FS BPC**, another engine, agentic LLM analysis, or manual analysis.
- For Infrastructure, capture the **posture** (Provided / Advise / Build) and scope.
- Do not re-ask anything the person already answered; confirm it and move on.
- When intake is complete, or you have enough to proceed, produce the mapping in the format in section 7, recording execution mode, engine or tooling, and posture per item.
- If the person says "just classify this list" and gives enough detail, you may skip questions that are already answered, but still confirm the delivery mode and the Processing engine, since those change how items are described.

## Intake interview (ask before you classify)

Work through these in order. Bracketed options are suggestions to offer.

**0. Project basics**
- What is the project, in one line, and what domain is it in?
- Do you have a list of deliverables, activities, or scope items to classify, or should we build it together?

**1. Overall delivery mode (start here)**
- Is this engagement primarily **agentic** (AI agents do most of the execution), **manual** (people do it), or **hybrid** (a mix)? [Agentic / Manual / Hybrid]
- This becomes the default for each layer; we confirm or override per layer below.

**2. Infrastructure**
- Posture: is the foundation **Provided** (the client already owns the platform and environment), **Advise** (we recommend and design how to establish it), or **Build** (we stand it up)? [Provided / Advise / Build]
- What platform or environment does the work run on?
- Is provisioning, setup, or licensing in scope or out of scope?
- Who grants and owns access?

**3. Collection**
- Is collection **manual**, **agentic**, or **hybrid**? [Manual / Agentic / Hybrid] (for example, automated ingestion and metadata capture versus interviews and hand gathering)
- What are the sources, and is access read-only?

**4. Unification**
- Is unification **manual** or **agentic**? [Manual / Agentic / Hybrid] (for example, agents building lineage and resolving entities versus analysts modeling by hand)
- What needs to be connected: lineage, dependencies, identity or entity resolution, a common model or taxonomy?

**5. Processing**
- Does this project rely on **FS BPC** for processing, **another engine or tool**, **agentic LLM analysis**, or **manual analysis**? [FS BPC / Other engine / Agentic LLM / Manual]
- What decisions or outputs does Processing produce: scores, classifications, segments, forecasts, simulations, optimizations, prioritized backlogs?
- Are the recommendations advisory, or is the team acting on them directly?

**6. Presentation**
- What are the handover artifacts: reports, dashboards, playbooks, runbooks, executive summaries, training or enablement?
- Is Presentation produced **agentically**, **manually**, or **hybrid**? [Agentic / Manual / Hybrid]

**7. Scope and ownership**
- What is explicitly out of scope?
- What are the client's responsibilities (sponsor, SMEs, access, environment)?

When these are answered, classify each item using the reference logic below, and record per item: I-CUPP layer, execution mode, engine or tooling, posture (for Infrastructure), and in or out of scope.

---

## 1. The five layers at a glance

| Layer | Purpose (one line) | The question it answers | Belongs here | Does not belong here |
|---|---|---|---|---|
| **Infrastructure (I)** | The foundation the work runs on | "What foundation must exist for this work to run, and is it already in place or does it need to be defined or built?" | Target platforms, environments and instances, access model and credentials, licensing, hosting, systems used or assessed as-is; and, when the foundation is missing or partial, the readiness assessment, target-state design, and provisioning plan to establish it | Analysis of the data or processes that run on the foundation (that is C, U, or Processing) |
| **Collection (C)** | Pull in the raw material later layers depend on | "What raw inputs do we gather, and from where?" | Discovery, inventories, metadata and log capture, extraction, ingestion, fact-finding, document or signal gathering | Interpreting, relating, or transforming the inputs |
| **Unification (U)** | Make the collected material coherent and connected | "How do these pieces relate, and what is the joined-up picture?" | Lineage and dependency mapping, modeling, normalization, entity resolution, reconciliation, taxonomy or ontology alignment, single-view assembly | Pulling data in (that is C) or judging it (that is Processing) |
| **Processing (P)** | Apply analysis and logic to produce decisions | "What does the connected data tell us to do, and what is the impact?" | Scoring, classification, segmentation, forecasting, simulation, optimization, prioritization, recommendation, the proprietary engine or accelerator | Gathering (C), relating (U), or packaging for humans (Presentation) |
| **Presentation (P)** | Turn analysis into something people can act on and own | "How do we hand this over so the client can act and own it?" | Reports, dashboards, playbooks, runbooks, executive summaries, decision packages, walkthroughs, training, enablement, handover | The analysis itself (that is Processing) or raw, unpackaged outputs |

---

## 2. Core rules (the invariants)

1. **Each item maps to exactly one primary layer.** If an item seems to span two, assign it to where its primary value and effort sit. Never give one deliverable two homes.
2. **Express cross-layer relationships as "feeds" or "serves," not dual ownership.** Example: an artifact built by the analysis engine using a dependency map belongs to Processing (where it is produced), and you note that Unification "feeds" it. The map does not co-own the artifact.
3. **A deliverable's layer is where it is produced and owned, not every layer it touches.** Almost everything touches several layers in passing; classify by origin and primary purpose.
4. **Infrastructure has a posture; set it per engagement.** The foundation may be **Provided** (the client already owns it; you assess or use it as-is, and provisioning is out of scope), **Advise** (the client lacks it fully or partially, and the engagement recommends and designs how to establish it), or **Build** (the engagement actually provisions or implements it). All three live in the Infrastructure layer; what changes is scope. Under Provided, provisioning, setup, licensing, and deployment are out of scope, so mark them so rather than dropping them. Under Advise or Build, the readiness assessment, target-state design, access model, and provisioning plan are in-scope Infrastructure deliverables. Long-term operation of the foundation can remain out of scope even under Build, so state that explicitly.
5. **The proprietary engine, accelerator, model, or method is Processing.** It does not bleed across layers.
6. **Out-of-scope items still get a layer.** Classify them so the map is complete, then flag them out of scope. A complete map with scope flags is more useful than an incomplete one.
7. **Recommendations are advisory unless stated otherwise.** Processing outputs propose; the client decides. Reflect that wording in the Presentation layer.

---

## 3. Decision procedure

Run these questions in order for each item. Stop at the first match.

1. Is it about the foundation the work runs on (a platform, environment, access, credentials, licensing, hosting, or a system used or assessed as-is), or about defining or standing up that foundation? → **Infrastructure.** Then set the posture: Provided (client owns it; assess or use as-is; provisioning out of scope), Advise (recommend and design how to establish it; in scope), or Build (provision or implement it; in scope). Mark scope accordingly.
2. Is it primarily about pulling in raw inputs (connect, extract, capture, inventory, discover) with no interpretation yet? → **Collection.**
3. Is it primarily about relating, connecting, normalizing, or tracing the collected material into a coherent structure (mapping, lineage, reconciliation, modeling, single view)? → **Unification.**
4. Is it primarily about applying analysis, logic, or models to produce judgments (scores, classifications, simulations, forecasts, optimizations, priorities, recommendations)? → **Processing.**
5. Is it primarily about packaging, communicating, or enabling humans to act and own (reports, dashboards, playbooks, walkthroughs, training, handover)? → **Presentation.**

If two questions seem to apply, pick the one matching the item's primary purpose and effort, and record the secondary relationship as feeds or serves.

---

## 4. Boundary disambiguation (the cases that trip people up)

- **Infrastructure vs Collection.** Is it the environment we run against, or the act of pulling data from it? The database, platform, or system is Infrastructure. Extracting its metadata or records is Collection.
- **Collection vs Unification.** Did we just pull it in, or did we connect and relate it? A captured inventory is Collection. Building lineage or relationships across that inventory is Unification.
- **Unification vs Processing.** Are we structuring and relating, or judging and deciding? A dependency map is Unification. A risk score or a prioritized list derived from that map is Processing.
- **Processing vs Presentation.** Is the value the analysis itself, or the packaging and handover of it? A cost model or a recommendation set is Processing. The executive summary or the playbook that communicates those conclusions and tells teams how to execute is Presentation.
- **A single artifact that is both analyzed and packaged.** If one named deliverable contains both the analysis and its write-up, classify by what makes it valuable. A "classification report" whose value is the classification is Processing. A "decision package" whose value is the synthesis for leadership is Presentation. Do not split one named deliverable across two layers; use feeds or serves to note the dependency.

---

## 5. Layer deep dives with cross-domain examples

The point of these is to show the same five buckets work regardless of industry.

### Infrastructure (I)
The foundation the work runs on. Depending on posture, you either use it as-is or help define and establish it.

When the client **already has it (Provided):** assess or use it as-is; provisioning, licensing, and deployment are Infrastructure and typically out of scope.
- Data work: the warehouse, lakehouse, or operational store; the compute; the access account.
- Security work: the cloud accounts, identity provider, existing tooling and log sources.
- Marketing or CX work: the customer data platform, the warehouse, the ad and messaging platforms.
- Supply chain work: the ERP, the planning system, the data feeds.

When the client **lacks it or it is partial (Advise or Build):** the engagement helps establish the foundation, and these are in-scope Infrastructure deliverables.
- Infrastructure readiness or current-state assessment (what exists vs what is needed).
- Target platform recommendation and selection criteria.
- Reference or target-state architecture.
- Access model and security design (accounts, credentials, roles, network).
- Licensing and sizing recommendation.
- Provisioning or setup plan and runbook; under Build, the actual stood-up environment.

Operating the foundation long term can still be out of scope even when you recommend or build it; say so.

### Collection (C)
Connect and capture, no judgment yet.
- Inventory of assets, systems, datasets, or accounts.
- Metadata, log, configuration, or event capture.
- Extraction or ingestion of records.
- Fact-finding interviews and document gathering as raw input.

### Unification (U)
Connect the dots.
- Lineage and dependency mapping.
- Entity or identity resolution into a single view.
- Normalization, deduplication, and modeling to a common structure.
- Reconciliation of ownership and definitions across systems.

### Processing (P, analysis)
Apply the engine and decide.
- Scoring, classification, segmentation.
- Forecasting, prediction, propensity.
- Simulation and what-if, optimization.
- Prioritized backlogs, impact and cost models, ranked recommendations.
- The delivering party's proprietary accelerator, model, or method.

### Presentation (P, enablement)
Package and hand over.
- Reports, dashboards, executive summaries, decision packages.
- Playbooks, runbooks, step-by-step guidance.
- Walkthroughs, training, knowledge transfer, handover sessions.

---

## 6. Worked examples (four different domains)

Each row is an item, its primary layer, and a one-line rationale. Note how the shape repeats across very different projects.

### A. Security posture assessment

| Item | Layer | Rationale |
|---|---|---|
| Cloud accounts, identity provider, log sources (used as-is) | Infrastructure | Owner-provided ground; not built by us (provisioning out of scope) |
| Asset and exposure inventory | Collection | Capturing raw state, no judgment yet |
| Attack-path and trust-relationship mapping | Unification | Relating assets into a connected picture |
| Risk scoring and prioritized remediation backlog | Processing | Judgment and ranking applied to the mapped estate |
| Board report and remediation playbook | Presentation | Packaging and enabling action and handover |

### B. Customer and marketing analytics

| Item | Layer | Rationale |
|---|---|---|
| CDP, warehouse, ad and messaging platforms | Infrastructure | Owner-provided systems used as-is |
| Event and source data capture, source inventory | Collection | Pulling in raw signals |
| Identity resolution into a unified customer profile | Unification | Relating records into a single view |
| Segmentation, propensity, and forecast models | Processing | Analytical decisions on the unified data |
| Dashboards and campaign playbook | Presentation | Packaged for teams to act and own |

### C. Supply chain optimization

| Item | Layer | Rationale |
|---|---|---|
| ERP and planning systems, data feeds | Infrastructure | Owner-provided foundation |
| Demand, inventory, and lead-time ingestion | Collection | Gathering raw inputs |
| Network, BOM, and dependency mapping | Unification | Connecting the operational picture |
| Scenario simulation and optimization recommendations | Processing | Engine-driven decisions and impact |
| Executive S&OP deck and operations runbook | Presentation | Communicated and handed over for action |

### D. Process or operations assessment

| Item | Layer | Rationale |
|---|---|---|
| The systems and tools the process runs on | Infrastructure | Owner-owned; assessed, not provisioned |
| Process discovery and activity-log capture | Collection | Raw observation of how work flows |
| End-to-end process and handoff mapping | Unification | Relating steps into one flow |
| Bottleneck scoring and prioritized improvement backlog | Processing | Analytical judgment and ranking |
| Improvement roadmap and enablement sessions | Presentation | Packaged for the client to execute |

### E. Foundation not yet in place (Advise posture)

When the client does not have the foundation, the Infrastructure layer carries in-scope deliverables instead of just out-of-scope provisioning. The later layers then proceed once the foundation exists (or against a target-state assumption).

| Item | Layer (posture) | Rationale |
|---|---|---|
| Infrastructure readiness and current-state assessment | Infrastructure (Advise) | Establishes what exists versus what is needed |
| Target platform recommendation and selection criteria | Infrastructure (Advise) | Defines the foundation to stand up |
| Reference architecture and access model design | Infrastructure (Advise) | Specifies the foundation and how it is secured |
| Provisioning and setup plan or runbook | Infrastructure (Advise) | How to establish the foundation; in scope |
| Ingestion, mapping, analysis, and handover deliverables | C / U / Processing / Presentation | Proceed as usual once the foundation exists or against the target-state design |
| Long-term operation and administration of the platform | Infrastructure | Often still out of scope even when you advise or build; flag it |

---

## 7. Output the agent should produce

For a new project, produce a single mapping plus three supporting views.

**Mapping table** (one row per scope item or deliverable):

| Item | I-CUPP layer | Execution mode | Engine / tooling | Posture | Rationale | Scope |
|---|---|---|---|---|---|---|
| ... | I / C / U / P-processing / P-presentation | manual / agentic / hybrid | e.g. FS BPC, agentic LLM, a named tool, or manual | Provided / Advise / Build (Infrastructure rows only) | why it sits there | In / Out |

Record cross-layer dependencies separately as feeds or serves (below) rather than dual-assigning.

**Per-layer rollup:** list each layer with the items assigned to it and that layer's execution mode and engine or tooling, so the reader sees the engagement as five buckets and how each is delivered. Confirm every numbered deliverable appears under exactly one layer and that the count reconciles to the total.

**Infrastructure callout:** state the Infrastructure posture (Provided, Advise, or Build). Under Provided, note that the foundation is owner-owned and list the provisioning, setup, licensing, and deployment items that are out of scope. Under Advise or Build, list the in-scope Infrastructure deliverables (readiness assessment, target-state design, access model, provisioning plan) and note what remains out of scope, such as long-term operation.

**Cross-layer feeds:** list the "X feeds Y" relationships you noted, so dependencies are explicit without dual-assigning anything.

---

## 8. Anti-patterns to avoid

- **Dual-assigning a deliverable to two layers.** Pick the primary layer and use feeds or serves for the rest.
- **Putting the platform or environment under Collection.** The system is Infrastructure; pulling data from it is Collection.
- **Calling analysis outputs Presentation just because they are written down.** The analysis is Processing; only the packaged, communicated artifact is Presentation.
- **Treating ingestion as Unification.** Ingestion is Collection; relating the ingested material is Unification.
- **Forgetting provisioning is Infrastructure and out of scope.** Capture it, mark it, do not silently drop it.
- **Assuming Infrastructure is always client-owned and out of scope.** If the client lacks the foundation, recommending, designing, or building it is in-scope Infrastructure work. Set the posture (Provided, Advise, or Build) instead of defaulting to out of scope.
- **Letting the proprietary engine span layers.** It is Processing.
- **Leaving the two P's blurred.** Always label them Processing (analysis) and Presentation (enablement) so no item lands ambiguously.

---

## 9. Quick checklist

1. Did I run the intake interview first, starting with the delivery mode (agentic, manual, or hybrid)?
2. Did I capture, per item, the execution mode and the engine or tooling, including whether Processing uses FS BPC?
3. Did I run the ordered decision procedure for every item?
4. Does every item have exactly one primary layer?
5. Did I express every cross-layer link as feeds or serves rather than dual ownership?
6. Did I set the Infrastructure posture (Provided, Advise, or Build) and flag scope accordingly, including any in-scope readiness or provisioning deliverables?
7. Is the proprietary engine (FS BPC or other) in Processing only?
8. Are the two P's clearly separated (analysis vs enablement)?
9. Does the per-layer rollup reconcile to the full list of deliverables and scope items, and are out-of-scope items still classified and flagged?
