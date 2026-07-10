import { useState } from "react";
import { useConfig } from "../config.jsx";

export default function Admin() {
  const { profiles, profile, createProfile, deleteProfile } = useConfig();
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null);

  const onFile = async (e) => {
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

  const doDelete = async (id, name) => {
    setBusy(true);
    const out = await deleteProfile(id);
    setBusy(false);
    setMsg(out.ok ? { ok: true, text: `Deleted "${name}".` } : { ok: false, text: out.error });
  };

  const clients = profiles.filter((p) => p.mode !== "generic");

  return (
    <div>
      <div className="eyebrow"><span className="bar" /> Admin · Profiles</div>
      <h1 className="page">Client profiles</h1>

      <div className="grid g2" style={{ alignItems: "start" }}>
        <div className="card">
          <div className="card-head"><span className="dot-r" /> Stored profiles</div>
          <div className="card-body">
            {profiles.map((p) => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: "1px solid var(--hair)" }}>
                <span className={"chip " + (p.mode === "generic" ? "" : "solid")}>{p.mode === "generic" ? "Template" : "Client"}</span>
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

        <div className="card">
          <div className="card-head">Add profile</div>
          <div className="card-body">
            <input type="file" accept="application/json,.json" onChange={onFile} className="file-in" />
            {preview && (
              <div style={{ marginTop: 14, border: "1px solid var(--hair)", borderRadius:0, padding: 12 }}>
                <div style={{ fontSize: 13 }}><b>{preview.client || "Unknown"}</b></div>
                <div style={{ fontSize: 12, color: "var(--ink-3)" }}>{preview.name} · {preview.deliverables ?? "?"} deliverables</div>
                <button className="btn primary" style={{ marginTop: 12 }} onClick={doCreate} disabled={busy}>{busy ? "Saving…" : "Save profile"}</button>
              </div>
            )}
            {msg && (
              <div style={{ marginTop: 14, padding: "10px 12px", borderRadius:0, fontSize: 12.5, fontWeight: 600,
                border: "1px solid " + (msg.ok ? "var(--green-soft)" : "var(--err)"),
                color: msg.ok ? "var(--green-ink)" : "var(--err)" }}>{msg.text}</div>
            )}
            <p style={{ fontSize: 11.5, color: "var(--ink-4)", marginTop: 14 }}>
              {clients.length} client profile{clients.length === 1 ? "" : "s"} stored. Needs product, client, layers, phases, deliverables, chatbot keys.
            </p>
          </div>
        </div>
      </div>

      <style>{`
        .file-in{font:600 12.5px var(--font);border:1px solid var(--line-strong);border-radius:0;padding:9px;width:100%;background:rgba(255,255,255,.7)}
        .file-in::file-selector-button{font:700 12px var(--font);border:1px solid var(--line-strong);border-radius:0;background:#fff;padding:6px 12px;margin-right:12px;cursor:pointer}
      `}</style>
    </div>
  );
}
