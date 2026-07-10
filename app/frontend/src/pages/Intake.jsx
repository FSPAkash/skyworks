import { useState } from "react";
import { useConfig, connReadiness, layerConnStatus } from "../config.jsx";

const KIND_LABEL = { db: "Database", erp: "ERP", crm: "CRM", mail: "Mail", external: "External" };

function ConnForm({ target }) {
  const { saveConnection, testConnection } = useConfig();
  const conn = target.connection;
  const [values, setValues] = useState(() => {
    // start from saved values, else seed realistic prefills so it looks real
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
    <div className="conn">
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

export default function Intake() {
  const { config, sources, setBotOpen } = useConfig();
  const r = connReadiness(sources);
  const pullLayers = config.layers.filter((l) => sources.layers?.[l.key]);

  return (
    <div>
      <div className="eyebrow"><span className="bar" /> Connections</div>
      <h1 className="page">Connections</h1>

      {!r.hasSelection ? (
        <div className="gate">
          <div className="g-ic">?</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, color: "var(--green-ink)", fontSize: 15 }}>No sources selected yet</div>
            <div style={{ fontSize: 13, color: "var(--ink-2)" }}>Use the Genie to pick the sources to connect.</div>
          </div>
          <button className="btn primary" onClick={() => setBotOpen(true)}>Open Genie</button>
        </div>
      ) : (
        <div className="gate">
          <div className="g-ic">{r.complete ? "OK" : "!"}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, color: "var(--green-ink)", fontSize: 15 }}>
              {r.complete ? "All sources connected" : "Connections pending"}
            </div>
            <div style={{ fontSize: 13, color: "var(--ink-2)" }}>{r.connected} / {r.total} connected.</div>
          </div>
          <button className="btn" onClick={() => setBotOpen(true)}>Edit sources</button>
        </div>
      )}

      {pullLayers.map((l) => {
        const s = layerConnStatus(sources, l.key);
        const targets = sources.targets.filter((t) => t.layer === l.key);
        return (
          <div key={l.key} id={`conn-${l.key}`} className="card" style={{ marginBottom: 14 }}>
            <div className="card-head">
              <span className="chip accent">{l.id}</span> {l.name}
              <span className={"st " + (s.complete ? "delivered" : s.connected ? "in-progress" : "planned")} style={{ marginLeft: "auto" }}>
                {s.connected}/{s.total}
              </span>
            </div>
            <div className="card-body" style={{ padding: 10 }}>
              {targets.map((t) => <ConnForm key={t.id} target={t} />)}
            </div>
          </div>
        );
      })}

      <style>{`
        .conn{border:1px solid var(--hair);margin-bottom:8px;border-radius:0;overflow:hidden;background:var(--paper)}
        .conn-head{display:flex;align-items:center;gap:11px;padding:11px 13px;cursor:pointer}
        .conn-head:hover{background:var(--tile)}
        .cdot{width:9px;height:9px;flex:0 0 auto;border-radius:50%}
        .cdot.connected{background:var(--ok)}
        .cdot.configured{background:var(--warn)}
        .cdot.not-configured,.cdot.error{background:var(--line-strong)}
        .conn-src{font-weight:800;color:var(--ink);min-width:120px}
        .conn-status-txt{font-size:11.5px;color:var(--ink-3);flex:1}
        .conn-toggle{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:var(--green-ink)}
        .conn-body{border-top:1px solid var(--hair);padding:14px;background:var(--tile)}
        .conn-fields{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        @media(max-width:820px){.conn-fields{grid-template-columns:1fr}}
        .fld{display:flex;flex-direction:column;gap:4px}
        .fld-lbl{font-size:10.5px;text-transform:uppercase;letter-spacing:.07em;font-weight:800;color:var(--ink-3)}
        .fld-lbl i{color:var(--err);font-style:normal}
        .fld input,.fld select{height:34px;border:1px solid var(--hair);padding:0 10px;font:600 12.5px var(--font);background:var(--paper);color:var(--ink);border-radius:0}
        .fld input:focus,.fld select:focus{outline:none;border-color:var(--fs-green);box-shadow:0 0 0 3px var(--accent-tint)}
        .fld-hint{font-size:10.5px;color:var(--ink-4)}
        .conn-actions{display:flex;gap:8px;margin-top:14px}
        .conn-result{margin-top:12px;padding:9px 12px;font-size:12px;font-weight:700;border:1px solid;border-radius:0}
        .conn-result.ok{color:var(--ok);border-color:var(--green-soft);background:var(--ok-soft)}
        .conn-result.err{color:var(--err);border-color:var(--err);background:var(--err-soft)}
      `}</style>
    </div>
  );
}
