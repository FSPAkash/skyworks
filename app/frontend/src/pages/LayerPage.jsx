import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useConfig } from "../config.jsx";

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

// ---- sub-part metrics: mocked numbers so a box is never just a titled line ----
function SubMetrics({ metrics }) {
  if (!metrics || !metrics.length) return null;
  return (
    <div className="submetrics">
      {metrics.map((m) => (
        <div key={m.label} className="sm">
          <div className="sm-v">{m.value}{m.unit && <span className="sm-u"> {m.unit}</span>}</div>
          <div className="sm-l">{m.label}</div>
        </div>
      ))}
    </div>
  );
}

// ---- generic sub-part grid (role-gated) ----
function SubParts({ layer }) {
  const { canSubpart } = useConfig();
  const parts = (layer.subparts || []).filter((s) => canSubpart(s.id));
  if (parts.length === 0) return null;
  return (
    <div className="grid g2" style={{ marginBottom: 20 }}>
      {parts.map((s) => (
        <div key={s.id} className="card">
          <div className="card-head">
            {s.name}
            {s.state && <span className={"st " + (STATE_CLASS[s.state] || "planned")} style={{ marginLeft: "auto" }}>{s.state}</span>}
          </div>
          <div className="card-body">
            <p style={{ margin: 0, fontSize: 13, color: "var(--ink-2)", lineHeight: 1.55 }}>{s.desc}</p>
            <SubMetrics metrics={s.metrics} />
          </div>
        </div>
      ))}
      <style>{`
        .submetrics{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px;padding-top:14px;border-top:var(--grid-w) solid var(--grid-line)}
        .sm{background:var(--paper);border:var(--grid-w) solid var(--grid-line);padding:9px 11px;box-shadow:var(--soft)}
        .sm-v{font-size:17px;font-weight:800;color:var(--ink);letter-spacing:-.01em;font-variant-numeric:tabular-nums}
        .sm-u{font-size:11px;font-weight:700;color:var(--accent-ink)}
        .sm-l{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--ink-3);margin-top:2px}
      `}</style>
    </div>
  );
}

// ---- per-layer Presentation: statuses + deliverables ----
function LayerPresentation({ layer }) {
  const { config } = useConfig();
  const pres = layer.presentation || {};
  const dels = (pres.deliverables || []).map((id) => config.deliverables.find((d) => d.id === id)).filter(Boolean);
  const statuses = pres.statuses || [];
  if (!statuses.length && !dels.length) return null;

  return (
    <div className="card" style={{ marginTop: 8 }}>
      <div className="card-head"><span className="dot-r" /> Presentation</div>
      <div className="card-body">
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
    </div>
  );
}

export default function LayerPage() {
  const { key } = useParams();
  const nav = useNavigate();
  const { config, canLayer } = useConfig();
  const layer = config.layers.find((l) => l.key === key);
  if (!layer) return <p className="lede">Unknown layer.</p>;

  const layers = config.layers;
  const idx = layers.findIndex((l) => l.key === key);
  const next = layers.slice(idx + 1).find((l) => canLayer(l.key));

  return (
    <div>
      <div className="eyebrow"><span className="bar" /> {layer.name}</div>
      <h1 className="page">{layer.name}</h1>
      <p className="lede">{layer.summary}</p>

      {key === "infrastructure"
        ? <InfraConnections />
        : <SubParts layer={layer} />}

      <LayerPresentation layer={layer} />

      {next && (
        <div style={{ marginTop: 24 }}>
          <button className="btn primary" onClick={() => nav(`/layer/${next.key}`)}>Next · {next.name}</button>
        </div>
      )}
    </div>
  );
}
