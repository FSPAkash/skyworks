import { useState } from "react";
import { useConfig } from "../config.jsx";

const BLANK_FORM = {
  name: "", engagement: "", framework: "Assessment",
  durationWeeks: "", activeWeeks: "", acceptanceWeeks: "",
  headline: "", background: "", outcome: "",
  highlights: [
    { label: "", value: "", unit: "" },
    { label: "", value: "", unit: "" },
    { label: "", value: "", unit: "" },
    { label: "", value: "", unit: "" },
  ],
  alignmentLabel: "Assessment progress", alignmentCurrent: "", alignmentTarget: "100",
};

export default function Admin() {
  const { profiles, profile, createProfile, createFromForm, deleteProfile, uploadSow } = useConfig();
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null);
  const [sowFile, setSowFile] = useState(null);
  const [sowName, setSowName] = useState("");
  const [sowResult, setSowResult] = useState(null);
  const [form, setForm] = useState(BLANK_FORM);
  const [formResult, setFormResult] = useState(null);
  const setF = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const setHl = (i, k, v) => setForm((p) => ({ ...p, highlights: p.highlights.map((h, j) => j === i ? { ...h, [k]: v } : h) }));

  const doForm = async () => {
    if (!form.name.trim()) { setFormResult({ ok: false, error: "Client / project name is required." }); return; }
    setBusy(true); setFormResult(null);
    const out = await createFromForm(form);
    setBusy(false); setFormResult(out);
    if (out.ok) setForm(BLANK_FORM);
  };

  const onJson = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMsg(null);
    let json;
    try { json = JSON.parse(await file.text()); }
    catch { setMsg({ ok: false, text: "Not valid JSON." }); return; }
    setPreview({ name: file.name, client: json?.client?.name, deliverables: json?.deliverables?.length, json });
  };
  const doCreate = async () => {
    if (!preview) return;
    setBusy(true);
    const out = await createProfile(preview.json);
    setBusy(false);
    if (out.ok) { setMsg({ ok: true, text: `Profile "${out.name}" saved.` }); setPreview(null); }
    else setMsg({ ok: false, text: out.error || "Failed." });
  };

  const onSow = (e) => { setSowFile(e.target.files?.[0] || null); setSowResult(null); };
  const doSow = async () => {
    if (!sowFile) return;
    setBusy(true); setSowResult(null);
    const out = await uploadSow(sowFile, sowName.trim());
    setBusy(false);
    setSowResult(out);
    if (out.ok) { setSowFile(null); setSowName(""); }
  };

  const doDelete = async (id, name) => {
    setBusy(true);
    const out = await deleteProfile(id);
    setBusy(false);
    setMsg(out.ok ? { ok: true, text: `Deleted "${name}".` } : { ok: false, text: out.error });
  };

  const clients = profiles.filter((p) => p.mode !== "generic");

  return (
    <div>
      <div className="eyebrow"><span className="bar" /> Admin Settings</div>
      <h1 className="page">Admin Settings</h1>

      {/* Upload SOW - primary path */}
      <div className="card hi" style={{ marginBottom: 16 }}>
        <div className="card-head"><span className="dot-r" /> Upload SOW</div>
        <div className="card-body">
          <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--ink-2)" }}>
            Upload a Statement of Work PDF. Engagement, deliverables, and systems are extracted to build the overview. No financial figures are read or shown.
          </p>
          <div className="admin-fields">
            <input type="file" accept="application/pdf,.pdf" onChange={onSow} className="file-in" />
            <input className="admin-in" placeholder="Project name (optional)" value={sowName} onChange={(e) => setSowName(e.target.value)} />
            <button className="btn primary" onClick={doSow} disabled={!sowFile || busy}>{busy ? "Reading…" : "Build from SOW"}</button>
          </div>
          {sowResult && (
            <div className={"admin-msg " + (sowResult.ok ? "ok" : "err")}>
              {sowResult.ok
                ? `Built "${sowResult.name}" — ${sowResult.parsed.deliverables} deliverables${sowResult.parsed.systems?.length ? `, systems: ${sowResult.parsed.systems.join(", ")}` : ""}${sowResult.parsed.weeks ? `, ${sowResult.parsed.weeks} weeks` : ""}.`
                : sowResult.error}
            </div>
          )}
        </div>
      </div>

      {/* Manual overview form - works with no SOW / no JSON */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-head"><span className="dot-r" /> Enter project details</div>
        <div className="card-body">
          <p style={{ margin: "0 0 14px", fontSize: 13, color: "var(--ink-2)" }}>
            No SOW or JSON? Fill the Overview details by hand. Only the client / project name is required.
          </p>

          <div className="form-sec">Basics</div>
          <div className="form-grid">
            <label className="ff"><span>Client / project name *</span>
              <input className="admin-in" value={form.name} onChange={(e) => setF("name", e.target.value)} placeholder="Acme Corp" /></label>
            <label className="ff"><span>Engagement</span>
              <input className="admin-in" value={form.engagement} onChange={(e) => setF("engagement", e.target.value)} placeholder="Data Estate Assessment" /></label>
            <label className="ff"><span>Framework</span>
              <input className="admin-in" value={form.framework} onChange={(e) => setF("framework", e.target.value)} placeholder="Assessment" /></label>
          </div>
          <div className="form-grid">
            <label className="ff"><span>Duration (weeks)</span>
              <input className="admin-in" type="number" value={form.durationWeeks} onChange={(e) => setF("durationWeeks", e.target.value)} placeholder="12" /></label>
            <label className="ff"><span>Active weeks</span>
              <input className="admin-in" type="number" value={form.activeWeeks} onChange={(e) => setF("activeWeeks", e.target.value)} placeholder="10" /></label>
            <label className="ff"><span>Acceptance weeks</span>
              <input className="admin-in" type="number" value={form.acceptanceWeeks} onChange={(e) => setF("acceptanceWeeks", e.target.value)} placeholder="2" /></label>
          </div>

          <div className="form-sec">Narrative</div>
          <label className="ff full"><span>Headline</span>
            <input className="admin-in" value={form.headline} onChange={(e) => setF("headline", e.target.value)} placeholder="A focused assessment of the data estate." /></label>
          <label className="ff full"><span>Background</span>
            <textarea className="admin-ta" value={form.background} onChange={(e) => setF("background", e.target.value)} placeholder="What the engagement addresses and how." /></label>
          <label className="ff full"><span>Outcome</span>
            <textarea className="admin-ta" value={form.outcome} onChange={(e) => setF("outcome", e.target.value)} placeholder="What is delivered and who owns it." /></label>

          <div className="form-sec">Highlight metrics (top of overview)</div>
          {form.highlights.map((h, i) => (
            <div className="form-grid hl" key={i}>
              <label className="ff"><span>Label</span>
                <input className="admin-in" value={h.label} onChange={(e) => setHl(i, "label", e.target.value)} placeholder="Data volume" /></label>
              <label className="ff"><span>Value</span>
                <input className="admin-in" value={h.value} onChange={(e) => setHl(i, "value", e.target.value)} placeholder="7.2" /></label>
              <label className="ff"><span>Unit (optional)</span>
                <input className="admin-in" value={h.unit} onChange={(e) => setHl(i, "unit", e.target.value)} placeholder="TB" /></label>
            </div>
          ))}

          <div className="form-sec">Alignment</div>
          <div className="form-grid">
            <label className="ff"><span>Label</span>
              <input className="admin-in" value={form.alignmentLabel} onChange={(e) => setF("alignmentLabel", e.target.value)} placeholder="Current alignment" /></label>
            <label className="ff"><span>Current (%)</span>
              <input className="admin-in" type="number" value={form.alignmentCurrent} onChange={(e) => setF("alignmentCurrent", e.target.value)} placeholder="41" /></label>
            <label className="ff"><span>Target (%)</span>
              <input className="admin-in" type="number" value={form.alignmentTarget} onChange={(e) => setF("alignmentTarget", e.target.value)} placeholder="100" /></label>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 16 }}>
            <button className="btn primary" onClick={doForm} disabled={busy}>{busy ? "Saving…" : "Create project"}</button>
            <button className="btn" onClick={() => { setForm(BLANK_FORM); setFormResult(null); }} disabled={busy}>Clear</button>
          </div>
          {formResult && (
            <div className={"admin-msg " + (formResult.ok ? "ok" : "err")}>
              {formResult.ok ? `Created "${formResult.name}".` : formResult.error}
            </div>
          )}
        </div>
      </div>

      <div className="grid g2" style={{ alignItems: "start" }}>
        {/* stored profiles */}
        <div className="card">
          <div className="card-head"><span className="dot-r" /> Stored profiles</div>
          <div className="card-body">
            {profiles.map((p) => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: "1px solid var(--hair)" }}>
                <span className={"chip " + (p.mode === "generic" ? "" : "accent")}>{p.mode === "generic" ? "Start Fresh" : p.isDemo ? "Mock Client" : "Client"}</span>
                <div style={{ flex: 1 }}>
                  <b style={{ color: "var(--green-ink)" }}>{p.name}</b>
                  {p.id === profile?.id && <span className="chip accent" style={{ marginLeft: 8 }}>active</span>}
                  <div style={{ fontSize: 11.5, color: "var(--ink-3)" }}>{p.engagement}</div>
                </div>
                {p.mode !== "generic" && (
                  <button className="btn" style={{ height: 30 }} onClick={() => doDelete(p.id, p.name)} disabled={busy}>Delete</button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* upload JSON (advanced) */}
        <div className="card">
          <div className="card-head">Add profile from JSON</div>
          <div className="card-body">
            <input type="file" accept="application/json,.json" onChange={onJson} className="file-in" />
            {preview && (
              <div style={{ marginTop: 14, border: "1px solid var(--hair)", padding: 12 }}>
                <div style={{ fontSize: 13 }}><b>{preview.client || "Unknown"}</b></div>
                <div style={{ fontSize: 12, color: "var(--ink-3)" }}>{preview.name} · {preview.deliverables ?? "?"} deliverables</div>
                <button className="btn primary" style={{ marginTop: 12 }} onClick={doCreate} disabled={busy}>{busy ? "Saving…" : "Save profile"}</button>
              </div>
            )}
            {msg && <div className={"admin-msg " + (msg.ok ? "ok" : "err")} style={{ marginTop: 14 }}>{msg.text}</div>}
            <p style={{ fontSize: 11.5, color: "var(--ink-4)", marginTop: 14 }}>
              {clients.length} client profile{clients.length === 1 ? "" : "s"} stored.
            </p>
          </div>
        </div>
      </div>

      <style>{`
        .admin-fields{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
        .file-in{font:600 12.5px var(--font);border:1px solid var(--line-strong);padding:9px;background:rgba(255,255,255,.7)}
        .file-in::file-selector-button{font:700 12px var(--font);border:1px solid var(--line-strong);background:#fff;padding:6px 12px;margin-right:12px;cursor:pointer}
        .admin-in{height:38px;border:1px solid var(--hair);padding:0 12px;font:600 12.5px var(--font);background:var(--paper);color:var(--ink);min-width:200px}
        .admin-in:focus{outline:none;border-color:var(--fs-green);box-shadow:0 0 0 3px var(--accent-tint)}
        .admin-msg{padding:10px 12px;font-size:12.5px;font-weight:600;border:1px solid;margin-top:12px}
        .admin-msg.ok{color:var(--green-ink);border-color:var(--green-soft);background:var(--ok-soft)}
        .admin-msg.err{color:var(--err);border-color:var(--err);background:var(--err-soft)}
        .form-sec{font:800 10px var(--font);text-transform:uppercase;letter-spacing:.09em;color:var(--accent-ink);
          margin:18px 0 10px;padding-bottom:5px;border-bottom:1px solid var(--hair)}
        .form-sec:first-child{margin-top:0}
        .form-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:12px}
        .form-grid.hl{margin-bottom:8px}
        @media(max-width:720px){.form-grid{grid-template-columns:1fr}}
        .ff{display:flex;flex-direction:column;gap:5px}
        .ff.full{margin-bottom:12px}
        .ff>span{font:800 10px var(--font);text-transform:uppercase;letter-spacing:.06em;color:var(--ink-3)}
        .ff .admin-in{min-width:0;width:100%}
        .admin-ta{border:1px solid var(--hair);padding:9px 12px;font:600 12.5px var(--font);background:var(--paper);
          color:var(--ink);min-height:60px;resize:vertical;line-height:1.5}
        .admin-ta:focus{outline:none;border-color:var(--fs-green);box-shadow:0 0 0 3px var(--accent-tint)}
      `}</style>
    </div>
  );
}
