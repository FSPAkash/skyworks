# Business Process Copilot — Gap Analysis

**Spec:** `Business_Process_Copilot_Design_Spec.pdf` (UI/UX & Functional Spec v1.0)
**Codebase:** FS I-CUPP Delivery Console (`app/`)
**Dated:** 2026-07-13

## Headline finding

**These are two different products.** The spec defines a **Business Process Copilot**: an
LLM reads a live metadata catalog, recommends operational data sources, ranks them by
confidence, maps them into Bronze/Silver/Gold, and exports an ingestion spec.

What we shipped is a **delivery-tracking console** for FS engagements: an I-CUPP layer
journey, a SOW deliverables Gantt, and a *scripted* intake bot that provisions connection
credentials. No LLM, no metadata catalog, no recommendation engine, no medallion mapping,
no export.

Roughly **3 of 11** spec surfaces have a partial counterpart. The rest are net-new. Reuse
the shell (auth, roles, sidebar, config-driven profiles); rebuild the core.

## The two products, side by side

| | Today · I-CUPP Console | Spec · Business Process Copilot |
|---|---|---|
| **Job** | Tracks an FS delivery engagement | Recommends data sources for a process |
| **Home** | SOW deliverables timeline + Gantt by phase/week | Recent recommendation runs + copilot insights |
| **Core flow** | Assessment layers I → C → U → P → P | 4-step wizard: Context → Discovery → Layer Mapping → Review |
| **Chatbot** | Deterministic scripted intake, writes JSON | LLM over a live metadata catalog, cites tables/columns |
| **"Sources"** | Connection credential forms you fill and test | Catalog entities ranked by confidence score |
| **Roles** | C-Level, Architect, Engineer, Analyst, Delivery, Admin | Viewer, Analyst, Admin |
| **Admin** | Builds profiles from SOW PDF or form | Governs catalog registry, policies, model config, audit log |
| **Backend** | Flask + flat JSON, no LLM | Needs metadata catalog + datastore + LLM |

## Coverage matrix — every spec surface

Legend: **Present** = reusable, minor changes · **Partial** = shell exists, core missing · **Missing** = net-new build

| Spec surface | Status | Where we are & the gap |
|---|---|---|
| Login / SSO (§4.1) | Partial | Have Login + session role assignment. Spec wants enterprise **SSO (Azure AD / Okta), OAuth2**, forgot-password, access-request messaging. Add real IdP. |
| Landing / Home (§4.2) | Partial | Overview is a delivery Gantt, not a home dashboard. Spec wants **metric cards** (active requests, sources recommended, avg confidence), **recent runs list**, **copilot insights**, "Start New Recommendation" CTA. |
| Ask Metadata (§4.3) | Missing | Standalone always-on **catalog Q&A chatbot** with suggested prompts, referenced-metadata side panel, "Open in Catalog" links. Our chatbot is a scripted setup flow, not grounded Q&A. |
| New Recommendation Wizard (§4.4, steps 1–2) | Missing | NL intake where copilot asks clarifying questions and surfaces **live candidate sources with confidence scores**. 4-step progress indicator. No equivalent — the core product. |
| Medallion Layer Mapping (§4.5, step 3) | Missing | Three-column **Bronze/Silver/Gold Kanban**, drag cards between layers, live lineage + PK/FK + freshness-SLA validation. Nothing like it today. |
| Review & Results (§4.6, step 4) | Missing | Recommendation summary grouped by layer, rationale panel, **governance/risk checklist** that blocks approval, actions: Approve & Generate Spec, **Export PDF**, Send to Data Engineering. |
| Recommendation History (§4.7) | Missing | Searchable/filterable log of past runs with status, confidence, **audit trail**, duplicate-as-starting-point. No history store exists. |
| Data Source Catalog (§4.8) | Partial | Have connection targets per layer, but not a **browsable/searchable catalog** with faceted filters (system type, domain, layer, PII flag, freshness SLA), source cards, schema/lineage drill-down. |
| Settings (§4.9) | Missing | Tabbed Profile / Preferences / Integrations / Notifications / **API Keys**. No user-settings surface today (only admin profile builder). |
| User Management (§4.10) | Partial | Have a users + role-access map in JSON, but no admin UI to **invite, edit role, scope domain access, deactivate**. Build the table + invite flow. |
| Admin Console — Governance (§4.11) | Missing | Catalog registry, **governance policy editor** (PII, retention, approval workflow), model/copilot config (version, confidence thresholds), **immutable audit log**, usage & cost. Our Admin only builds delivery profiles. |
| RBAC — UI + API (§5.3) | Present | Role-gated routes and sidebar enforced client-side. Spec also wants enforcement **at the API layer** + immutable audit log — add server-side checks. |
| Streaming copilot responses (§5.2) | Missing | Answers must **stream incrementally**. Our bot posts canned strings. Needs an LLM streaming endpoint (SSE). |
| Accessibility — WCAG 2.1 AA (§5.1) | Partial | Needs audit: keyboard nav incl. a **non-drag fallback** for layer mapping, focus states, screen-reader labels on icon-only controls, AA contrast on status/confidence indicators. |

## The gaps that matter most

Everything above rolls up into five things we do not have. These are the product, not polish.

- **G1 — A metadata catalog backend.** The entire copilot is grounded in a live catalog of
  systems, tables, columns, ownership, lineage, freshness, and PII flags. We have none.
  Open question from spec §7: internal registry vs. Collibra vs. Purview. Everything else
  depends on this — build or integrate it first.
- **G2 — An LLM recommendation engine.** Replace the scripted chatbot with a real model
  that takes a NL business-process description, asks clarifying questions, scans the
  catalog, and returns **ranked candidate sources with confidence scores** and layer
  classification. Streaming (SSE), grounded, citing tables/columns. This is the spec's whole
  reason to exist.
- **G3 — The 4-step wizard + medallion mapping.** Context → Discovery → **Bronze/Silver/Gold
  drag-and-drop** → Review. Live lineage / PK-FK / freshness-SLA validation on every change.
  A governance checklist that **blocks approval** on unresolved PII. Large net-new flow with
  a Kanban board and validation loop.
- **G4 — Persistence: history, audit log, export.** Recommendation runs must be stored,
  searchable, versioned, and **auditable**. Approvals write an immutable audit trail. Results
  **export to PDF** and optionally push to a ticket (Jira, spec §7). Flat JSON won't carry
  this — needs a real datastore.
- **G5 — Admin governance + settings surfaces.** Governance policy editor, model/copilot
  config (thresholds, allowed domains), usage & cost, plus a user-facing Settings area with
  **API keys** and a real User Management table (invite / role / domain scope / deactivate).
  Admin today only builds delivery profiles.

## What we can keep

Not a rewrite from zero. The application shell is sound and maps cleanly onto the spec's
global patterns.

**Reuse as-is or lightly**
- Role-gated sidebar + route guards (`can()`, `canLayer()`) → filter by Viewer/Analyst/Admin
- Top header with branding + account menu; add global search + notifications
- Config-driven profiles pattern → becomes per-workspace catalog config
- Chatbot dock component → repurpose the shell, swap scripted engine for LLM
- Login page + session handling → extend with SSO
- Glass/Mondrian visual system already established in CSS

**Retire or repurpose**
- SOW deliverables Gantt / phases-weeks timeline — not in spec
- I-CUPP 5-layer journey — replaced by Bronze/Silver/Gold
- Scripted intake question flow — replaced by LLM intake
- Connection credential forms — become catalog source cards
- SOW-PDF / form profile builder — replaced by catalog admin
- 6-role model → collapse to the spec's Viewer / Analyst / Admin

## Suggested build sequence

Ordered by dependency. Nothing downstream works without the catalog and the engine, so they lead.

- **Phase 0 · Foundation — decide the catalog + datastore, collapse roles.** Resolve spec §7:
  pick the metadata catalog source and a persistence layer (Postgres) to replace flat JSON.
  Collapse the 6 roles to Viewer / Analyst / Admin. Add API-layer RBAC. *Blocks everything.*
- **Phase 1 · The engine — metadata catalog + LLM recommendation core.** Build/ingest the
  catalog (systems, tables, columns, lineage, freshness, PII). Stand up the LLM endpoint with
  streaming, grounded answers, confidence scoring. *Delivers Ask Metadata (§4.3) and the
  Discovery step (§4.4) as first payoff.*
- **Phase 2 · The flow — the recommendation wizard.** 4-step wizard: NL context → live
  candidates → Bronze/Silver/Gold drag-mapping with validation → Review with governance
  checklist. PDF export + Send to Engineering. *The headline product experience.*
- **Phase 3 · Around it — catalog browser, History, Home dashboard.** Faceted Data Source
  Catalog (§4.8), searchable Recommendation History with audit trail (§4.7), role-aware Home
  dashboard with metric cards + recent runs (§4.2). *Reuses catalog + history data.*
- **Phase 4 · Govern & harden — Admin console, Settings, SSO, a11y.** Governance policy
  editor, model config, usage & cost, immutable audit log. User Management + Settings (API
  keys). Enterprise SSO. WCAG 2.1 AA audit incl. non-drag mapping fallback.
  *Production-readiness layer.*

---
*Confidential · Generated 2026-07-13*
