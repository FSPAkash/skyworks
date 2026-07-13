import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useConfig } from "../config.jsx";
import Presentation from "./Presentation.jsx";
import { downloadBpcPdf } from "../pdfReport.js";

const KIND_LABEL = { db: "Database", erp: "ERP", crm: "CRM", mail: "Mail", cloud: "Cloud", llm: "LLM", external: "External" };
const STATE_CLASS = { delivered: "delivered", "in-progress": "in-progress", planned: "planned" };

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

// ---- Infrastructure: all connections split Sources / Cloud / LLM + meters ----
function InfraConnections() {
  const { sources, setBotOpen } = useConfig();
  const cats = ["sources", "cloud", "llm"];
  const catMeta = sources.categories || {};
  const meters = sources.meters || [];
  const hasAny = (sources.targets || []).length > 0;

  return (
    <div>
      {!hasAny && (
        <div className="gate" style={{ marginBottom: 16 }}>
          <div className="g-ic">?</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, color: "var(--green-ink)", fontSize: 15 }}>No connections yet</div>
            <div style={{ fontSize: 13, color: "var(--ink-2)" }}>Use the Genie to pick the sources to connect, or run the demo.</div>
          </div>
          <button className="btn primary" onClick={() => setBotOpen(true)}>Open Genie</button>
        </div>
      )}

      {cats.map((cat) => {
        const cm = catMeta[cat];
        if (!cm || cm.total === 0) return null;
        const targets = (sources.targets || []).filter((t) => t.category === cat);
        const cMeters = meters.filter((m) => m.category === cat);
        const complete = cm.connected === cm.total;
        return (
          <div key={cat} className="card" style={{ marginBottom: 14 }}>
            <div className="card-head">
              <span className="chip accent">{cm.label}</span>
              <span className={"conncount " + (complete ? "ok" : cm.connected ? "part" : "none")}>
                {cm.connected}/{cm.total} · connected
              </span>
            </div>
            <div className="card-body" style={{ padding: 12 }}>
              {/* meters */}
              {cMeters.length > 0 && (
                <div className="meters">
                  {cMeters.map((m) => (
                    <div key={m.label} className="meter">
                      <div className="meter-top"><span>{m.label}</span><b>{m.value}{m.unit}</b></div>
                      <div className="meter-track"><div className="meter-fill" style={{ width: `${m.value}%` }} /></div>
                      <div className="meter-detail">{m.detail}</div>
                    </div>
                  ))}
                </div>
              )}
              {/* connections */}
              {targets.map((t) => <ConnForm key={t.id} target={t} />)}
            </div>
          </div>
        );
      })}

      <style>{`
        .conncount{margin-left:auto;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;
          padding:3px 9px;border-radius:0;border:1.5px solid var(--grid-line)}
        .conncount.ok{color:#fff;background:var(--fs-green)}
        .conncount.part{color:var(--ink);background:var(--paper)}
        .conncount.none{color:var(--ink-3);background:var(--paper)}
        /* meters: geometric framed cells with elevation */
        .meters{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px}
        @media(max-width:720px){.meters{grid-template-columns:1fr}}
        .meter{background:var(--paper);border:var(--grid-w) solid var(--grid-line);padding:12px 14px;box-shadow:var(--soft)}
        .meter-top{display:flex;justify-content:space-between;align-items:baseline;font-size:11px;color:var(--ink-2);font-weight:700}
        .meter-top b{font-size:14px;color:var(--ink);font-variant-numeric:tabular-nums}
        .meter-track{height:8px;background:var(--paper);border:var(--grid-w) solid var(--grid-line);margin:8px 0 5px;overflow:hidden}
        .meter-fill{height:100%;background:var(--fs-green)}
        .meter-detail{font-size:10.5px;color:var(--ink-3)}
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
function Modal({ open, onClose, title, eyebrow, onDownload, children }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="mdl-scrim" onClick={onClose}>
      <div className="mdl" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="mdl-head">
          <div>
            {eyebrow && <div className="mdl-eyebrow">{eyebrow}</div>}
            <div className="mdl-title">{title}</div>
          </div>
          <button className="mdl-x" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="mdl-body">{children}</div>
        {onDownload && (
          <div className="mdl-actions">
            <button className="mdl-dl" onClick={onDownload}>↓ Download PDF</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---- group label: an eyebrow that separates the operational rows from the
// BPC-authored intelligence, so the two kinds of content read distinctly ----
function GroupLabel({ children, accent }) {
  return <div className={"grp-label" + (accent ? " accent" : "")}>{children}</div>;
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
      <div className="bpc-intel-head">
        <span className="bpc-badge">BPC</span>
        <span className="bpc-intel-title">{intel.title}</span>
      </div>
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
function BpcMeaningBody({ meaning }) {
  if (!meaning || !(meaning.questions || []).length) return null;
  return (
    <div>
      {meaning.subtitle && <p className="bpc-sub">{meaning.subtitle}</p>}
      <div className="bpc-qa">
        {meaning.questions.map((q, i) => (
          <div key={i} className="bpc-qa-row">
            <div className="bpc-q">{q.q}</div>
            <div className="bpc-a">{q.a}</div>
          </div>
        ))}
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
// full metrics and the BPC reasoning so the page never gets busy.
function SubParts({ layer }) {
  const { canSubpart } = useConfig();
  const [openId, setOpenId] = useState(null);
  const parts = (layer.subparts || []).filter((s) => canSubpart(s.id));
  if (parts.length === 0) return null;
  const active = parts.find((s) => s.id === openId);

  return (
    <div className="splist" style={{ marginBottom: 20 }}>
      {parts.map((s) => {
        const hasDetail = s.desc || (s.metrics || []).length > 2 || s.intel;
        return (
          <button key={s.id} className="sprow" onClick={() => hasDetail && setOpenId(s.id)} disabled={!hasDetail}>
            <span className="sprow-name">{s.name}</span>
            <MetricStrip metrics={s.metrics} max={3} />
            {s.intel && <span className="sprow-bpc">BPC</span>}
            {s.state && <span className={"st " + (STATE_CLASS[s.state] || "planned")}>{s.state}</span>}
            {hasDetail && <span className="sprow-chev">›</span>}
          </button>
        );
      })}

      <Modal
        open={!!active}
        onClose={() => setOpenId(null)}
        eyebrow={layer.name + " · sub-part"}
        title={active?.name}
        onDownload={active?.intel ? () => downloadBpcPdf({
          kind: "intel", data: active.intel, title: active.name,
          eyebrow: active.intel.title, context: layer.name + " · sub-part",
        }) : undefined}>
        {active && (
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
        )}
      </Modal>
    </div>
  );
}

// ---- "What does the data mean?" callout: headline answer on the page,
// full Q&A in a modal. Important info is called out, then elaborated. ----
function BpcMeaningCallout({ meaning }) {
  const [open, setOpen] = useState(false);
  if (!meaning || !(meaning.questions || []).length) return null;
  const lead = meaning.questions[0];
  const more = meaning.questions.length - 1;
  return (
    <div className="bpc-callout" style={{ marginBottom: 20 }}>
      <div className="bpc-callout-head">
        <span className="bpc-badge">BPC</span>
        <span className="bpc-callout-title">{meaning.title}</span>
        {meaning.author && <span className="bpc-callout-author">{meaning.author}</span>}
      </div>
      <div className="bpc-callout-lead">
        <div className="bpc-callout-q">{lead.q}</div>
        <div className="bpc-callout-a">{lead.a}</div>
      </div>
      {more > 0 && (
        <button className="bpc-callout-btn" onClick={() => setOpen(true)}>
          Full analysis · {more} more {more === 1 ? "answer" : "answers"} ›
        </button>
      )}
      <Modal open={open} onClose={() => setOpen(false)}
        eyebrow={meaning.author || "BPC · Business Process Co-Pilot"} title={meaning.title}
        onDownload={() => downloadBpcPdf({
          kind: "meaning", data: meaning, title: meaning.title,
          eyebrow: meaning.author || "BPC · Business Process Co-Pilot",
        })}>
        <BpcMeaningBody meaning={meaning} />
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
      <div className="bpc-callout-head">
        <span className="bpc-badge">BPC</span>
        <span className="bpc-callout-title">{signal.title}</span>
        {signal.author && <span className="bpc-callout-author">{signal.author}</span>}
      </div>
      {signal.subtitle && <p className="bpc-callout-sub">{signal.subtitle}</p>}
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
        eyebrow={signal.author || "BPC · Business Process Co-Pilot"} title={signal.title}
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
      .sprow-chev{margin-left:auto;font-size:20px;font-weight:800;color:var(--ink-4);flex:0 0 auto;line-height:1}
      .sprow:disabled .sprow-chev{display:none}
      /* inline metric strip in the row header */
      .mstrip{display:flex;align-items:baseline;gap:18px;flex:1;min-width:0;flex-wrap:wrap}
      .mstrip-item{display:flex;align-items:baseline;gap:6px;white-space:nowrap}
      .mstrip-item b{font-size:15px;font-weight:800;color:var(--ink);font-variant-numeric:tabular-nums;letter-spacing:-.01em}
      .mstrip-item b i{font-size:10px;color:var(--accent-ink);font-style:normal;font-weight:700}
      .mstrip-item>span{font-size:9.5px;text-transform:uppercase;letter-spacing:.06em;font-weight:700;color:var(--ink-3)}
      @media(max-width:720px){.sprow{flex-wrap:wrap;gap:10px}.mstrip{width:100%}}

      /* BPC callout: important insight visible on the page, detail in a modal */
      .bpc-callout{background:var(--paper);border:1px solid var(--hair);box-shadow:var(--soft);
        border-top:3px solid var(--ds-blue);padding:16px 18px 18px}
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
      .mdl-scrim{position:fixed;inset:0;z-index:200;display:flex;align-items:center;justify-content:center;padding:24px;
        background:rgba(32,29,26,.30);backdrop-filter:blur(5px) saturate(1.1);-webkit-backdrop-filter:blur(5px) saturate(1.1);
        animation:kpiRise .16s ease both}
      .mdl{width:min(620px,100%);max-height:min(86vh,860px);
        background:rgba(255,255,255,.72);backdrop-filter:blur(22px) saturate(1.5);-webkit-backdrop-filter:blur(22px) saturate(1.5);
        border:1px solid rgba(255,255,255,.6);box-shadow:var(--halo);
        display:flex;flex-direction:column;animation:mdlIn .22s cubic-bezier(.2,.7,.3,1) both}
      @keyframes mdlIn{from{transform:translateY(10px) scale(.98);opacity:.5}to{transform:none;opacity:1}}
      .mdl-head{display:flex;align-items:flex-start;gap:14px;padding:20px 24px;border-bottom:1px solid rgba(255,255,255,.55);flex:0 0 auto}
      .mdl-eyebrow{font-size:10px;text-transform:uppercase;letter-spacing:.1em;font-weight:800;color:var(--ink-3);margin-bottom:5px}
      .mdl-title{font-size:20px;font-weight:800;color:var(--ink);letter-spacing:-.02em}
      .mdl-x{margin-left:auto;flex:0 0 auto;width:30px;height:30px;border:1px solid rgba(255,255,255,.7);
        background:rgba(255,255,255,.55);cursor:pointer;font-size:13px;color:var(--ink-2)}
      .mdl-x:hover{background:rgba(255,255,255,.85)}
      .mdl-body{padding:22px 24px;overflow-y:auto}
      /* inside the glass modal, inner cards use translucent white so blur reads through */
      .mdl-body .bpc-inf,.mdl-body .bpc-anno,.mdl-body .bpc-qa-row,.mdl-body .drw-metric{
        background:rgba(255,255,255,.5);border-color:rgba(255,255,255,.6)}
      .mdl-body .bpc-primary{background:rgba(237,244,225,.6);border-color:rgba(255,255,255,.6)}
      .mdl-actions{display:flex;justify-content:flex-end;gap:10px;padding:14px 24px;border-top:1px solid rgba(255,255,255,.55);flex:0 0 auto}
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
    <Collapsible title="Presentation" count={statuses.length + dels.length}>
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
      `}</style>
    </Collapsible>
  );
}

export default function LayerPage() {
  const { key } = useParams();
  const nav = useNavigate();
  const { config, canLayer } = useConfig();
  const layer = config.layers.find((l) => l.key === key);
  if (!layer) return <p className="lede">Unknown layer.</p>;

  // The Presentation layer is the packaged, decision-maker view - it replaces
  // the generic layer layout with the full assessment presentation.
  if (key === "presentation") return <Presentation />;

  const layers = config.layers;
  const idx = layers.findIndex((l) => l.key === key);
  const next = layers.slice(idx + 1).find((l) => canLayer(l.key));

  return (
    <div>
      <BpcStyles />
      <h1 className="page">{layer.name}</h1>
      <p className="lede">{layer.summary}</p>

      {key === "infrastructure"
        ? <InfraConnections />
        : <>
            <GroupLabel>Sub-parts · what the team collected</GroupLabel>
            <SubParts layer={layer} />
          </>}

      {(key === "collection" && layer.meaning) || (key === "unification" && layer.topSignal) ? (
        <>
          <GroupLabel accent>
            BPC Intelligence · what the co-pilot concluded
          </GroupLabel>
          {key === "collection" && <BpcMeaningCallout meaning={layer.meaning} />}
          {key === "unification" && <BpcSignalCallout signal={layer.topSignal} />}
        </>
      ) : null}

      <LayerPresentation layer={layer} />

      {next && (
        <div style={{ marginTop: 24 }}>
          <button className="btn primary" onClick={() => nav(`/layer/${next.key}`)}>Next · {next.name}</button>
        </div>
      )}
    </div>
  );
}
