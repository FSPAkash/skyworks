import { useNavigate } from "react-router-dom";
import { useConfig, layerConnStatus } from "../config.jsx";
import Stepper from "../components/Stepper.jsx";

export default function Journey() {
  const { config, sources } = useConfig();
  const nav = useNavigate();

  return (
    <div>
      <div className="eyebrow"><span className="bar" /> {config.client.framework}</div>
      <h1 className="page">{config.client.framework} journey</h1>

      <div style={{ marginBottom: 24 }}>
        <Stepper activeKey={config.layers[0].key} />
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1fr" }}>
        {config.layers.map((l) => {
          const s = layerConnStatus(sources, l.key);
          const dels = l.deliverables.map((id) => config.deliverables.find((d) => d.id === id));
          const isPull = s.total > 0;
          return (
            <div key={l.key} className="card" style={{ cursor: "pointer" }} onClick={() => nav(`/layer/${l.key}`)}>
              <div className="card-head">
                <span className="chip accent" style={{ minWidth: 28, justifyContent: "center" }}>{l.id}</span>
                {l.name}
                <span style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
                  {l.ownedBy !== "FS" && <span className="chip">{l.ownedBy}-owned input</span>}
                  {isPull && (
                    <span className={"st " + (s.complete ? "delivered" : s.connected ? "in-progress" : "planned")}>
                      {s.connected}/{s.total} connected
                    </span>
                  )}
                </span>
              </div>
              <div className="card-body" style={{ display: "flex", gap: 20 }}>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: "0 0 8px", fontSize: 13, color: "var(--ink-2)" }}>{l.summary}</p>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {dels.length === 0 && <span style={{ fontSize: 12, color: "var(--ink-4)" }}>No FS deliverable (input layer)</span>}
                    {dels.map((d) => <span key={d.id} className="chip">{d.code} · {d.name}</span>)}
                  </div>
                </div>
                <div className="chip accent" style={{ alignSelf: "center" }}>Open</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
