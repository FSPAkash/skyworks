import { useParams, useNavigate, Link } from "react-router-dom";
import { useConfig, layerConnStatus } from "../config.jsx";
import Stepper from "../components/Stepper.jsx";

const KIND_LABEL = { db: "Database", erp: "ERP", crm: "CRM", mail: "Mail", external: "External" };

const ACTIVITIES = {
  infrastructure: ["Confirm posture (Provided / Advise / Build)", "Confirm target platform", "Confirm access model & owner", "Assess lineage availability"],
  collection: ["Connectivity validation", "Metadata ingestion", "Package / job collection", "Query log collection"],
  unification: ["End-to-end lineage analysis", "Data ownership mapping", "Dataset usage analysis"],
  presentation: ["Classification & alignment", "Cost / performance & backlog", "Executive recommendations", "Playbook & knowledge transfer"],
};

export default function LayerPage() {
  const { key } = useParams();
  const nav = useNavigate();
  const { config, sources } = useConfig();
  const layer = config.layers.find((l) => l.key === key);
  if (!layer) return <p className="lede">Unknown layer.</p>;

  const idx = config.layers.findIndex((l) => l.key === key);
  const next = config.layers[idx + 1];
  const dels = layer.deliverables.map((id) => config.deliverables.find((d) => d.id === id));
  const s = layerConnStatus(sources, key);
  const targets = sources.targets.filter((t) => t.layer === key);
  const isPull = targets.length > 0;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div className="eyebrow"><span className="bar" /> {layer.tag}</div>
          <h1 className="page">{layer.name}</h1>
        </div>
        <Stepper activeKey={key} />
      </div>
      <p className="lede">{layer.summary}</p>

      {layer.topics && layer.topics.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
          {layer.topics.map((t) => <span key={t} className="chip accent">{t}</span>)}
        </div>
      )}

      <div className="grid g2" style={{ alignItems: "start" }}>
        {/* activities */}
        <div className="card">
          <div className="card-head">Activities</div>
          <div className="card-body">
            {(ACTIVITIES[key] || []).map((a) => (
              <div key={a} className="hav">{a}</div>
            ))}
          </div>
        </div>

        {/* sources for this layer */}
        <div className="card">
          <div className="card-head">Sources in this layer</div>
          <div className="card-body">
            {(layer.sourceGroups || []).map((g) => (
              <div key={g.label} style={{ marginBottom: 10 }}>
                <div className="ul" style={{ marginBottom: 5 }}>{g.label}</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {g.items.map((it) => <span key={it} className="chip">{it}</span>)}
                </div>
              </div>
            ))}
            {(!layer.sourceGroups || layer.sourceGroups.length === 0) && (
              <p style={{ fontSize: 12.5, color: "var(--ink-3)", margin: 0 }}>No sources defined.</p>
            )}
          </div>
        </div>
      </div>

      {/* source connections for this layer */}
      {isPull && (
        <div className="card" style={{ marginTop: 14 }}>
          <div className="card-head">
            <span className="dot-r" /> Source connections ({s.connected}/{s.total} connected)
            <Link to="/intake" className="btn primary" style={{ marginLeft: "auto", height: 30 }}>
              {s.complete ? "Review connections" : "Connect sources"}
            </Link>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <div className="tablewrap">
              <table className="lots" style={{ border: "none" }}>
                <thead><tr><th>Source</th><th style={{ width: 110 }}>Type</th><th style={{ width: 90 }}>Status</th><th>Detail</th></tr></thead>
                <tbody>
                  {targets.map((t) => {
                    const c = t.connection;
                    const stt = c?.status || "not-configured";
                    return (
                      <tr key={t.id}>
                        <td style={{ fontWeight: 700 }}>{t.source}</td>
                        <td><span className="chip">{KIND_LABEL[t.kind]}</span></td>
                        <td><span className={"st " + (stt === "connected" ? "delivered" : stt === "configured" ? "in-progress" : "planned")}>{stt === "not-configured" ? "not set" : stt}</span></td>
                        <td style={{ color: "var(--ink-3)", fontSize: 12 }}>
                          {c?.detail ? `${c.detail.pingMs}ms · ${c.detail.discovered} ${c.detail.unit}` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* deliverables produced */}
      <div className="ul" style={{ margin: "22px 0 10px" }}>Deliverables produced in this layer</div>
      {dels.length === 0 ? (
        <div className="card"><div className="card-body">
          <p style={{ margin: 0, fontSize: 13, color: "var(--ink-3)" }}>
            {layer.ownedBy !== "FS"
              ? `This is the ${layer.ownedBy}-owned input layer. No FS deliverable is produced here.`
              : "No deliverables mapped to this layer."}
          </p>
        </div></div>
      ) : (
        <div className="grid g2">
          {dels.map((d) => (
            <div key={d.id} className="card">
              <div className="card-head">
                <span className="chip accent">{d.code}</span> {d.name}
                <span className={"st " + d.status} style={{ marginLeft: "auto" }}>{d.status}</span>
              </div>
              <div className="card-body">
                <p style={{ margin: "0 0 10px", fontSize: 13, color: "var(--ink-2)" }}>{d.purpose}</p>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span className="wkn">{d.weeks}</span>
                  <span className="mono">Ph {d.phase}</span>
                  {d.artifact ? (
                    <a className="btn primary" href={d.artifact} target="_blank" rel="noreferrer" style={{ marginLeft: "auto" }}>Open deliverable</a>
                  ) : (
                    <span className="chip" style={{ marginLeft: "auto" }}>Not yet delivered</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
        <Link to="/journey" className="btn">Back to journey</Link>
        {next && <button className="btn primary" onClick={() => nav(`/layer/${next.key}`)}>Next layer · {next.name}</button>}
        {!next && <Link to="/gantt" className="btn primary">View delivery Gantt</Link>}
      </div>
    </div>
  );
}
