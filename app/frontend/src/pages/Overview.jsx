import { Link } from "react-router-dom";
import { useConfig, connReadiness } from "../config.jsx";
import { FS_LOGO } from "../fslogo.js";

export default function Overview() {
  const { config, sources, can } = useConfig();
  const { client, profile, deliverables } = config;
  const r = connReadiness(sources);
  const delivered = deliverables.filter((d) => d.status === "delivered").length;

  return (
    <div>
      <div className="eyebrow"><span className="bar" /> {client.name} · {client.framework}</div>
      <h1 className="page">{client.engagement}</h1>

      {can("intake") && !r.complete && (
        <div className="gate">
          <div className="g-ic">{r.hasSelection ? "!" : "?"}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, color: "var(--green-ink)", fontSize: 15 }}>
              {r.hasSelection ? `${r.total - r.connected} source(s) left to connect` : "Select your sources to begin"}
            </div>
          </div>
          <Link to="/intake" className="btn primary">Connections</Link>
        </div>
      )}

      {profile && (
        <div className="grid g4" style={{ marginBottom: 14 }}>
          <div className="stat"><div className="label">ODS size</div><div className="value">{profile.odsSizeTB}<span className="u"> TB</span></div></div>
          <div className="stat"><div className="label">CPUs</div><div className="value">{profile.cpus}</div></div>
          <div className="stat"><div className="label">SSIS jobs</div><div className="value">~{profile.ssisJobs}</div></div>
          <div className="stat"><div className="label">Peak load</div><div className="value">{profile.peakBatchesPerSec.toLocaleString()}<span className="u"> b/s</span></div></div>
        </div>
      )}

      <div className="grid g4" style={{ marginBottom: 24 }}>
        <div className="stat"><div className="label">Framework layers</div><div className="value">{config.layers.length}</div><div className="sub">{client.framework}</div></div>
        <div className="stat"><div className="label">Deliverables</div><div className="value">{delivered}<span className="u"> / {deliverables.length}</span></div><div className="sub">accepted to date</div></div>
        <div className="stat"><div className="label">Active weeks</div><div className="value">{client.activeWeeks}</div><div className="sub">+ {client.acceptanceWeeks} acceptance</div></div>
        <div className="stat"><div className="label">Phases</div><div className="value">{config.phases.length}</div><div className="sub">weeks 1-{client.activeWeeks}</div></div>
      </div>

      <div className="grid g2" style={{ alignItems: "start" }}>
        <div className="card">
          <div className="card-head"><span className="dot-r" /> The {client.framework} journey</div>
          <div className="card-body">
            {config.layers.map((l) => (
              <div key={l.key} style={{ display: "flex", gap: 11, alignItems: "center", padding: "6px 0" }}>
                <span className="chip accent" style={{ minWidth: 30, justifyContent: "center" }}>{l.id}</span>
                <b style={{ fontSize: 13, minWidth: 108 }}>{l.name}</b>
                <span style={{ fontSize: 12, color: "var(--ink-3)", flex: 1 }}>{l.summary}</span>
              </div>
            ))}
            {can("journey") && <Link to="/journey" className="btn primary" style={{ marginTop: 16 }}>Enter the journey</Link>}
          </div>
        </div>

        <div className="card">
          <div className="card-head">Delivery at a glance</div>
          <div className="card-body">
            {config.phases.map((p) => (
              <div key={p.id} style={{ display: "flex", gap: 11, alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--line-2)" }}>
                <span className="mono" style={{ minWidth: 42 }}>Ph {p.id}</span>
                <span className="wkn">{p.weeks}</span>
                <span style={{ fontSize: 12.5, flex: 1 }}>{p.name}</span>
                <span className="chip">{p.deliverables.length} D</span>
              </div>
            ))}
            {can("gantt") && <Link to="/gantt" className="btn" style={{ marginTop: 16 }}>Open delivery Gantt</Link>}
          </div>
        </div>
      </div>

      <div className="footer-note">
        <span>Confidential</span> · <img src={FS_LOGO} alt="FS" /> Data - BPC
      </div>
    </div>
  );
}
