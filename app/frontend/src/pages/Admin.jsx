import { useState, useEffect } from "react";
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

// Build a form pre-populated from the active profile's config, blank where the
// profile carries no data. Highlights padded to 4 rows for a stable grid.
function formFromConfig(config) {
  const cl = config?.client || {};
  const ov = config?.overview || {};
  const hl = (ov.highlights || []).map((h) => ({ label: h.label || "", value: h.value ?? "", unit: h.unit || "" }));
  while (hl.length < 4) hl.push({ label: "", value: "", unit: "" });
  const al = ov.alignment || {};
  return {
    name: cl.name || "", engagement: cl.engagement || "", framework: cl.framework || "Assessment",
    durationWeeks: cl.durationWeeks ?? "", activeWeeks: cl.activeWeeks ?? "", acceptanceWeeks: cl.acceptanceWeeks ?? "",
    headline: ov.headline || "", background: ov.background || "", outcome: ov.outcome || "",
    highlights: hl,
    alignmentLabel: al.label || "Assessment progress",
    alignmentCurrent: al.current ?? "", alignmentTarget: al.target ?? "100",
  };
}

export default function Admin() {
  const { profile, config, uploadSow, updateProfile, setMetersInPresentation, setMetersOverview, setProjectDescription } = useConfig();
  const [busy, setBusy] = useState(false);
  const [editOpen, setEditOpen] = useState(false);   // Edit project details: collapsed by default
  const [metersBusy, setMetersBusy] = useState(false);
  const [ovMetersBusy, setOvMetersBusy] = useState(false);
  const [descBusy, setDescBusy] = useState(false);
  const metersOn = !!config?.settings?.metersInPresentation;
  const ovMetersOn = !!config?.settings?.metersOnOverview;
  const descOn = !!config?.settings?.showProjectDescription;
  const isGeneric = profile?.mode === "generic";
  const toggleMeters = async () => {
    setMetersBusy(true);
    await setMetersInPresentation(!metersOn);
    setMetersBusy(false);
  };
  const toggleOvMeters = async () => {
    setOvMetersBusy(true);
    await setMetersOverview(!ovMetersOn);
    setOvMetersBusy(false);
  };
  const toggleDesc = async () => {
    setDescBusy(true);
    await setProjectDescription(!descOn);
    setDescBusy(false);
  };
  const [sowFile, setSowFile] = useState(null);
  const [sowName, setSowName] = useState("");
  const [sowResult, setSowResult] = useState(null);
  const [form, setForm] = useState(() => formFromConfig(config));
  const [formResult, setFormResult] = useState(null);
  const setF = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const setHl = (i, k, v) => setForm((p) => ({ ...p, highlights: p.highlights.map((h, j) => j === i ? { ...h, [k]: v } : h) }));

  // Re-seed the form whenever the active profile / its config changes, so the
  // fields always show the current project's data (blank where none).
  useEffect(() => { setForm(formFromConfig(config)); setFormResult(null); }, [profile?.id, config]);

  const doForm = async () => {
    if (isGeneric) { setFormResult({ ok: false, error: "Save the DEMO as a project first to edit its details." }); return; }
    if (!form.name.trim()) { setFormResult({ ok: false, error: "Client / project name is required." }); return; }
    setBusy(true); setFormResult(null);
    const out = await updateProfile(form);
    setBusy(false); setFormResult(out);
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

  return (
    <div>
      <h1 className="page">Settings</h1>

      {/* Upload SOW - primary path, at the top */}
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

      {/* Presentation page content */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-head"><span className="dot-r" /> Presentation page</div>
        <div className="card-body">
          <div className="tgl-row">
            <div className="tgl-txt">
              <div className="tgl-title">Show Project Description</div>
              <div className="tgl-sub">
                {isGeneric
                  ? "Save this project first to change its settings."
                  : <>Adds the engagement background, outcome, and highlight tiles to the top of the Presentation page. Off by default to keep the page focused.</>}
              </div>
            </div>
            <button
              className={"switch" + (descOn ? " on" : "")}
              role="switch" aria-checked={descOn}
              disabled={isGeneric || descBusy}
              onClick={toggleDesc}>
              <span className="knob" />
            </button>
          </div>
        </div>
      </div>

      {/* Usage-meter visibility for the active profile */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-head"><span className="dot-r" /> Usage meters</div>
        <div className="card-body">
          <div className="tgl-row">
            <div className="tgl-txt">
              <div className="tgl-title">Show in Presentation</div>
              <div className="tgl-sub">
                {isGeneric
                  ? "Save this project first to change its settings."
                  : <>Live usage &amp; utilization meters appear as tiles on the Presentation page for executive viewers.</>}
              </div>
            </div>
            <button
              className={"switch" + (metersOn ? " on" : "")}
              role="switch" aria-checked={metersOn}
              disabled={isGeneric || metersBusy}
              onClick={toggleMeters}>
              <span className="knob" />
            </button>
          </div>
          <div className="tgl-row" style={{ borderTop: "1px solid var(--hair)", marginTop: 4, paddingTop: 14 }}>
            <div className="tgl-txt">
              <div className="tgl-title">Show in Overview</div>
              <div className="tgl-sub">
                {isGeneric
                  ? "Save this project first to change its settings."
                  : <>Adds a "Show usage metrics" section below the timeline on the Overview. Active profile: <b>{profile?.name}</b>.</>}
              </div>
            </div>
            <button
              className={"switch" + (ovMetersOn ? " on" : "")}
              role="switch" aria-checked={ovMetersOn}
              disabled={isGeneric || ovMetersBusy}
              onClick={toggleOvMeters}>
              <span className="knob" />
            </button>
          </div>
        </div>
      </div>

      {/* Edit the active project's details, prefilled from its config */}
      <div className="card" style={{ marginBottom: 16 }}>
        <button type="button" className="card-head edit-head" onClick={() => setEditOpen((o) => !o)} aria-expanded={editOpen}>
          <span className="dot-r" /> Edit project details
          <span className={"edit-chev" + (editOpen ? " open" : "")}>▸</span>
        </button>
        {editOpen && (
        <div className="card-body">
          <p style={{ margin: "0 0 14px", fontSize: 13, color: "var(--ink-2)" }}>
            {isGeneric
              ? "Save the DEMO as a project first to edit its details."
              : <>Editing <b>{profile?.name}</b>. Fields are prefilled from the current project; change any and save. Blank fields keep their existing value.</>}
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
            <button className="btn primary" onClick={doForm} disabled={busy || isGeneric}>{busy ? "Saving…" : "Save changes"}</button>
            <button className="btn" onClick={() => { setForm(formFromConfig(config)); setFormResult(null); }} disabled={busy}>Reset</button>
          </div>
          {formResult && (
            <div className={"admin-msg " + (formResult.ok ? "ok" : "err")}>
              {formResult.ok ? `Saved changes to "${formResult.name}".` : formResult.error}
            </div>
          )}
        </div>
        )}
      </div>

      <style>{`
        /* keep the standard .card-head look; only add button-reset bits that
           don't fight it (no background/border override) */
        .edit-head{width:100%;text-align:left;cursor:pointer;border-left:none;border-right:none;border-top:none;
          font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:var(--ink-3)}
        .edit-head:hover{background:var(--hair)}
        .edit-chev{margin-left:auto;transition:transform .18s ease;color:var(--ink-3);font-size:11px}
        .edit-chev.open{transform:rotate(90deg)}
        .admin-fields{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
        .file-in{font:600 12.5px var(--font);border:1px solid var(--line-strong);padding:9px;background:rgba(255,255,255,.7)}
        .file-in::file-selector-button{font:700 12px var(--font);border:1px solid var(--line-strong);background:#fff;padding:6px 12px;margin-right:12px;cursor:pointer}
        .admin-in{height:38px;border:var(--grid-w) solid var(--grid-line);padding:0 12px;font:600 12.5px var(--font);background:var(--paper);color:var(--ink);min-width:200px}
        .admin-in:focus{outline:none;border-color:var(--fs-green);box-shadow:0 0 0 2px var(--accent-tint)}
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
        .admin-ta{border:var(--grid-w) solid var(--grid-line);padding:9px 12px;font:600 12.5px var(--font);background:var(--paper);
          color:var(--ink);min-height:60px;resize:vertical;line-height:1.5}
        .admin-ta:focus{outline:none;border-color:var(--fs-green);box-shadow:0 0 0 3px var(--accent-tint)}
        .tgl-row{display:flex;align-items:center;gap:18px}
        .tgl-txt{flex:1;min-width:0}
        .tgl-title{font-size:13px;font-weight:800;color:var(--ink)}
        .tgl-sub{font-size:12px;color:var(--ink-3);margin-top:4px;line-height:1.5}
        .tgl-sub b{color:var(--ink-2)}
        .switch{flex:0 0 auto;width:46px;height:26px;border-radius:999px;border:1px solid var(--line-strong);
          background:var(--tile);cursor:pointer;position:relative;transition:all .18s;padding:0}
        .switch .knob{position:absolute;top:2px;left:2px;width:20px;height:20px;border-radius:50%;background:#fff;
          box-shadow:0 1px 3px rgba(0,0,0,.25);transition:all .18s}
        .switch.on{background:var(--fs-green);border-color:var(--fs-green)}
        .switch.on .knob{left:22px}
        .switch:disabled{opacity:.5;cursor:not-allowed}
      `}</style>
    </div>
  );
}
