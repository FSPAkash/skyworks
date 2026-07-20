import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useConfig } from "../config.jsx";
import Presentation from "./Presentation.jsx";
import StageOwner from "../components/StageOwner.jsx";
import { downloadBpcPdf } from "../pdfReport.js";

const KIND_LABEL = { db: "Database", erp: "ERP", crm: "CRM", mail: "Mail", docs: "Documents", feed: "Feed", cloud: "Cloud", llm: "LLM", external: "External" };
const STATE_CLASS = { delivered: "delivered", "in-progress": "in-progress", planned: "planned" };
// sub-part / status work-state labels. "delivered" would read as a deliverable,
// so completed collection/unification work is labelled "Ready" instead.
const WORK_LABEL = { delivered: "Ready", "in-progress": "In progress", planned: "Planned" };
const workLabel = (s) => WORK_LABEL[s] || s;
// short stage badge on deliverables, matching the Overview timeline pills
const GROUP_TAG = { Infrastructure: "I", Collection: "C", Unification: "U", BPC: "BPC", "Exec Strategy": "Exec" };
const groupTag = (d) => GROUP_TAG[d.group] || "";

// ---- connection form (folded in from the old Connections page) ----
function ConnForm({ target }) {
  const { saveConnection, testConnection } = useConfig();
  const conn = target.connection;
  const [values, setValues] = useState(() => {
    const seed = {};
    target.fields.forEach((f) => { if (f.prefill) seed[f.key] = f.prefill; });
    return { ...seed, ...(conn?.values || {}) };
  });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [open, setOpen] = useState(false);
  const status = conn?.status || "not-configured";
  const set = (k, v) => setValues((p) => ({ ...p, [k]: v }));

  const doTest = async () => {
    setBusy(true); setResult(null);
    await saveConnection(target.id, values);
    const out = await testConnection(target.id);
    setBusy(false); setResult(out);
    if (out.ok) setOpen(false);
  };

  return (
    <div className={"conn " + status}>
      <div className="conn-head" onClick={() => setOpen((o) => !o)}>
        <span className={"cdot " + status} />
        <span className="conn-src">{target.source}</span>
        <span className="chip">{KIND_LABEL[target.kind]}</span>
        <span className="conn-status-txt">
          {status === "connected" && conn?.detail
            ? `${conn.detail.pingMs}ms · ${conn.detail.discovered} ${conn.detail.unit}`
            : status === "configured" ? "Configured" : status === "not-configured" ? "Not connected" : status}
        </span>
        <span className="conn-toggle">{open ? "Close" : status === "connected" ? "Edit" : "Connect"}</span>
      </div>
      {open && (
        <div className="conn-body">
          <div className="conn-fields">
            {target.fields.map((f) => (
              <label key={f.key} className="fld">
                <span className="fld-lbl">{f.label}{f.required && <i> *</i>}</span>
                {f.type === "select" ? (
                  <select value={values[f.key] || ""} onChange={(e) => set(f.key, e.target.value)}>
                    <option value="">Select…</option>
                    {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input value={values[f.key] || ""} onChange={(e) => set(f.key, e.target.value)} placeholder={f.prefill} autoComplete="off" />
                )}
                {f.secret && <span className="fld-hint">Reference only, resolved at pull time.</span>}
              </label>
            ))}
          </div>
          <div className="conn-actions">
            <button className="btn primary" onClick={doTest} disabled={busy}>{busy ? "Testing…" : "Test connection"}</button>
          </div>
          {result && <div className={"conn-result " + (result.ok ? "ok" : "err")}>
            {result.ok ? `Connected · ${result.detail.pingMs}ms · ${result.detail.discovered} ${result.detail.unit}` : result.error}
          </div>}
        </div>
      )}
    </div>
  );
}

// ---- Infrastructure: connections split Sources / Cloud / LLM. Sources are
// further grouped into Internal/External x Structured/Unstructured sub-buckets.
// No meters here: usage only becomes known after Collection. ----
const SUBCAT_ORDER = [
  { key: "internal-structured", label: "Internal · Structured" },
  { key: "internal-unstructured", label: "Internal · Unstructured" },
  { key: "external-structured", label: "External · Structured" },
  { key: "external-unstructured", label: "External · Unstructured" },
];

const CAT_LABEL = { sources: "Sources", cloud: "Cloud", llm: "LLM" };

// A connection list capped at 2 rows, with expand-to-see-the-rest. Keeps each
// category compact when the SOW pulled in many sources.
function ConnList({ items }) {
  const [open, setOpen] = useState(false);
  const CAP = 2;
  const shown = open ? items : items.slice(0, CAP);
  const more = items.length - CAP;
  return (
    <>
      {shown.map((t) => <ConnForm key={t.id} target={t} />)}
      {more > 0 && (
        <button className="conn-more" onClick={() => setOpen((o) => !o)}>
          {open ? "Show less" : `Show ${more} more`}
        </button>
      )}
    </>
  );
}

// A connection added on the page because it was missed in the SOW. Purely
// client-side and mock: naming it and hitting Connect flips it green. No server.
function ManualConn({ conn, onConnect }) {
  const [open, setOpen] = useState(!conn.connected);
  const [name, setName] = useState(conn.name || "");
  const [host, setHost] = useState(conn.host || "");
  const connected = conn.connected;
  const doConnect = () => { if (!name.trim()) return; onConnect(conn.id, { name: name.trim(), host: host.trim() }); setOpen(false); };
  return (
    <div className={"conn " + (connected ? "connected" : "not-configured")}>
      <div className="conn-head" onClick={() => setOpen((o) => !o)}>
        <span className={"cdot " + (connected ? "connected" : "not-configured")} />
        <span className="conn-src">{connected ? name : (name || "New connection")}</span>
        <span className="chip">manual</span>
        <span className="conn-status-txt">{connected ? "Connected" : "Not connected"}</span>
        <span className="conn-toggle">{open ? "Close" : connected ? "Edit" : "Connect"}</span>
      </div>
      {open && (
        <div className="conn-body">
          <div className="conn-fields">
            <label className="fld"><span className="fld-lbl">Name<i> *</i></span>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. PLM archive" autoFocus /></label>
            <label className="fld"><span className="fld-lbl">Host / endpoint</span>
              <input value={host} onChange={(e) => setHost(e.target.value)} placeholder="e.g. plm.internal:1521" /></label>
          </div>
          <div className="conn-actions">
            <button className="btn primary" onClick={doConnect} disabled={!name.trim()}>Connect</button>
          </div>
        </div>
      )}
    </div>
  );
}

function InfraConnections() {
  const { sources } = useConfig();
  const cats = ["sources", "cloud", "llm"];
  // manually-added connections per category (client-side only, mock)
  const [manual, setManual] = useState({});
  const addManual = (cat) => setManual((m) => ({ ...m, [cat]: [...(m[cat] || []), { id: `man-${cat}-${Date.now()}`, connected: false }] }));
  const connectManual = (cat, id, vals) => setManual((m) => ({
    ...m, [cat]: (m[cat] || []).map((c) => c.id === id ? { ...c, ...vals, connected: true } : c),
  }));
  // Only the Infrastructure layer's own targets belong here. Collection and
  // Unification also declare `category:"sources"` source groups (schemas, logs,
  // lineage feeds) - those are their own layer's inputs, not infra connections,
  // so they must never leak onto this page.
  const infraTargets = (sources.targets || []).filter((t) => t.layer === "infrastructure");
  const hasAny = infraTargets.length > 0;

  return (
    <div>
      {!hasAny && (
        <div className="gate" style={{ marginBottom: 16 }}>
          <div className="g-ic">?</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, color: "var(--green-ink)", fontSize: 15 }}>No connections yet</div>
            <div style={{ fontSize: 13, color: "var(--ink-2)" }}>Run the full project to populate sources, or add connections below.</div>
          </div>
        </div>
      )}

      {cats.map((cat) => {
        const targets = infraTargets.filter((t) => t.category === cat);
        const manualCat = manual[cat] || [];
        if (targets.length === 0 && manualCat.length === 0 && !hasAny) return null;
        if (targets.length === 0 && manualCat.length === 0) return (
          <div key={cat} className="card" style={{ marginBottom: 14 }}>
            <div className="card-head">
              <span className="chip accent">{CAT_LABEL[cat]}</span>
              <button className="conn-add" onClick={() => addManual(cat)}>+ Add connection</button>
            </div>
          </div>
        );
        const manConnected = manualCat.filter((c) => c.connected).length;
        const connected = targets.filter((t) => (t.connection || {}).status === "connected").length + manConnected;
        const total = targets.length + manualCat.length;
        const complete = total > 0 && connected === total;
        // Sources: render each subcategory bucket with its own sub-header. Any
        // target without a subcat falls into an "Other" bucket at the end.
        const buckets = cat === "sources"
          ? (() => {
              const known = SUBCAT_ORDER
                .map((s) => ({ ...s, items: targets.filter((t) => t.subcat === s.key) }))
                .filter((s) => s.items.length);
              const other = targets.filter((t) => !SUBCAT_ORDER.some((s) => s.key === t.subcat));
              return other.length ? [...known, { key: "other", label: "Other", items: other }] : known;
            })()
          : null;
        return (
          <div key={cat} className="card" style={{ marginBottom: 14 }}>
            <div className="card-head">
              <span className="chip accent">{CAT_LABEL[cat]}</span>
              <span className={"conncount " + (complete ? "ok" : connected ? "part" : "none")}>
                {connected}/{total} · connected
              </span>
              <button className="conn-add" onClick={() => addManual(cat)}>+ Add connection</button>
            </div>
            <div className="card-body" style={{ padding: 12 }}>
              {buckets
                ? buckets.map((b) => (
                    <div key={b.key} className="subcat">
                      <div className="subcat-label">{b.label}</div>
                      <ConnList items={b.items} />
                    </div>
                  ))
                : <ConnList items={targets} />}
              {manualCat.length > 0 && (
                <div className="subcat">
                  <div className="subcat-label">Added on page</div>
                  {manualCat.map((c) => <ManualConn key={c.id} conn={c} onConnect={(id, vals) => connectManual(cat, id, vals)} />)}
                </div>
              )}
            </div>
          </div>
        );
      })}

      <style>{`
        .conn-add{margin-left:12px;flex:0 0 auto;background:var(--paper);border:1px solid var(--accent-ink);
          color:var(--accent-ink);cursor:pointer;font:800 9.5px var(--font);text-transform:uppercase;
          letter-spacing:.05em;padding:5px 11px}
        .conn-add:hover{background:var(--accent-tint)}
        .conn-more{width:100%;background:var(--tile);border:1px dashed var(--grid-line);color:var(--ink-2);
          cursor:pointer;font:800 10px var(--font);text-transform:uppercase;letter-spacing:.06em;padding:8px;margin-top:2px}
        .conn-more:hover{background:var(--paper);border-color:var(--accent-ink);color:var(--accent-ink)}
        .conncount{margin-left:auto;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;
          padding:3px 9px;border-radius:0;border:1.5px solid var(--grid-line)}
        .conncount.ok{color:#fff;background:var(--fs-green)}
        .conncount.part{color:var(--ink);background:var(--paper)}
        .conncount.none{color:var(--ink-3);background:var(--paper)}
        /* source subcategory buckets */
        .subcat{margin-bottom:14px}
        .subcat:last-child{margin-bottom:0}
        .subcat-label{font:800 9.5px var(--font);text-transform:uppercase;letter-spacing:.1em;color:var(--ink-3);
          margin:0 0 9px;padding-bottom:6px;border-bottom:1px solid var(--hair)}
        /* connection rows: geometric framed blocks */
        .conn{border:var(--grid-w) solid var(--grid-line);margin-bottom:10px;background:var(--paper);box-shadow:var(--soft)}
        .conn-head{display:flex;align-items:center;gap:11px;padding:11px 13px;cursor:pointer}
        .conn.connected .conn-head{background:var(--accent-tint)}
        .conn-head:hover{background:var(--tile)}
        .cdot{width:9px;height:9px;flex:0 0 auto;border-radius:0;border:1px solid var(--grid-line)}
        .cdot.connected{background:var(--fs-green)}
        .cdot.configured{background:var(--ds-yellow)}
        .cdot.not-configured,.cdot.error{background:var(--paper)}
        .conn-src{font-weight:800;color:var(--ink);min-width:130px}
        .conn-status-txt{font-size:11.5px;color:var(--ink-3);flex:1}
        .conn-toggle{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:var(--accent-ink)}
        .conn-body{border-top:var(--grid-w) solid var(--grid-line);padding:14px;background:var(--paper)}
        .conn-fields{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        @media(max-width:820px){.conn-fields{grid-template-columns:1fr}}
        .fld{display:flex;flex-direction:column;gap:4px}
        .fld-lbl{font-size:10.5px;text-transform:uppercase;letter-spacing:.07em;font-weight:800;color:var(--ink-3)}
        .fld-lbl i{color:var(--ds-red);font-style:normal}
        .fld input,.fld select{height:34px;border:var(--grid-w) solid var(--grid-line);padding:0 10px;font:600 12.5px var(--font);background:var(--paper);color:var(--ink)}
        .fld input:focus,.fld select:focus{outline:none;border-color:var(--fs-green);box-shadow:0 0 0 2px var(--accent-tint)}
        .fld-hint{font-size:10.5px;color:var(--ink-4)}
        .conn-actions{display:flex;gap:8px;margin-top:14px}
        .conn-result{margin-top:12px;padding:9px 12px;font-size:12px;font-weight:700;border:var(--grid-w) solid var(--grid-line)}
        .conn-result.ok{color:var(--accent-ink);background:var(--accent-tint)}
        .conn-result.err{color:var(--ds-red);background:var(--paper)}
      `}</style>
    </div>
  );
}

// ---- reusable centered modal ----
// Full detail (sub-part metrics + BPC reasoning) opens in a content-sized card
// over a translucent, blurred scrim - no dead space, focus on the record.
function Modal({ open, onClose, title, eyebrow, onDownload, wide, footer, children }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    // lock page scroll so only the modal body scrolls (no double scrollbar)
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="mdl-scrim" onClick={onClose}>
      <div className={"mdl" + (wide ? " mdl-wide" : "")} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="mdl-head">
          <div>
            {eyebrow && <div className="mdl-eyebrow">{eyebrow}</div>}
            <div className="mdl-title">{title}</div>
          </div>
          <button className="mdl-x" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="mdl-body">{children}</div>
        {footer && <div className="mdl-actions mdl-footer">{footer}</div>}
        {onDownload && !footer && (
          <div className="mdl-actions">
            <button className="mdl-dl" onClick={onDownload}>↓ Download PDF</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---- inline metric strip shown in a row's title area (main info first) ----
function MetricStrip({ metrics, max }) {
  if (!metrics || !metrics.length) return null;
  const shown = max ? metrics.slice(0, max) : metrics;
  return (
    <div className="mstrip">
      {shown.map((m) => (
        <span key={m.label} className="mstrip-item">
          <b>{m.value}{m.unit && <i> {m.unit}</i>}</b>
          <span>{m.label}</span>
        </span>
      ))}
    </div>
  );
}

// ---- BPC intelligence body: inference or annotation (rendered inside a drawer) ----
function BpcIntelBody({ intel }) {
  if (!intel || !(intel.items || []).length) return null;
  const isAnno = intel.kind === "annotation";
  return (
    <div className="bpc-intel">
      {intel.note && <p className="bpc-intel-note">{intel.note}</p>}
      <div className="bpc-intel-list">
        {intel.items.map((it, i) => isAnno ? (
          <div key={i} className="bpc-anno">
            <div className="bpc-anno-top">
              <code className="bpc-anno-target">{it.target}</code>
              {it.tag && <span className="bpc-tag">{it.tag}</span>}
            </div>
            {it.note && <div className="bpc-anno-note">{it.note}</div>}
            {it.why && <div className="bpc-why"><b>Why</b> {it.why}</div>}
          </div>
        ) : (
          <div key={i} className="bpc-inf">
            <p className="bpc-inf-text">{it.text}</p>
            {typeof it.confidence === "number" && (
              <div className="bpc-conf" title="BPC confidence">
                <span className="bpc-conf-num">{it.confidence}%</span>
                <span className="bpc-conf-track"><span className="bpc-conf-fill" style={{ width: `${it.confidence}%` }} /></span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- "What does the data mean?" body (rendered inside a drawer) ----
function BpcMeaningBody({ meaning, excludedIds = new Set() }) {
  if (!meaning || !(meaning.questions || []).length) return null;
  return (
    <div>
      {meaning.subtitle && <p className="bpc-sub">{meaning.subtitle}</p>}
      <div className="bpc-qa">
        {meaning.questions.map((q, i) => {
          const withdrawn = q.sourceItem && excludedIds.has(q.sourceItem);
          return (
            <div key={i} className={"bpc-qa-row" + (withdrawn ? " withdrawn" : "")}>
              <div className="bpc-q">{q.q}{withdrawn && <span className="bpc-wd">withdrawn</span>}</div>
              <div className="bpc-a">{withdrawn ? "This answer rested on a finding the reviewer excluded during certification, so it is withdrawn from the interpretation." : q.a}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---- "Signal that matters most" body (rendered inside a drawer) ----
function BpcSignalBody({ signal }) {
  if (!signal || !signal.primary) return null;
  const p = signal.primary;
  const ranked = signal.ranked || [];
  return (
    <div>
      {signal.subtitle && <p className="bpc-sub">{signal.subtitle}</p>}
      <div className="bpc-primary">
        <div className="bpc-primary-tag">Top signal</div>
        <div className="bpc-primary-name">{p.signal}</div>
        <div className="bpc-primary-topic">{p.topic}</div>
        <p className="bpc-primary-why">{p.why}</p>
      </div>
      {ranked.length > 0 && (
        <div className="bpc-ranked">
          {ranked.map((r, i) => (
            <div key={i} className="bpc-rank-row">
              <div className="bpc-rank-main">
                <div className="bpc-rank-name">{r.signal} <span className="bpc-rank-topic">· {r.topic}</span></div>
                <div className="bpc-rank-why">{r.why}</div>
              </div>
              <div className="bpc-rank-meter">
                <span className="bpc-rank-num">{r.weight}</span>
                <span className="bpc-conf-track"><span className="bpc-conf-fill" style={{ width: `${r.weight}%` }} /></span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- sub-part rows: name + inline metrics in the row header, click -> modal ----
// Summary first: the row shows what matters at a glance; the modal holds the
// full findings, the reasoning, AND the human review that certifies the sub-part.
// When `review` is on, each row carries its own certification state (Needs
// review -> Certified) and the modal folds the accept/flag step in - so the
// sub-part is one object the human reads and signs off in place.
function SubParts({ layer, review, reviewState, reviewSet, onReset }) {
  const { canSubpart } = useConfig();
  const [openId, setOpenId] = useState(null);
  const ownReview = useReviewState("collection");
  const rstate = reviewState || ownReview[0];
  const rset = reviewSet || ownReview[1];
  const parts = (layer.subparts || []).filter((s) => canSubpart(s.id));
  if (parts.length === 0) return null;
  const active = parts.find((s) => s.id === openId);
  const reviewable = review ? parts.filter((s) => s.review) : [];
  const certified = reviewable.filter((s) => rstate[s.id]?.certified).length;

  // sub-part review state -> the pill on the row (replaces the static work label)
  const subState = (s) => {
    if (!review || !s.review) return null;
    const r = rstate[s.id];
    if (r?.certified) return { cls: "delivered", label: "Certified" };
    return { cls: "planned", label: "Needs review" };
  };

  return (
    <div style={{ marginBottom: 20 }}>
      {reviewable.length > 0 && (
        <div className="cert-strip">
          <span className={"cert-strip-dot" + (certified === reviewable.length ? " done" : "")} />
          <span className="cert-strip-txt">{certified}/{reviewable.length} sub-parts certified</span>
          {certified > 0 && onReset && <button className="rvw-reset" onClick={onReset}>Reset all</button>}
        </div>
      )}
      <div className="splist">
        {parts.map((s) => {
          const hasDetail = s.desc || (s.metrics || []).length > 2 || s.intel || s.review;
          const ss = subState(s);
          const uncertified = review && s.review && !rstate[s.id]?.certified;
          return (
            <button key={s.id} className={"sprow" + (uncertified ? " sprow-cand" : "")} onClick={() => hasDetail && setOpenId(s.id)} disabled={!hasDetail}>
              <span className="sprow-name">{s.name}</span>
              <MetricStrip metrics={s.metrics} max={3} />
              {uncertified && <span className="sprow-unv" title="Discovery output — not yet certified">unverified</span>}
              {ss
                ? <span className={"st " + ss.cls}>{ss.label}</span>
                : s.state && <span className={"st " + (STATE_CLASS[s.state] || "planned")}>{workLabel(s.state)}</span>}
              {hasDetail && <span className="sprow-chev">+</span>}
            </button>
          );
        })}
      </div>

      <Modal
        open={!!active}
        onClose={() => setOpenId(null)}
        title={active?.name}
        wide={!!(review && active?.review)}
        eyebrow={review && active?.review ? (rstate[active.id]?.certified ? "Certified" : "Needs review") : undefined}
        onDownload={active?.intel && !(review && active?.review) ? () => downloadBpcPdf({
          kind: "intel", data: active.intel, title: active.name,
          eyebrow: active.intel.title, context: layer.name + " · sub-part",
        }) : undefined}
        footer={active && review && active.review
          ? <SubpartCertifyFooter subpart={active} state={rstate} set={rset} onDone={() => setOpenId(null)} />
          : undefined}>
        {active && (
          review && active.review ? (
            <div className="cty-flow">
              <div className="cty-flow-main">
                {active.desc && <p className="drw-desc">{active.desc}</p>}
                <SubpartCertify subpart={active} state={rstate} set={rset} />
              </div>
              <aside className="cty-flow-side">
                {active.intel && (
                  <section className="cty-side-block">
                    <div className="cty-side-h">BPC reasoning behind these findings</div>
                    <BpcIntelBody intel={active.intel} />
                  </section>
                )}
                {(active.metrics || []).length > 0 && (
                  <section className="cty-side-block">
                    <MetricsOutcome metrics={active.metrics} state={rstate[active.id] || {}} />
                  </section>
                )}
              </aside>
            </div>
          ) : (
            <>
              {active.desc && <p className="drw-desc">{active.desc}</p>}
              {(active.metrics || []).length > 0 && (
                <div className="drw-metrics">
                  {active.metrics.map((m) => (
                    <div key={m.label} className="drw-metric">
                      <div className="drw-metric-v">{m.value}{m.unit && <span className="drw-metric-u"> {m.unit}</span>}</div>
                      <div className="drw-metric-l">{m.label}</div>
                    </div>
                  ))}
                </div>
              )}
              {active.intel && <div className="drw-sec"><BpcIntelBody intel={active.intel} /></div>}
            </>
          )
        )}
      </Modal>
    </div>
  );
}

// ---- the review step folded into a sub-part's modal ----
// Every engine-proposed fact/tag starts as a Candidate. The human dispositions
// each one - Accept or Exclude - and acknowledges any risk. The sub-part can
// only be certified once every item is dispositioned, so certification provably
// means each finding was looked at (not just a button click). Certified numbers
// and interpretation flow from this sign-off.
function SubpartCertify({ subpart, state, set }) {
  const rv = subpart.review;
  const r = state[subpart.id] || {};
  const certified = !!r.certified;
  const disp = r.disp || {};                 // { [itemId]: "accepted" | "excluded" }
  const acks = r.acks || {};
  const pending = rv.items.filter((i) => !disp[i.id]).length;

  const setDisp = (id, v) => set(subpart.id, { disp: { ...disp, [id]: disp[id] === v ? undefined : v } });
  const acceptAll = () => set(subpart.id, { disp: Object.fromEntries(rv.items.map((i) => [i.id, disp[i.id] === "excluded" ? "excluded" : "accepted"])) });
  const toggleAck = (id) => set(subpart.id, { acks: { ...acks, [id]: !acks[id] } });

  return (
    <div className="cty">
      <div className="cty-head">
        <span className="cty-act">{rv.action}</span>
        {!certified && pending > 0 && <button className="cty-all" onClick={acceptAll}>Accept all</button>}
      </div>
      <div className="cty-list">
        {rv.items.map((it) => {
          const d = disp[it.id];
          const rowCls = d === "accepted" ? " accepted" : d === "excluded" ? " dropped" : " candidate";
          return (
            <div key={it.id} className={"cty-row" + rowCls}>
              <div className="cty-body">
                <div className="cty-toprow">
                  <span className="cty-label">{it.label}</span>
                  {d === "accepted" && <span className="cty-tag acc">accepted</span>}
                  {d === "excluded" && <span className="cty-tag excl">excluded</span>}
                </div>
                <div className="cty-detail">{it.detail}</div>
                {it.evidence && <div className="cty-ev">{it.evidence}</div>}
                {it.risk && (
                  <label className={"cty-risk" + (acks[it.id] ? " ack" : "")}>
                    <input type="checkbox" checked={!!acks[it.id]} disabled={certified} onChange={() => toggleAck(it.id)} />
                    {acks[it.id] ? it.risk + " acknowledged" : "Acknowledge " + it.risk}
                  </label>
                )}
              </div>
              <div className="cty-rail">
                {typeof it.confidence === "number" && (
                  <div className="cty-conf">
                    <span className="cty-conf-n">{it.confidence}%</span>
                    <span className="cty-conf-l">confidence</span>
                  </div>
                )}
                <div className="cty-disp">
                  <button className={"cty-btn cty-acc" + (d === "accepted" ? " on" : "")} disabled={certified} onClick={() => setDisp(it.id, "accepted")}>Accept</button>
                  <button className={"cty-btn cty-exc" + (d === "excluded" ? " on" : "")} disabled={certified} onClick={() => setDisp(it.id, "excluded")}>Exclude</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// The metric tiles read as the OUTCOME of the review, not a static header: a
// metric tied (by `ref`) to an item the human excluded strikes through and is
// marked "excluded", so the summary provably reflects the decisions above.
function MetricsOutcome({ metrics, state }) {
  const disp = state.disp || {};
  return (
    <div className="cty-outcome">
      <div className="cty-outcome-h">Resulting figures</div>
      <div className="drw-metrics">
        {metrics.map((m) => {
          const dropped = m.ref && disp[m.ref] === "excluded";
          return (
            <div key={m.label} className={"drw-metric" + (dropped ? " metric-excl" : "")}>
              <div className="drw-metric-v">{m.value}{m.unit && <span className="drw-metric-u"> {m.unit}</span>}</div>
              <div className="drw-metric-l">{m.label}</div>
              {dropped && <div className="metric-excl-tag">excluded</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// certify controls live in the modal footer so they stay visible while the body
// (findings, items, reasoning) scrolls
function SubpartCertifyFooter({ subpart, state, set, onDone }) {
  const rv = subpart.review;
  const r = state[subpart.id] || {};
  const certified = !!r.certified;
  const disp = r.disp || {};
  const acks = r.acks || {};
  const pending = rv.items.filter((i) => !disp[i.id]).length;
  const excluded = rv.items.filter((i) => disp[i.id] === "excluded").length;
  const risksOpen = rv.items.filter((i) => i.risk && !acks[i.id]).length;
  const canCertify = pending === 0 && risksOpen === 0;
  const positive = rv.kind === "confirm" ? "Confirm & certify" : rv.kind === "validate" ? "Validate & certify" : "Approve & certify";
  const certify = () => { set(subpart.id, { certified: true, at: new Date().toISOString() }); onDone(); };
  const reopen = () => set(subpart.id, { certified: false });

  return (
    <>
      <span className="cty-foot-note">
        {certified
          ? `Certified · ${rv.items.length - excluded} accepted${excluded ? `, ${excluded} excluded` : ""}`
          : pending > 0 ? `${pending} of ${rv.items.length} still to review`
            : excluded ? `${excluded} excluded from the certified set` : "All items accepted"}
      </span>
      {certified
        ? <button className="btn" onClick={reopen}>Reopen</button>
        : <button className="btn primary" disabled={!canCertify} onClick={certify}>
            {pending > 0 ? `${pending} item${pending > 1 ? "s" : ""} to review`
              : risksOpen > 0 ? `${risksOpen} risk${risksOpen > 1 ? "s" : ""} to acknowledge`
              : positive}
          </button>}
    </>
  );
}

// ---- human-in-the-loop review state ----
// Decisions the human makes on Collection (validate/approve) and Unification
// (accept/edit/certify) live client-side, keyed per profile so a demo reload
// keeps them. Shape: { [itemId]: { decision, values?, ack? } }.
function useReviewState(scope) {
  const { pid } = useConfig();
  const storeKey = `fs_review_${pid}_${scope}`;
  const [state, setState] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storeKey) || "{}"); } catch { return {}; }
  });
  // reload when the profile/scope changes, and keep separate hook instances of
  // the same scope in sync (e.g. the "working on" callout reacting to review
  // decisions made in the tracks below) via a scope-scoped custom event.
  useEffect(() => {
    const reload = () => { try { setState(JSON.parse(localStorage.getItem(storeKey) || "{}")); } catch { setState({}); } };
    reload();
    const onSync = (e) => { if (e.detail === storeKey) reload(); };
    window.addEventListener("fs_review_sync", onSync);
    return () => window.removeEventListener("fs_review_sync", onSync);
  }, [storeKey]);
  const bump = useCallback(() => window.dispatchEvent(new CustomEvent("fs_review_sync", { detail: storeKey })), [storeKey]);
  // patch may be an object (shallow-merged) or a function of the current entry
  // (for appends that must read live state, e.g. adding a manual lineage edge)
  const set = useCallback((id, patch) => {
    setState((prev) => {
      const cur = prev[id] || {};
      const resolved = typeof patch === "function" ? patch(cur) : patch;
      const next = { ...prev, [id]: { ...cur, ...resolved } };
      try { localStorage.setItem(storeKey, JSON.stringify(next)); } catch {}
      return next;
    });
    bump();
  }, [storeKey, bump]);
  const reset = useCallback(() => {
    try { localStorage.removeItem(storeKey); } catch {}
    setState({});
    bump();
  }, [storeKey, bump]);
  return [state, set, reset];
}

const DECISION_ST = { accepted: "delivered", edited: "in-progress", rejected: "planned" };

// ---- confidence meter reused from the BPC blocks, without the label ----
function ConfMeter({ value }) {
  if (typeof value !== "number") return null;
  return (
    <div className="bpc-conf" title="Model confidence">
      <span className="bpc-conf-num">{value}%</span>
      <span className="bpc-conf-track"><span className="bpc-conf-fill" style={{ width: `${value}%` }} /></span>
    </div>
  );
}

// ---- Unification: the human takes over and certifies the Baseline (D3-D5) ----
// Three tracks - lineage, ownership, classification - each with accept / edit /
// reject per item, then a sign-off gate that unlocks once everything is resolved.
const CLS_LAYERS = ["Bronze", "Silver", "Gold"];

// "Unowned" is a live condition, not a static risk: an ownership item is unowned
// only while no owner is assigned. Once the human assigns one it clears. Returns
// the effective owner (edited value wins over the config default).
const ownerOf = (item, state) => (state[item.id]?.values?.owner ?? item.owner ?? "").trim();
const isUnowned = (item, state) => item.risk === "Unowned" && !ownerOf(item, state);

function UniEditBody({ track, item, dec, set, close }) {
  const v = dec?.values || {};
  const [draft, setDraft] = useState(() => {
    if (track.type === "lineage") return { source: v.source ?? item.label.split(" → ")[0] ?? "", target: v.target ?? item.label.split(" → ")[1] ?? "", edge: v.edge ?? item.edge ?? "FK" };
    if (track.type === "ownership") return { owner: v.owner ?? item.owner ?? "", steward: v.steward ?? item.steward ?? "" };
    return { layer: v.layer ?? item.layer };
  });
  const save = () => {
    let detail = item.detail;
    if (track.type === "lineage") detail = `${draft.source} → ${draft.target} · ${draft.edge}`;
    if (track.type === "ownership") detail = draft.owner ? `${draft.owner}${draft.steward ? " · " + draft.steward : ""}` : item.detail;
    if (track.type === "classification") detail = `Set ${draft.layer}`;
    set(item.id, { decision: "edited", values: { ...draft, detail } });
    close();
  };

  return (
    <div>
      {item.evidence && <div className="rvw-ev"><span className="rvw-ev-lbl">Evidence</span>{item.evidence}</div>}
      {track.type === "lineage" && (
        <div className="rvw-fields">
          <label className="fld"><span className="fld-lbl">Source</span><input value={draft.source} onChange={(e) => setDraft((d) => ({ ...d, source: e.target.value }))} /></label>
          <label className="fld"><span className="fld-lbl">Target</span><input value={draft.target} onChange={(e) => setDraft((d) => ({ ...d, target: e.target.value }))} /></label>
          <label className="fld"><span className="fld-lbl">Edge type</span>
            <select value={draft.edge} onChange={(e) => setDraft((d) => ({ ...d, edge: e.target.value }))}>
              {["FK", "ELT step", "Manual"].map((o) => <option key={o}>{o}</option>)}
            </select>
          </label>
        </div>
      )}
      {track.type === "ownership" && (
        <div className="rvw-fields">
          {item.conflict && <div className="rvw-conflict">Conflict: {item.conflict.join(" vs ")} — assign one owner.</div>}
          <label className="fld"><span className="fld-lbl">Owner</span>
            {item.conflict
              ? <select value={draft.owner} onChange={(e) => setDraft((d) => ({ ...d, owner: e.target.value }))}><option value="">Select…</option>{item.conflict.map((o) => <option key={o}>{o}</option>)}</select>
              : <input value={draft.owner} onChange={(e) => setDraft((d) => ({ ...d, owner: e.target.value }))} />}
          </label>
          <label className="fld"><span className="fld-lbl">Steward</span><input value={draft.steward} onChange={(e) => setDraft((d) => ({ ...d, steward: e.target.value }))} placeholder="Name" /></label>
        </div>
      )}
      {track.type === "classification" && (
        <div className="rvw-seg">
          {CLS_LAYERS.map((l) => (
            <button key={l} className={"rvw-seg-btn" + (draft.layer === l ? " on " + l.toLowerCase() : "")} onClick={() => setDraft((d) => ({ ...d, layer: l }))}>{l}</button>
          ))}
        </div>
      )}
      <div className="rvw-modal-actions">
        <button className="btn" onClick={close}>Cancel</button>
        <button className="btn primary" onClick={save}>Save edit</button>
      </div>
    </div>
  );
}

// ---- Manual Additions: the human adds a relationship automation missed ----
function AddLineageBody({ onAdd, onCancel }) {
  const [d, setD] = useState({ source: "", target: "", dir: "Upstream", edge: "FK" });
  const ok = d.source.trim() && d.target.trim();
  return (
    <div>
      <div className="rvw-fields">
        <label className="fld"><span className="fld-lbl">Source</span>
          <input value={d.source} onChange={(e) => setD((p) => ({ ...p, source: e.target.value }))} placeholder="e.g. PLM.parts" autoFocus /></label>
        <label className="fld"><span className="fld-lbl">Target</span>
          <input value={d.target} onChange={(e) => setD((p) => ({ ...p, target: e.target.value }))} placeholder="e.g. Skyworks_ODS" /></label>
        <label className="fld"><span className="fld-lbl">Direction</span>
          <select value={d.dir} onChange={(e) => setD((p) => ({ ...p, dir: e.target.value }))}>
            {["Upstream", "Downstream"].map((o) => <option key={o}>{o}</option>)}
          </select></label>
        <label className="fld"><span className="fld-lbl">Edge type</span>
          <select value={d.edge} onChange={(e) => setD((p) => ({ ...p, edge: e.target.value }))}>
            {["FK", "ELT step", "Manual"].map((o) => <option key={o}>{o}</option>)}
          </select></label>
      </div>
      <div className="rvw-modal-actions">
        <button className="btn" onClick={onCancel}>Cancel</button>
        <button className="btn primary" disabled={!ok} onClick={() => onAdd(d)}>Add edge</button>
      </div>
    </div>
  );
}

function UniTrack({ track, state, set, locked, lockReason }) {
  const [openId, setOpenId] = useState(null);
  const [adding, setAdding] = useState(false);
  // human-added lineage edges live in review state under a per-track key; they
  // are the "Manual Additions" activity - relationships automation missed
  const added = state[`__added_${track.id}`]?.items || [];
  const items = [...track.items, ...added];
  const item = locked ? null : items.find((i) => i.id === openId);
  const dec = item ? state[item.id] : null;
  const done = items.filter((i) => state[i.id]?.decision).length;
  const canAdd = !locked && track.type === "lineage";

  const rowValue = (i) => {
    const d = state[i.id];
    if (d?.values?.detail) return d.values.detail;
    return i.detail;
  };
  const clsLayer = (i) => (state[i.id]?.values?.layer) || i.layer;

  const addEdge = (draft) => {
    const id = "man-" + Math.random().toString(36).slice(2, 8);
    const label = `${draft.source} → ${draft.target}`;
    const it = { id, label, detail: `${draft.dir} · manual addition · ${draft.edge}`, edge: draft.edge, manual: true, confidence: null };
    set(`__added_${track.id}`, (cur) => ({ items: [...(cur.items || []), it] }));   // append from live state
    set(id, { decision: "edited", values: { detail: it.detail } });   // added = dispositioned
    setAdding(false);
  };

  return (
    <div className={"rvw" + (locked ? " locked" : "")} style={{ marginBottom: 16 }}>
      <div className="rvw-head">
        <span className="rvw-track-name">{track.name}</span>
        <span className="rvw-act">{locked ? lockReason : track.action}</span>
        {canAdd && <button className="rvw-add" onClick={() => setAdding(true)}>+ Add lineage</button>}
        {locked
          ? <span className="rvw-lock">Locked</span>
          : <span className={"rvw-prog" + (done === items.length ? " done" : "")}>{done}/{items.length}</span>}
      </div>
      {!locked && (
      <div className="rvw-list">
        {items.map((i) => {
          const st = state[i.id]?.decision;
          return (
            <button key={i.id} className="rvw-row" onClick={() => setOpenId(i.id)}>
              <span className={"rvw-dot " + (st ? DECISION_ST[st] || "in-progress" : "pending")} />
              <span className="rvw-main">
                <span className="rvw-label">{i.label}</span>
                <span className="rvw-detail">{rowValue(i)}</span>
              </span>
              {i.manual && <span className="rvw-manual">manual</span>}
              {track.type === "classification" && <span className={"cls-pill " + clsLayer(i).toLowerCase()}>{clsLayer(i)}</span>}
              {i.critical && <span className="rvw-crit">critical</span>}
              {i.risk === "Unowned"
                ? isUnowned(i, state) && <span className="rvw-risk">Unowned</span>
                : i.risk && <span className={"rvw-risk" + (state[i.id]?.ack ? " ack" : "")}>{i.risk}</span>}
              <ConfMeter value={i.confidence} />
              {st
                ? <span className={"st " + (DECISION_ST[st] || "in-progress")}>{st === "edited" ? (i.manual ? "Added" : "Edited") : st === "rejected" ? "Rejected" : "Accepted"}</span>
                : <span className="rvw-chev">+</span>}
            </button>
          );
        })}
      </div>
      )}

      <Modal open={!!item} onClose={() => setOpenId(null)} title={item?.label} eyebrow={track.name}>
        {item && (
          <UniItemModal track={track} item={item} dec={dec} set={set} close={() => setOpenId(null)} />
        )}
      </Modal>

      <Modal open={adding} onClose={() => setAdding(false)} title="Add lineage" eyebrow={track.name}>
        <AddLineageBody onAdd={addEdge} onCancel={() => setAdding(false)} />
      </Modal>
    </div>
  );
}

// two-mode modal body: a resolve view (accept / edit / reject) and the edit form
function UniItemModal({ track, item, dec, set, close }) {
  const [editing, setEditing] = useState(false);
  if (editing) return <UniEditBody track={track} item={item} dec={dec} set={set} close={close} />;
  // "Unowned" isn't an ack-risk - it's resolved by assigning an owner in Edit.
  // Other risks (PII, Data quality) are acknowledged.
  const stillUnowned = item.risk === "Unowned" && !((dec?.values?.owner ?? item.owner ?? "").trim());
  const ackRisk = item.risk && item.risk !== "Unowned";
  return (
    <div>
      <div className="rvw-detail-lg">{dec?.values?.detail || item.detail}</div>
      {item.evidence && <div className="rvw-ev"><span className="rvw-ev-lbl">Evidence</span>{item.evidence}</div>}
      <ConfMeter value={item.confidence} />
      {stillUnowned && (
        <div className="rvw-unowned">No owner assigned. Use Edit to assign an owner before certifying.</div>
      )}
      {ackRisk && (
        <label className="rvw-ackrow">
          <input type="checkbox" checked={!!dec?.ack} onChange={(e) => set(item.id, { ack: e.target.checked })} />
          <span>Acknowledge {item.risk} risk</span>
        </label>
      )}
      <div className="rvw-modal-actions">
        <button className="btn" onClick={() => { set(item.id, { decision: "rejected" }); close(); }}>Reject</button>
        <button className="btn" onClick={() => setEditing(true)}>Edit</button>
        <button className="btn primary" onClick={() => { set(item.id, { decision: "accepted" }); close(); }}>Accept</button>
      </div>
    </div>
  );
}

// Fake connect to the FS EDA (Enterprise Data Assessment) tool, shown above the
// lineage tracks. Mock only: hitting Connect flips the box green. Persists per
// profile so the demo keeps the connection across a reload.
function EdaConnect() {
  const { pid } = useConfig();
  const key = `fs_eda_${pid}`;
  const [connected, setConnected] = useState(() => {
    try { return localStorage.getItem(key) === "1"; } catch { return false; }
  });
  const [busy, setBusy] = useState(false);
  const connect = () => {
    setBusy(true);
    setTimeout(() => {
      setBusy(false); setConnected(true);
      try { localStorage.setItem(key, "1"); } catch {}
    }, 650);
  };
  return (
    <div className={"eda" + (connected ? " on" : "")}>
      <span className={"eda-dot" + (connected ? " on" : "")} />
      <div className="eda-txt">
        <b>{connected ? "Connected to FS EDA tool" : "Connect to FS EDA tool"}</b>
        <span>{connected
          ? "Lineage feeds and dependency graph are streaming from the Enterprise Data Assessment engine."
          : "Pull upstream / downstream lineage from the Enterprise Data Assessment engine."}</span>
      </div>
      {connected
        ? <span className="eda-badge">Live</span>
        : <button className="btn primary" onClick={connect} disabled={busy}>{busy ? "Connecting…" : "Connect"}</button>}
      <style>{`
        .eda{display:flex;align-items:center;gap:14px;margin-bottom:16px;padding:14px 17px;
          background:var(--paper);border:1px solid var(--hair);box-shadow:var(--soft)}
        .eda.on{border-color:var(--fs-green);background:var(--accent-tint);box-shadow:var(--halo)}
        .eda-dot{width:11px;height:11px;flex:0 0 auto;border:1.5px solid var(--grid-line);background:var(--paper)}
        .eda-dot.on{background:var(--fs-green);border-color:var(--fs-green)}
        .eda-txt{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
        .eda-txt b{font-size:13.5px;font-weight:800;color:var(--ink)}
        .eda-txt span{font-size:11.5px;color:var(--ink-3);line-height:1.4}
        .eda .btn{flex:0 0 auto}
        .eda-badge{flex:0 0 auto;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;
          color:#fff;background:var(--fs-green);padding:4px 10px}
      `}</style>
    </div>
  );
}

function UnificationReview({ layer, state, set, reset }) {
  const rv = layer.review;
  const { canSubpart } = useConfig();
  const [signed, setSigned] = useState(() => {
    try { return JSON.parse(localStorage.getItem("fs_certify") || "{}"); } catch { return {}; }
  });
  if (!rv || !(rv.tracks || []).length) return null;
  // role-scoped: a track the current role doesn't work on is hidden, and drops
  // out of the certify math so the gate reflects only what this role can act on
  const tracks = rv.tracks.filter((t) => canSubpart(t.id));
  const hiddenCount = rv.tracks.length - tracks.length;
  if (!tracks.length) return null;

  const writeSigned = (next) => {
    setSigned(next);
    try { localStorage.setItem("fs_certify", JSON.stringify(next)); } catch {}
    window.dispatchEvent(new CustomEvent("fs_certify_sync"));   // let the callout react
  };
  // reset clears every disposition, manual addition, and the Baseline sign-off
  const resetAll = () => {
    reset();
    const next = { ...signed }; delete next[layer.key];
    writeSigned(next);
  };
  const anyWork = !!signed[layer.key] || tracks.some((t) =>
    [...t.items, ...(state[`__added_${t.id}`]?.items || [])].some((i) => state[i.id]?.decision));

  const allItems = tracks.flatMap((t) => {
    const addedItems = (state[`__added_${t.id}`]?.items || []);
    return [...t.items, ...addedItems].map((i) => ({ ...i, _type: t.type }));
  });
  const resolved = allItems.filter((i) => state[i.id]?.decision).length;
  // ack-risks are PII / data-quality; "Unowned" is resolved by assigning an owner
  const risksOpen = allItems.filter((i) => i.risk && i.risk !== "Unowned" && !state[i.id]?.ack).length;
  const own = tracks.find((t) => t.type === "ownership");
  // any ownership item still missing an owner blocks certification
  const unownedOpen = (own?.items || []).filter((i) => isUnowned(i, state)).length;
  const blockers = [];
  if (resolved < allItems.length) blockers.push(`${allItems.length - resolved} items to resolve`);
  if (risksOpen) blockers.push(`${risksOpen} risks to acknowledge`);
  if (unownedOpen) blockers.push(`${unownedOpen} dataset${unownedOpen > 1 ? "s" : ""} without an owner`);
  const ready = blockers.length === 0;
  const isSigned = !!signed[layer.key];

  // sequence: classification is locked until lineage and ownership resolve. You
  // can't certify a medallion layer on unconfirmed lineage or unowned data.
  const trackDone = (type) => {
    const t = tracks.find((x) => x.type === type);
    if (!t) return true;   // a track not visible to this role doesn't gate them
    const all = [...t.items, ...(state[`__added_${t.id}`]?.items || [])];
    return all.every((i) => state[i.id]?.decision);
  };
  const clsLocked = !(trackDone("lineage") && trackDone("ownership"));
  const clsLockReason = "Resolve Lineage Validation and Ownership Mapping to unlock classification.";

  const certify = () => {
    const rec = { at: new Date().toISOString(), resolved, of: allItems.length,
      edits: allItems.filter((i) => state[i.id]?.decision === "edited").length,
      rejects: allItems.filter((i) => state[i.id]?.decision === "rejected").length };
    writeSigned({ ...signed, [layer.key]: rec });
  };

  return (
    <div style={{ marginBottom: 20 }}>
      <EdaConnect />
      {tracks.map((t) => (
        <UniTrack key={t.id} track={t} state={state} set={set}
          locked={t.type === "classification" && clsLocked}
          lockReason={clsLockReason} />
      ))}
      {hiddenCount > 0 && (
        <div className="rvw-scoped">{hiddenCount} track{hiddenCount > 1 ? "s" : ""} outside your role are hidden from this view.</div>
      )}

      <div className={"rvw-gate" + (ready ? " ready" : "") + (isSigned ? " signed" : "")}>
        {isSigned ? (
          <>
            <span className="rvw-gate-dot signed" />
            <div className="rvw-gate-txt">
              <b>Baseline certified · {rv.certifies}</b>
              <span>{signed[layer.key].resolved}/{signed[layer.key].of} resolved · {signed[layer.key].edits} edited · {signed[layer.key].rejects} rejected</span>
            </div>
            <button className="rvw-reset" onClick={resetAll}>Reset all</button>
          </>
        ) : (
          <>
            <span className={"rvw-gate-dot" + (ready ? " ready" : "")} />
            <div className="rvw-gate-txt">
              <b>{resolved}/{allItems.length} resolved</b>
              <span>{ready ? "Ready to certify" : blockers.join(" · ")}</span>
            </div>
            {anyWork && <button className="rvw-reset" onClick={resetAll}>Reset all</button>}
            <button className="btn primary" disabled={!ready} onClick={certify}>Certify Baseline · {rv.certifies}</button>
          </>
        )}
      </div>
    </div>
  );
}

// ---- Unification page section: three tracks + the certify gate ----
function UnificationReviewSection({ layer }) {
  const [state, set, reset] = useReviewState("unification");
  if (!layer.review) return null;
  return <div style={{ margin: "20px 0" }}><UnificationReview layer={layer} state={state} set={set} reset={reset} /></div>;
}

function ReviewStyles() {
  return (
    <style>{`
      /* collapsed reasoning under the decision (findings -> decide -> why) */
      .drw-why{margin-top:16px;border-top:1px solid var(--hair);padding-top:14px}
      .drw-why>summary{font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;
        color:var(--ink-3);cursor:pointer;list-style:none;display:flex;align-items:center;gap:7px}
      .drw-why>summary::-webkit-details-marker{display:none}
      .drw-why>summary::before{content:"▸";color:var(--ink-4);font-size:10px}
      .drw-why[open]>summary::before{content:"▾"}
      .drw-why>summary:hover{color:var(--accent-ink)}
      .drw-why[open]>summary{margin-bottom:12px}
      /* uncertified sub-part: numbers are discovery output, marked unverified */
      .sprow-unv{flex:0 0 auto;font-size:8.5px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;
        color:var(--ds-yellow);border:1px solid var(--ds-yellow);padding:2px 6px}
      /* Collection: page-level certification progress + the fold-in review */
      .cert-strip{display:flex;align-items:center;gap:9px;margin:0 0 12px;padding:9px 14px;
        background:var(--tile);border:1px solid var(--hair)}
      .cert-strip-dot{width:9px;height:9px;flex:0 0 auto;border:1px solid var(--grid-line);background:var(--paper)}
      .cert-strip-dot.done{background:var(--fs-green);border-color:var(--fs-green)}
      .cert-strip-txt{font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:var(--ink-3)}
      .rvw-reset{margin-left:auto;background:none;border:1px solid var(--hair);cursor:pointer;
        font:800 9.5px var(--font);text-transform:uppercase;letter-spacing:.06em;color:var(--ink-3);padding:5px 11px}
      .rvw-reset:hover{color:var(--ds-red);border-color:var(--ds-red)}
      /* withdrawn-answers note under the interpretation */
      .mean-excl{margin-top:12px;padding:11px 14px;background:var(--tile);border:1px solid var(--hair)}
      .mean-excl-h{font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:var(--ds-red)}
      .mean-excl ul{margin:8px 0 0;padding:0;list-style:none;display:flex;flex-direction:column;gap:5px}
      .mean-excl li{font-size:12px;color:var(--ink-3);line-height:1.4}
      .mean-excl-q{text-decoration:line-through;color:var(--ink-4)}
      /* unowned prompt in the ownership item modal */
      .rvw-unowned{margin-top:14px;padding:10px 13px;font-size:12px;font-weight:700;color:var(--ds-red);
        background:var(--paper);border:1px solid var(--ds-red);line-height:1.45}
      /* wide review workspace: findings on the left, reasoning + outcome on the
         right, so the whole flow reads left-to-right with nothing collapsed */
      .cty-flow{display:grid;grid-template-columns:1fr 340px;gap:26px;align-items:start}
      @media(max-width:820px){.cty-flow{grid-template-columns:1fr}}
      .cty-flow-main{min-width:0}
      .cty-flow-side{min-width:0;display:flex;flex-direction:column;gap:18px}
      .cty-side-block{min-width:0}
      .cty-side-h{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:var(--ink-2);
        margin-bottom:11px;padding-bottom:9px;border-bottom:1px solid var(--hair)}
      .cty-col-main{min-width:0}
      .cty-head{display:flex;align-items:baseline;gap:12px;margin-bottom:11px}
      .cty-act{font-size:12.5px;color:var(--ink-2);line-height:1.5;flex:1}
      .cty-all{flex:0 0 auto;background:none;border:none;cursor:pointer;font:800 10px var(--font);text-transform:uppercase;
        letter-spacing:.06em;color:var(--accent-ink);padding:0;white-space:nowrap}
      .cty-all:hover{text-decoration:underline}
      .cty-list{display:flex;flex-direction:column;border:1px solid var(--hair)}
      /* each finding is a card split into a content zone (left, everything
         left-aligned) and a fixed decision rail (right: confidence over the
         Accept/Exclude buttons). The rail width is fixed so confidence and
         buttons line up on one axis across every card - no ragged right edge. */
      .cty-row{display:grid;grid-template-columns:1fr 128px;gap:18px;align-items:start;
        padding:15px 16px;border-bottom:1px solid var(--hair);background:var(--paper);transition:background .12s}
      .cty-row:last-child{border-bottom:none}
      .cty-row.accepted{background:var(--accent-tint)}
      .cty-row.dropped{background:var(--paper)}
      .cty-row.dropped .cty-label,.cty-row.dropped .cty-detail{text-decoration:line-through;color:var(--ink-4)}
      .cty-row.dropped .cty-ev{opacity:.55}
      .cty-body{min-width:0}
      .cty-toprow{display:flex;align-items:center;gap:9px;flex-wrap:wrap}
      .cty-label{font:800 12.5px var(--mono,ui-monospace,monospace);color:var(--ink);min-width:0;display:inline-flex;align-items:center}
      /* candidate (not yet actioned) gets a yellow marker so it reads as "needs action" */
      .cty-row.candidate .cty-label::before{content:"";display:inline-block;width:6px;height:6px;margin-right:8px;
        flex:0 0 auto;background:var(--ds-yellow)}
      .cty-tag{flex:0 0 auto;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;padding:2px 7px}
      .cty-tag.excl{color:var(--ds-red);border:1px solid var(--ds-red);background:var(--paper)}
      .cty-tag.acc{color:var(--fs-green);border:1px solid var(--fs-green);background:var(--paper)}
      .cty-detail{font-size:12.5px;color:var(--ink-2);margin-top:6px;line-height:1.45}
      .cty-ev{font-size:11px;color:var(--ink-4);margin-top:6px;line-height:1.5}
      /* the fixed decision rail, right-aligned to the card edge */
      .cty-rail{display:flex;flex-direction:column;align-items:stretch;gap:11px}
      .cty-conf{display:flex;flex-direction:column;align-items:flex-end;line-height:1.1}
      .cty-conf-n{font:800 15px var(--mono,ui-monospace,monospace);color:var(--ink);font-variant-numeric:tabular-nums}
      .cty-conf-l{font-size:8.5px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:var(--ink-4);margin-top:2px}
      /* BPC reasoning cards, in the right rail */
      .cty-flow-side .bpc-inf,.cty-flow-side .bpc-anno{background:var(--tile)}
      /* outcome figures: metrics as the result of the review, in the right rail */
      .cty-outcome-h{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:var(--ink-2);
        margin-bottom:11px;padding-bottom:9px;border-bottom:1px solid var(--hair)}
      .cty-flow-side .drw-metrics{grid-template-columns:1fr 1fr;gap:10px}
      .drw-metric.metric-excl .drw-metric-v,.drw-metric.metric-excl .drw-metric-l{text-decoration:line-through;color:var(--ink-4)}
      .drw-metric.metric-excl .drw-metric-u{color:var(--ink-4)}
      .metric-excl-tag{margin-top:5px;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:var(--ds-red)}
      .cty-risk{display:inline-flex;align-items:center;gap:7px;margin-top:10px;font-size:9px;font-weight:800;text-transform:uppercase;
        letter-spacing:.05em;color:var(--ds-red);border:1px solid var(--ds-red);padding:5px 9px;cursor:pointer;white-space:nowrap;background:var(--paper)}
      .cty-risk.ack{color:#fff;background:var(--fs-green);border-color:var(--fs-green)}
      .cty-risk input{width:12px;height:12px;flex:0 0 auto;accent-color:var(--fs-green)}
      /* disposition: Accept (green when on) | Exclude (red when on). Buttons stay
         visible and reflect the saved choice even when certified/disabled */
      .cty-disp{display:flex;flex-direction:column;gap:7px}
      .cty-btn{width:100%;font:800 10px var(--font);text-transform:uppercase;letter-spacing:.05em;padding:8px 0;
        background:var(--paper);border:1px solid var(--grid-line);cursor:pointer}
      .cty-btn.cty-acc{color:var(--ink-3)}
      .cty-btn.cty-exc{color:var(--ds-red)}
      .cty-btn.cty-acc.on{background:var(--fs-green);border-color:var(--fs-green);color:#fff}
      .cty-btn.cty-exc.on{background:var(--ds-red);border-color:var(--ds-red);color:#fff}
      .cty-btn:hover:not(.on):not(:disabled){background:var(--tile)}
      .cty-btn:disabled{cursor:default}
      .cty-btn:disabled:not(.on){opacity:.4}
      .cty-foot-note{flex:1;font-size:11.5px;color:var(--ink-3);font-weight:600}
      .rvw{background:var(--paper);border:1px solid var(--hair);box-shadow:var(--soft)}
      .rvw.locked{opacity:.72}
      .rvw.locked .rvw-head{border-bottom:none}
      .rvw-add{flex:0 0 auto;background:none;border:1px solid var(--accent-ink);color:var(--accent-ink);cursor:pointer;
        font:800 9.5px var(--font);text-transform:uppercase;letter-spacing:.05em;padding:4px 9px}
      .rvw-add:hover{background:var(--accent-tint)}
      .rvw-manual{flex:0 0 auto;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;
        color:var(--accent-ink);background:var(--accent-tint);padding:2px 7px}
      .rvw-lock{flex:0 0 auto;font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;
        color:var(--ink-4);background:var(--paper);border:1px solid var(--hair);padding:3px 9px}
      .rvw-head{display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid var(--hair);background:var(--tile)}
      .rvw-track-name{font-size:12px;font-weight:800;color:var(--ink);flex:0 0 auto}
      .rvw-act{font-size:11.5px;color:var(--ink-3);line-height:1.4;flex:1;min-width:0}
      .rvw-prog{flex:0 0 auto;font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;
        color:var(--ink-3);background:var(--paper);border:1px solid var(--hair);padding:3px 9px}
      .rvw-prog.done{color:#fff;background:var(--fs-green);border-color:var(--fs-green)}
      .rvw-list{display:flex;flex-direction:column}
      .rvw-row{display:flex;align-items:center;gap:13px;width:100%;text-align:left;background:none;cursor:pointer;
        border:none;border-bottom:1px solid var(--hair);padding:13px 16px;font:inherit;transition:background .12s}
      .rvw-row:last-child{border-bottom:none}
      .rvw-row:hover{background:var(--tile)}
      .rvw-dot{width:9px;height:9px;flex:0 0 auto;border-radius:0;border:1px solid var(--grid-line);background:var(--paper)}
      .rvw-dot.pending{background:var(--paper)}
      .rvw-dot.delivered{background:var(--fs-green)}
      .rvw-dot.in-progress{background:var(--ds-blue)}
      .rvw-dot.planned{background:var(--ds-red)}
      .rvw-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
      .rvw-label{font-size:13px;font-weight:800;color:var(--ink);font-family:var(--mono,ui-monospace,monospace)}
      .rvw-detail{font-size:11.5px;color:var(--ink-3);line-height:1.4}
      .rvw-chev{flex:0 0 auto;font-size:16px;font-weight:600;color:var(--ink-4);width:20px;height:20px;
        display:inline-flex;align-items:center;justify-content:center;border:1px solid var(--hair);border-radius:50%}
      .rvw-row:hover .rvw-chev{color:var(--accent-ink);border-color:var(--accent-ink)}
      .rvw-risk{flex:0 0 auto;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;
        color:#fff;background:var(--ds-red);padding:2px 7px}
      .rvw-risk.ack{background:var(--fs-green)}
      .rvw-crit{flex:0 0 auto;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;
        color:var(--ds-red);background:var(--paper);border:1px solid var(--ds-red);padding:2px 6px}
      .rvw .bpc-conf{flex:0 0 92px;margin:0}
      .cls-pill{flex:0 0 auto;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;
        padding:2px 8px;border:1px solid var(--grid-line)}
      .cls-pill.bronze{background:#8a5a2b;color:#fff;border-color:#8a5a2b}
      .cls-pill.silver{background:#8a8f96;color:#fff;border-color:#8a8f96}
      .cls-pill.gold{background:var(--ds-yellow);color:var(--ink)}
      /* modal review bodies */
      .rvw-detail-lg{font-size:14px;font-weight:700;color:var(--ink);line-height:1.5;margin-bottom:14px}
      .rvw-ev{background:var(--tile);border:1px solid var(--hair);padding:12px 14px;font-size:12.5px;
        color:var(--ink-2);line-height:1.55;margin-bottom:14px}
      .rvw-ev-lbl{display:block;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;
        color:var(--ink-3);margin-bottom:5px}
      .rvw-ackrow{display:flex;align-items:center;gap:9px;margin-top:14px;font-size:12.5px;color:var(--ink-2);cursor:pointer}
      .rvw-ackrow input{width:15px;height:15px;accent-color:var(--fs-green)}
      /* form fields inside review modals (edit / add lineage) - self-contained
         so they render correctly on pages where InfraConnections isn't mounted */
      .rvw-fields{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:4px}
      @media(max-width:560px){.rvw-fields{grid-template-columns:1fr}}
      .rvw-fields .fld{display:flex;flex-direction:column;gap:6px}
      .rvw-fields .fld-lbl{font-size:10px;text-transform:uppercase;letter-spacing:.07em;font-weight:800;color:var(--ink-3)}
      .rvw-fields .fld input,.rvw-fields .fld select{height:38px;border:var(--grid-w) solid var(--grid-line);
        padding:0 11px;font:600 13px var(--font);background:var(--paper);color:var(--ink);width:100%;box-sizing:border-box}
      .rvw-fields .fld input:focus,.rvw-fields .fld select:focus{outline:none;border-color:var(--fs-green);
        box-shadow:0 0 0 2px var(--accent-tint)}
      .rvw-conflict{grid-column:1/-1;font-size:11.5px;font-weight:700;color:var(--ds-red);background:var(--paper);
        border:1px solid var(--ds-red);padding:8px 11px}
      .rvw-seg{display:flex;gap:0;margin-bottom:4px;border:var(--grid-w) solid var(--grid-line);width:fit-content}
      .rvw-seg-btn{font:800 12px var(--font);padding:9px 20px;background:var(--paper);color:var(--ink-2);
        border:none;border-right:1px solid var(--grid-line);cursor:pointer}
      .rvw-seg-btn:last-child{border-right:none}
      .rvw-seg-btn.on.bronze{background:#8a5a2b;color:#fff}
      .rvw-seg-btn.on.silver{background:#8a8f96;color:#fff}
      .rvw-seg-btn.on.gold{background:var(--ds-yellow);color:var(--ink)}
      .rvw-modal-actions{display:flex;justify-content:flex-end;gap:9px;margin-top:20px;padding-top:16px;
        border-top:1px solid var(--hair)}
      /* note when some tracks are hidden by role scope */
      .rvw-scoped{margin:0 0 16px;padding:10px 14px;font-size:11.5px;color:var(--ink-3);font-weight:600;
        background:var(--tile);border:1px solid var(--hair)}
      /* the sign-off gate */
      .rvw-gate{display:flex;align-items:center;gap:14px;padding:16px 18px;background:var(--paper);
        border:1px solid var(--hair);box-shadow:var(--soft)}
      /* important states get a full halo (whole-card glow), not an edge accent */
      .rvw-gate.ready{border-color:var(--fs-green);box-shadow:var(--halo)}
      .rvw-gate.signed{border-color:var(--fs-green);background:var(--accent-tint);box-shadow:var(--halo)}
      .rvw-gate-dot{width:11px;height:11px;flex:0 0 auto;border-radius:0;border:1.5px solid var(--grid-line);background:var(--paper)}
      .rvw-gate-dot.ready,.rvw-gate-dot.signed{background:var(--fs-green);border-color:var(--fs-green)}
      .rvw-gate-txt{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
      .rvw-gate-txt b{font-size:13.5px;font-weight:800;color:var(--ink)}
      .rvw-gate-txt span{font-size:11.5px;color:var(--ink-3)}
      .rvw-gate .btn{flex:0 0 auto}
    `}</style>
  );
}

// ---- locked state for "what the data means": the interpretation is a product
// of certification, so it stays sealed until the discovery is signed off ----
function MeaningLocked({ done, total }) {
  return (
    <div className="mean-lock" style={{ marginBottom: 20 }}>
      <span className="mean-lock-ic" />
      <div className="mean-lock-txt">
        <b>What does the data mean?</b>
        <span>Certify the discovery to confirm the interpretation · {done}/{total} sub-parts certified</span>
      </div>
      <style>{`
        .mean-lock{display:flex;align-items:center;gap:13px;padding:15px 17px;background:var(--tile);
          border:1px dashed var(--hair)}
        .mean-lock-ic{width:10px;height:10px;flex:0 0 auto;border:1.5px solid var(--ink-4);background:var(--paper)}
        .mean-lock-txt{display:flex;flex-direction:column;gap:2px}
        .mean-lock-txt b{font-size:13.5px;font-weight:800;color:var(--ink-3)}
        .mean-lock-txt span{font-size:11.5px;color:var(--ink-4)}
      `}</style>
    </div>
  );
}

// ---- "What does the data mean?" callout: headline answer on the page,
// full Q&A in a modal. Important info is called out, then elaborated. ----
function BpcMeaningCallout({ meaning, excluded = [], excludedIds = new Set() }) {
  const [open, setOpen] = useState(false);
  if (!meaning || !(meaning.questions || []).length) return null;
  // a question is withdrawn when the finding it rests on was excluded in review
  const isWithdrawn = (q) => q.sourceItem && excludedIds.has(q.sourceItem);
  const live = meaning.questions.filter((q) => !isWithdrawn(q));
  const withdrawn = meaning.questions.filter(isWithdrawn);
  const lead = live[0] || meaning.questions[0];
  const more = live.length - 1 + withdrawn.length;
  return (
    <div className="bpc-callout" style={{ marginBottom: 20 }}>
      <div className="bpc-callout-lead">
        <div className="bpc-callout-q">{lead.q}</div>
        <div className="bpc-callout-a">{lead.a}</div>
      </div>
      {withdrawn.length > 0 && (
        <div className="mean-excl">
          <span className="mean-excl-h">{withdrawn.length} finding{withdrawn.length > 1 ? "s" : ""} excluded in review · withdrawn from this interpretation</span>
          <ul>
            {withdrawn.map((q, i) => (
              <li key={i}><span className="mean-excl-q">{q.q}</span></li>
            ))}
          </ul>
        </div>
      )}
      {more > 0 && (
        <button className="bpc-callout-btn" onClick={() => setOpen(true)}>
          Full analysis · {more} more {more === 1 ? "answer" : "answers"} ›
        </button>
      )}
      <Modal open={open} onClose={() => setOpen(false)}
        title={meaning.title}
        onDownload={() => downloadBpcPdf({
          kind: "meaning", data: meaning, title: meaning.title,
          eyebrow: meaning.author || "BPC · Business Process Co-Pilot",
        })}>
        <BpcMeaningBody meaning={meaning} excludedIds={excludedIds} />
      </Modal>
    </div>
  );
}

// ---- "Signal that matters most" callout: the top signal shown on the page,
// ranked runners-up in a modal. ----
function BpcSignalCallout({ signal }) {
  const [open, setOpen] = useState(false);
  if (!signal || !signal.primary) return null;
  const p = signal.primary;
  const ranked = signal.ranked || [];
  return (
    <div className="bpc-callout" style={{ marginBottom: 20 }}>
      <div className="bpc-primary">
        <div className="bpc-primary-tag">Top signal</div>
        <div className="bpc-primary-name">{p.signal}</div>
        <div className="bpc-primary-topic">{p.topic}</div>
        <p className="bpc-primary-why">{p.why}</p>
      </div>
      {ranked.length > 0 && (
        <button className="bpc-callout-btn" onClick={() => setOpen(true)}>
          See all ranked signals · {ranked.length} more ›
        </button>
      )}
      <Modal open={open} onClose={() => setOpen(false)}
        title={signal.title}
        onDownload={() => downloadBpcPdf({
          kind: "signal", data: signal, title: signal.title,
          eyebrow: signal.author || "BPC · Business Process Co-Pilot",
        })}>
        <BpcSignalBody signal={signal} />
      </Modal>
    </div>
  );
}

// ---- shared styles for the summary rows, drawer, and BPC blocks ----
function BpcStyles() {
  return (
    <style>{`
      @keyframes kpiRise{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
      /* group label: eyebrow separating operational rows from BPC intelligence */
      .grp-label{display:flex;align-items:center;gap:9px;font-size:10.5px;font-weight:800;text-transform:uppercase;
        letter-spacing:.1em;color:var(--ink-3);margin:0 0 10px;padding-bottom:8px;border-bottom:1px solid var(--hair)}
      .grp-label:not(:first-child){margin-top:26px}
      .grp-label .bpc-badge{text-transform:none}
      .grp-label.accent{color:var(--ds-blue)}
      /* sub-part rows: name + inline metrics in the header, no body boxes */
      .splist{display:flex;flex-direction:column;background:var(--paper);border:1px solid var(--hair);box-shadow:var(--soft)}
      .sprow{display:flex;align-items:center;gap:16px;width:100%;text-align:left;background:none;cursor:pointer;
        border:none;border-bottom:1px solid var(--hair);padding:15px 18px;font:inherit;transition:background .12s}
      .sprow:last-of-type{border-bottom:none}
      .sprow:hover:not(:disabled){background:var(--tile)}
      .sprow:disabled{cursor:default}
      .sprow-name{font-size:14px;font-weight:800;color:var(--ink);flex:0 0 auto;min-width:170px}
      .sprow-bpc,.bpc-badge{display:inline-flex;align-items:center;font-size:9px;font-weight:800;letter-spacing:.1em;
        color:#fff;background:var(--ds-blue);padding:2px 7px;line-height:1.4}
      .sprow-bpc{flex:0 0 auto}
      .sprow .st{flex:0 0 auto}
      .sprow-chev{margin-left:auto;font-size:18px;font-weight:600;color:var(--ink-4);flex:0 0 auto;line-height:1;
        width:22px;height:22px;display:inline-flex;align-items:center;justify-content:center;
        border:1px solid var(--hair);border-radius:50%}
      .sprow:hover:not(:disabled) .sprow-chev{color:var(--accent-ink);border-color:var(--accent-ink)}
      .sprow:disabled .sprow-chev{display:none}
      /* inline metric strip in the row header */
      .mstrip{display:flex;align-items:baseline;gap:18px;flex:1;min-width:0;flex-wrap:wrap}
      .mstrip-item{display:flex;align-items:baseline;gap:6px;white-space:nowrap}
      .mstrip-item b{font-size:15px;font-weight:800;color:var(--ink);font-variant-numeric:tabular-nums;letter-spacing:-.01em}
      .mstrip-item b i{font-size:10px;color:var(--accent-ink);font-style:normal;font-weight:700}
      .mstrip-item>span{font-size:9.5px;text-transform:uppercase;letter-spacing:.06em;font-weight:700;color:var(--ink-3)}
      @media(max-width:720px){.sprow{flex-wrap:wrap;gap:10px}.mstrip{width:100%}}

      /* BPC callout: important insight visible on the page, detail in a modal.
         Whole-card halo marks it as important (no edge accent). */
      .bpc-callout{background:var(--paper);border:1px solid var(--hair);box-shadow:var(--halo);
        padding:16px 18px 18px}
      .bpc-callout-head{display:flex;align-items:center;gap:9px;margin-bottom:12px}
      .bpc-callout-title{font-size:14px;font-weight:800;color:var(--ink)}
      .bpc-callout-author{margin-left:auto;font-size:10px;font-weight:700;letter-spacing:.03em;color:var(--ink-4)}
      .bpc-callout-sub{margin:0 0 12px;font-size:12.5px;line-height:1.55;color:var(--ink-3)}
      .bpc-callout-lead{background:var(--tile);border:1px solid var(--hair);padding:13px 15px}
      .bpc-callout-q{font-size:13px;font-weight:800;color:var(--ink);margin-bottom:5px}
      .bpc-callout-a{font-size:13px;line-height:1.6;color:var(--ink-2)}
      .bpc-callout-btn{margin-top:12px;background:none;border:none;cursor:pointer;font:inherit;padding:0;
        font-size:11.5px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:var(--ds-blue)}
      .bpc-callout-btn:hover{color:var(--accent-ink)}

      /* centered glass modal over a translucent, blurred scrim */
      .mdl-scrim{position:fixed;inset:0;z-index:200;display:flex;align-items:center;justify-content:center;padding:24px;overflow:hidden;
        background:rgba(32,29,26,.44);backdrop-filter:blur(6px) saturate(1.1);-webkit-backdrop-filter:blur(6px) saturate(1.1);
        animation:kpiRise .16s ease both}
      .mdl{width:min(620px,100%);max-height:min(86vh,860px);
        background:#fff;box-shadow:var(--halo);
        border:1px solid var(--hair);
        display:flex;flex-direction:column;animation:mdlIn .22s cubic-bezier(.2,.7,.3,1) both}
      .mdl-head{background:#fff}
      .mdl.mdl-wide{width:min(1100px,100%);max-height:min(90vh,960px)}
      @keyframes mdlIn{from{transform:translateY(10px) scale(.98);opacity:.5}to{transform:none;opacity:1}}
      .mdl-head{display:flex;align-items:flex-start;gap:14px;padding:20px 24px;border-bottom:1px solid var(--hair);flex:0 0 auto}
      .mdl-eyebrow{font-size:10px;text-transform:uppercase;letter-spacing:.1em;font-weight:800;color:var(--ink-3);margin-bottom:5px}
      .mdl-title{font-size:20px;font-weight:800;color:var(--ink);letter-spacing:-.02em}
      .mdl-x{margin-left:auto;flex:0 0 auto;width:30px;height:30px;border:1px solid var(--hair);
        background:var(--tile);cursor:pointer;font-size:13px;color:var(--ink-2)}
      .mdl-x:hover{background:var(--hair)}
      .mdl-body{padding:22px 24px;overflow-y:auto;flex:1 1 auto;min-height:0;background:#fff}
      /* inner cards stay solid so text reads clearly against the opaque modal */
      .mdl-body .bpc-inf,.mdl-body .bpc-anno,.mdl-body .bpc-qa-row,.mdl-body .drw-metric{
        background:var(--tile);border-color:var(--hair)}
      .mdl-body .bpc-primary{background:var(--accent-tint);border-color:var(--hair)}
      /* contrast: on the modal's light/grey surfaces the faint greys wash out, so
         darken body/detail/evidence text to near-black for legibility */
      .mdl-body .cty-detail,.mdl-body .drw-desc,.mdl-body .bpc-inf-text,.mdl-body .bpc-anno-note,
      .mdl-body .rvw-detail-lg,.mdl-body .bpc-a,.mdl-body .cty-act{color:var(--ink)}
      .mdl-body .cty-ev,.mdl-body .bpc-why,.mdl-body .bpc-intel-note,.mdl-body .cty-why-h,
      .mdl-body .drw-metric-l,.mdl-body .bpc-sub{color:var(--ink-2)}
      .mdl-actions{display:flex;justify-content:flex-end;gap:10px;padding:14px 24px;border-top:1px solid var(--hair);flex:0 0 auto;background:#fff}
      .mdl-actions.mdl-footer{align-items:center}
      .mdl-actions .cty-foot-note{color:var(--ink)}
      .mdl-dl{display:inline-flex;align-items:center;gap:7px;background:var(--ds-blue);color:#fff;border:none;cursor:pointer;
        font:800 11px var(--font);letter-spacing:.05em;text-transform:uppercase;padding:9px 14px}
      .mdl-dl:hover{background:#4a6b9e}
      .mdl-dl:disabled{opacity:.6;cursor:default}
      .drw-desc{margin:0 0 18px;font-size:13.5px;line-height:1.6;color:var(--ink-2)}
      .drw-metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-bottom:20px}
      .drw-metric{background:var(--tile);border:1px solid var(--hair);padding:12px 14px}
      .drw-metric-v{font-size:20px;font-weight:800;color:var(--ink);font-variant-numeric:tabular-nums;letter-spacing:-.01em}
      .drw-metric-u{font-size:12px;color:var(--accent-ink);font-weight:700}
      .drw-metric-l{font-size:9.5px;text-transform:uppercase;letter-spacing:.06em;font-weight:700;color:var(--ink-3);margin-top:3px}
      .drw-sec{border-top:1px solid var(--hair);padding-top:18px}

      /* BPC reasoning blocks (inside the modal) */
      .bpc-sub{margin:0 0 16px;font-size:13px;line-height:1.6;color:var(--ink-3)}
      .bpc-intel-head{display:flex;align-items:center;gap:8px;margin-bottom:8px}
      .bpc-intel-title{font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:var(--ink-2)}
      .bpc-intel-note{margin:0 0 12px;font-size:11.5px;color:var(--ink-4);line-height:1.5}
      .bpc-intel-list{display:flex;flex-direction:column;gap:10px}
      .bpc-inf{background:var(--tile);border:1px solid var(--hair);padding:12px 14px}
      .bpc-inf-text{margin:0;font-size:13px;line-height:1.55;color:var(--ink)}
      .bpc-conf{display:flex;align-items:center;gap:8px;margin-top:9px}
      .bpc-conf-num{font-size:11px;font-weight:800;color:var(--ds-blue);font-variant-numeric:tabular-nums;min-width:34px}
      .bpc-conf-track{flex:1;height:5px;background:var(--paper);border:1px solid var(--hair);overflow:hidden}
      .bpc-conf-fill{display:block;height:100%;background:var(--ds-blue)}
      .bpc-anno{background:var(--tile);border:1px solid var(--hair);padding:12px 14px}
      .bpc-anno-top{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px}
      .bpc-anno-target{font:800 12px var(--mono,ui-monospace,monospace);color:var(--ink);background:var(--paper);
        border:1px solid var(--hair);padding:1px 6px}
      .bpc-tag{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:#fff;
        background:var(--fs-green);padding:2px 7px}
      .bpc-anno-note{font-size:12.5px;color:var(--ink-2);line-height:1.55}
      .bpc-why{margin-top:6px;font-size:12px;color:var(--ink-3);line-height:1.55}
      .bpc-why b{color:var(--ink-2);font-weight:800;margin-right:4px}
      .bpc-qa{display:flex;flex-direction:column;gap:14px}
      .bpc-qa-row{background:var(--tile);border:1px solid var(--hair);padding:14px 16px}
      .bpc-qa-row.withdrawn{opacity:.6;border-style:dashed}
      .bpc-qa-row.withdrawn .bpc-q{text-decoration:line-through;color:var(--ink-4)}
      .bpc-wd{margin-left:9px;font-size:8.5px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;
        color:var(--ds-red);border:1px solid var(--ds-red);padding:2px 6px;text-decoration:none;display:inline-block;vertical-align:middle}
      .bpc-q{font-size:13px;font-weight:800;color:var(--ink);margin-bottom:6px}
      .bpc-a{font-size:13px;line-height:1.65;color:var(--ink-2)}
      .bpc-primary{background:var(--accent-tint);border:1px solid var(--hair);padding:16px 18px;margin-bottom:16px}
      .bpc-primary-tag{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:var(--ds-blue)}
      .bpc-primary-name{font-size:19px;font-weight:800;color:var(--ink);letter-spacing:-.01em;margin-top:3px}
      .bpc-primary-topic{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--ink-3);margin-top:2px}
      .bpc-primary-why{margin:9px 0 0;font-size:13px;line-height:1.6;color:var(--ink-2)}
      .bpc-ranked{display:flex;flex-direction:column;gap:2px}
      .bpc-rank-row{display:flex;align-items:flex-start;gap:14px;padding:13px 0;border-bottom:1px solid var(--hair)}
      .bpc-rank-row:last-child{border-bottom:none}
      .bpc-rank-main{flex:1;min-width:0}
      .bpc-rank-name{font-size:13px;font-weight:800;color:var(--ink)}
      .bpc-rank-topic{font-weight:600;color:var(--ink-3)}
      .bpc-rank-why{font-size:12px;line-height:1.55;color:var(--ink-3);margin-top:3px}
      .bpc-rank-meter{flex:0 0 90px;display:flex;flex-direction:column;gap:4px;align-items:flex-end;padding-top:2px}
      .bpc-rank-num{font-size:13px;font-weight:800;color:var(--ds-blue);font-variant-numeric:tabular-nums}
      .bpc-rank-meter .bpc-conf-track{width:90px;flex:none}
    `}</style>
  );
}

// ---- collapsible section: a header row that expands its content on click ----
// Used to fold secondary blocks (per-layer Presentation on ICU, Deliverables on
// the Presentation page) so the primary info leads and the rest is opt-in.
function Collapsible({ title, count, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="clps" style={{ marginTop: 8 }}>
      <button className={"clps-head" + (open ? " open" : "")} onClick={() => setOpen((o) => !o)}>
        <span className="dot-r" />
        <span className="clps-title">{title}</span>
        {count != null && <span className="clps-count">{count}</span>}
        <span className="clps-chev">{open ? "▾" : "▸"}</span>
      </button>
      {open && <div className="clps-body">{children}</div>}
      <style>{`
        .clps{background:var(--paper);border:1px solid var(--hair);box-shadow:var(--soft)}
        .clps-head{display:flex;align-items:center;gap:9px;width:100%;text-align:left;cursor:pointer;
          background:var(--tile);border:none;border-bottom:1px solid transparent;padding:0 18px;height:46px;
          font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:var(--ink-3)}
        .clps-head.open{border-bottom-color:var(--hair)}
        .clps-head:hover{background:var(--tile-2,var(--hair))}
        .clps-title{color:var(--ink-3)}
        .clps-count{font-size:9.5px;font-weight:800;color:var(--accent-ink);background:var(--accent-tint);padding:2px 7px;letter-spacing:.04em}
        .clps-chev{margin-left:auto;font-size:11px;color:var(--ink-4)}
        .clps-body{padding:18px}
      `}</style>
    </div>
  );
}

// ---- per-layer Presentation: statuses + deliverables (collapsed by default) ----
function LayerPresentation({ layer }) {
  const { config } = useConfig();
  const pres = layer.presentation || {};
  const dels = (pres.deliverables || []).map((id) => config.deliverables.find((d) => d.id === id)).filter(Boolean);
  const statuses = pres.statuses || [];
  if (!statuses.length && !dels.length) return null;

  return (
    <Collapsible title={`${layer.id} - Presentation`} count={dels.length}>
      <div>
        {statuses.length > 0 && (
          <div className="statuses">
            {statuses.map((s) => (
              <div key={s.label} className="status-row">
                <span className={"ms-dot " + (STATE_CLASS[s.state] || "planned")} />
                <span style={{ flex: 1, fontSize: 12.5, color: "var(--ink-2)" }}>{s.label}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>{s.value}</span>
              </div>
            ))}
          </div>
        )}
        {dels.length > 0 && (
          <div className="grid g2" style={{ marginTop: statuses.length ? 16 : 0 }}>
            {dels.map((d) => (
              <div key={d.id} className="deliv-tile">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="chip accent">{d.code}</span>
                  {groupTag(d) && <span className="dlv-grp">{groupTag(d)}</span>}
                  <b style={{ fontSize: 12.5 }}>{d.name}</b>
                  <span className={"st " + (STATE_CLASS[d.status] || "planned")} style={{ marginLeft: "auto" }}>{d.status}</span>
                </div>
                <p style={{ margin: "8px 0", fontSize: 12, color: "var(--ink-3)" }}>{d.purpose}</p>
                {d.artifact
                  ? <a className="btn primary" href={d.artifact} target="_blank" rel="noreferrer" style={{ height: 30 }}>Open</a>
                  : d.status !== "delivered"
                    ? <span className="chip">{d.status === "in-progress" ? "In progress" : "Not yet delivered"}</span>
                    : null}
              </div>
            ))}
          </div>
        )}
      </div>
      <style>{`
        .statuses{display:grid;gap:2px}
        .status-row{display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--hair)}
        .status-row:last-child{border-bottom:none}
        .ms-dot{width:9px;height:9px;border-radius:0;flex:0 0 auto;background:var(--ds-yellow);border:1px solid var(--grid-line)}
        .ms-dot.delivered{background:var(--fs-green)}
        .ms-dot.in-progress{background:var(--ds-blue)}
        .deliv-tile{border:var(--grid-w) solid var(--grid-line);padding:13px;background:var(--paper);box-shadow:var(--soft)}
        .dlv-grp{font-size:8.5px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:var(--ink-3);
          border:1px solid var(--line-strong);border-radius:999px;padding:1px 6px;flex:0 0 auto}
      `}</style>
    </Collapsible>
  );
}

// ---- "currently working on" tag: a slim inline strip that ties the layer's
// work to the deliverable(s) it produces. Spotlights the active deliverable as
// a tag; any others in the layer trail after as small code chips. Deliberately
// compact - a tag row, not a section.
const STATUS_WORD = { "in-progress": "In progress", delayed: "Delayed", planned: "Not started", delivered: "Delivered", certified: "Certified" };
// mirrors fs_certify so the callout re-renders when the Baseline is signed off
function useCertified() {
  const read = () => { try { return JSON.parse(localStorage.getItem("fs_certify") || "{}"); } catch { return {}; } };
  const [c, setC] = useState(read);
  useEffect(() => {
    const on = () => setC(read());
    window.addEventListener("fs_certify_sync", on);
    return () => window.removeEventListener("fs_certify_sync", on);
  }, []);
  return c;
}
function WorkingOn({ layerKey }) {
  const { config, canSubpart } = useConfig();
  const layer = config.layers.find((l) => l.key === layerKey);
  const [colState] = useReviewState("collection");
  const [uniState] = useReviewState("unification");
  const certified = useCertified();
  const dels = (config.deliverables || []).filter((d) => d.layer === layerKey);
  if (!dels.length) return null;

  // live status per deliverable, derived from what the human has done on the page
  const liveStatus = (d) => {
    if (layerKey === "collection") {
      // Collection's deliverable is delivered once every reviewable sub-part is certified
      const rev = (layer?.subparts || []).filter((s) => s.review && canSubpart(s.id));
      if (rev.length && rev.every((s) => colState[s.id]?.certified)) return "delivered";
      if (rev.some((s) => colState[s.id]?.certified)) return "in-progress";
      return d.status;
    }
    if (layerKey === "unification") {
      // the Baseline sign-off certifies D3, D4, D5 together
      if (certified.unification) return "certified";
      // otherwise map each deliverable to its track's progress
      const rv = layer?.review;
      const trackDone = (type) => {
        const t = (rv?.tracks || []).find((x) => x.type === type);
        if (!t) return false;
        const all = [...t.items, ...(uniState[`__added_${t.id}`]?.items || [])];
        return all.length > 0 && all.every((i) => uniState[i.id]?.decision);
      };
      const map = { D3: "lineage", D4: "classification" };
      if (map[d.code] && trackDone(map[d.code])) return "delivered";
      const anyWork = (rv?.tracks || []).some((t) =>
        [...t.items, ...(uniState[`__added_${t.id}`]?.items || [])].some((i) => uniState[i.id]?.decision));
      return anyWork ? "in-progress" : d.status;
    }
    return d.status;
  };

  const withStatus = dels.map((d) => ({ ...d, live: liveStatus(d) }));
  const isDone = (s) => s === "delivered" || s === "certified";
  // spotlight the one being worked: in-progress > not-done config-active > first not done > last
  const active = withStatus.find((d) => d.live === "in-progress")
    || withStatus.find((d) => d.live === "delayed" && !isDone(d.live))
    || withStatus.find((d) => !isDone(d.live))
    || withStatus[withStatus.length - 1];
  const others = withStatus.filter((d) => d.id !== active.id);
  return (
    <div className="won" title={active.purpose + (active.delayReason ? " — " + active.delayReason : "")}>
      <span className="won-eye">{isDone(active.live) ? "Done in this layer" : "Working on"}</span>
      <span className={"won-status " + (STATE_CLASS[active.live] || active.live)}>{STATUS_WORD[active.live] || active.live}</span>
      <b className="won-code">{active.code}</b>
      <span className="won-name">{active.name}</span>
      {others.length > 0 && (
        <span className="won-rest">
          {others.map((d) => (
            <span key={d.id} className="won-rest-item" title={d.name + " · " + (STATUS_WORD[d.live] || d.live)}>
              <span className={"won-dot " + (STATE_CLASS[d.live] || d.live)} />{d.code}
            </span>
          ))}
        </span>
      )}
      <style>{`
        .won{display:inline-flex;align-items:center;gap:10px;flex-wrap:wrap;
          margin:0 0 18px;padding:6px 12px 6px 6px;border:1px solid var(--hair);background:var(--paper)}
        .won-eye{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:var(--ink-4);
          background:var(--tile);padding:4px 8px}
        .won-status{font-size:8.5px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;padding:2px 7px;
          border:1px solid var(--hair);color:var(--ink-3)}
        .won-status.in-progress{color:var(--ds-blue);border-color:var(--ds-blue)}
        .won-status.delayed,.won-status.planned{color:var(--ds-yellow);border-color:var(--ds-yellow)}
        .won-status.delivered,.won-status.certified{color:var(--fs-green);border-color:var(--fs-green)}
        .won-code{font:800 12px var(--mono,ui-monospace,monospace);color:var(--ink)}
        .won-name{font-size:12.5px;font-weight:700;color:var(--ink-2)}
        .won-rest{display:inline-flex;align-items:center;gap:8px;padding-left:10px;margin-left:2px;border-left:1px solid var(--hair)}
        .won-rest-item{display:inline-flex;align-items:center;gap:5px;font:800 10.5px var(--mono,ui-monospace,monospace);color:var(--ink-3)}
        .won-dot{width:7px;height:7px;flex:0 0 auto;background:var(--ds-yellow);border:1px solid var(--grid-line)}
        .won-dot.delivered,.won-dot.certified{background:var(--fs-green)}
        .won-dot.in-progress{background:var(--ds-blue)}
        .won-dot.planned{background:var(--paper)}
      `}</style>
    </div>
  );
}

export default function LayerPage() {
  const { key } = useParams();
  const nav = useNavigate();
  const { config, canLayer, canSubpart } = useConfig();
  // Collection review state is lifted here so the sub-parts, the trust markers,
  // and the "what the data means" gate all read the same certification status.
  const [colState, colSet, colReset] = useReviewState("collection");
  const layer = config.layers.find((l) => l.key === key);
  if (!layer) return <p className="lede">Unknown layer.</p>;

  // The Presentation layer is the packaged, decision-maker view - it replaces
  // the generic layer layout with the full assessment presentation.
  if (key === "presentation") return <Presentation />;

  const layers = config.layers;
  const idx = layers.findIndex((l) => l.key === key);
  const next = layers.slice(idx + 1).find((l) => canLayer(l.key));

  // Collection: interpretation is the OUTPUT of certification. Until every
  // reviewable sub-part is certified, "what the data means" stays locked.
  const colReviewable = key === "collection"
    ? (layer.subparts || []).filter((s) => s.review && canSubpart(s.id)) : [];
  const colAllCertified = colReviewable.length > 0 && colReviewable.every((s) => colState[s.id]?.certified);
  // findings the human EXCLUDED during certification - the interpretation below
  // is scoped to the accepted set, so we surface what was dropped from it
  const colExcluded = colReviewable.flatMap((s) => {
    const disp = colState[s.id]?.disp || {};
    return (s.review.items || []).filter((it) => disp[it.id] === "excluded")
      .map((it) => ({ id: it.id, subpart: s.name, label: it.label, detail: it.detail }));
  });
  const excludedIds = new Set(colExcluded.map((e) => e.id));

  return (
    <div>
      <BpcStyles />
      <ReviewStyles />
      <div className="page-hd">
        <h1 className="page">{layer.name}</h1>
        <StageOwner variant={key === "infrastructure" ? "infra" : undefined} />
      </div>

      {(key === "collection" || key === "unification") && <WorkingOn layerKey={key} />}

      {key === "infrastructure" && (canSubpart("infra-connections")
        ? <InfraConnections />
        : <div className="rvw-scoped">Connection setup is handled by the Data Engineer role. Switch roles to configure connections.</div>)}
      {/* Unification's work now lives in the review tracks below, so the static
          sub-part status rows are dropped there to avoid duplicating them. */}
      {key !== "infrastructure" && key !== "unification" &&
        <SubParts layer={layer} review={key === "collection"}
          reviewState={key === "collection" ? colState : undefined}
          reviewSet={key === "collection" ? colSet : undefined}
          onReset={key === "collection" ? colReset : undefined} />}

      {key === "unification" && <UnificationReviewSection layer={layer} />}

      {key === "collection" && layer.meaning && (
        colAllCertified
          ? <BpcMeaningCallout meaning={layer.meaning} excluded={colExcluded} excludedIds={excludedIds} />
          : <MeaningLocked done={colReviewable.filter((s) => colState[s.id]?.certified).length} total={colReviewable.length} />
      )}
      {key === "unification" && layer.topSignal && <BpcSignalCallout signal={layer.topSignal} />}

      <LayerPresentation layer={layer} />

      {next && (
        <div style={{ marginTop: 24 }}>
          <button className="btn primary" onClick={() => nav(`/layer/${next.key}`)}>Next · {next.name}</button>
        </div>
      )}
    </div>
  );
}
