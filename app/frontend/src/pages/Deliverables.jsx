import { useConfig } from "../config.jsx";

const LAYER_CHIP = {
  infrastructure: "Infrastructure",
  collection: "Collection",
  unification: "Unification",
  presentation: "Presentation",
};

export default function Deliverables() {
  const { config } = useConfig();
  return (
    <div>
      <div className="eyebrow"><span className="bar" /> Deliverables</div>
      <h1 className="page">Deliverables</h1>

      <div className="tablewrap card" style={{ padding: 0 }}>
      <table className="lots" style={{ border: "none" }}>
        <thead>
          <tr>
            <th style={{ width: 34 }}>#</th>
            <th>Deliverable</th>
            <th style={{ width: 170 }}>Layer</th>
            <th style={{ width: 58 }}>Phase</th>
            <th style={{ width: 80 }}>Weeks</th>
            <th>Purpose</th>
            <th style={{ width: 120 }}>Status</th>
            <th style={{ width: 130 }}>Artifact</th>
          </tr>
        </thead>
        <tbody>
          {config.deliverables.map((d) => (
            <tr key={d.id}>
              <td className="dn">{d.id}</td>
              <td style={{ fontWeight: 600 }}>{d.name}</td>
              <td><span className="chip accent nowrap">{LAYER_CHIP[d.layer]}</span></td>
              <td className="mono">Ph {d.phase}</td>
              <td><span className="wkn">{d.weeks}</span></td>
              <td style={{ color: "var(--ink-2)" }}>{d.purpose}</td>
              <td><span className={"st " + d.status}>{d.status}</span></td>
              <td>
                {d.artifact ? (
                  <a className="btn primary" href={d.artifact} target="_blank" rel="noreferrer" style={{ height: 28, display: "inline-flex", alignItems: "center", padding: "0 10px" }}>
                    Open
                  </a>
                ) : (
                  <span style={{ fontSize: 11.5, color: "var(--ink-4)" }}>Pending</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
