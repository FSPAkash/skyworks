import { useConfig } from "../config.jsx";

// Delivery timeline: week columns x deliverables, with phase bands and status
// colored bars. Replaces the old Gantt. Reads phases + deliverables from config.
const STATUS_COLOR = {
  delivered: "var(--ok)",
  "in-progress": "var(--accent)",
  planned: "var(--line-strong)",
};

export default function DeliveryTimeline() {
  const { config } = useConfig();
  const weeks = config.client.activeWeeks || 12;
  const cols = Array.from({ length: weeks }, (_, i) => i + 1);
  const phaseOf = (id) => config.phases.find((p) => p.id === id);

  return (
    <div className="dt-wrap">
      <div className="dt">
        {/* week header */}
        <div className="dt-row dt-head">
          <div className="dt-label">Deliverable</div>
          <div className="dt-track">
            {cols.map((w) => <div key={w} className="dt-wk">W{w}</div>)}
          </div>
        </div>

        {/* phase bands */}
        <div className="dt-row dt-phaserow">
          <div className="dt-label dt-phaselbl">Phases</div>
          <div className="dt-track">
            {config.phases.map((p) => (
              <div key={p.id} className="dt-phase"
                style={{ gridColumn: `${p.weekStart} / ${p.weekEnd + 1}` }} title={p.name}>
                Ph {p.id} · {p.name}
              </div>
            ))}
          </div>
        </div>

        {/* deliverable rows */}
        {config.deliverables.map((d) => {
          const p = phaseOf(d.phase) || { weekStart: 1, weekEnd: 1 };
          return (
            <div key={d.id} className="dt-row">
              <div className="dt-label">
                <b>{d.code}</b> <span className="dt-dname">{d.name}</span>
              </div>
              <div className="dt-track">
                <div className="dt-bar"
                  style={{ gridColumn: `${p.weekStart} / ${p.weekEnd + 1}`, background: STATUS_COLOR[d.status] || STATUS_COLOR.planned }}>
                  <span>{d.code}</span>
                  {d.artifact && (
                    <a href={d.artifact} target="_blank" rel="noreferrer" className="dt-open" title="Open deliverable">↗</a>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="dt-legend">
        <span><i style={{ background: "var(--ok)" }} /> Delivered</span>
        <span><i style={{ background: "var(--accent)" }} /> In progress</span>
        <span><i style={{ background: "var(--line-strong)" }} /> Planned</span>
      </div>

      <style>{`
        .dt-wrap{overflow-x:auto}
        .dt{min-width:760px}
        .dt-row{display:grid;grid-template-columns:230px 1fr;align-items:center;border-bottom:1px solid var(--line-2)}
        .dt-row:last-child{border-bottom:none}
        .dt-head{border-bottom:1px solid var(--line)}
        .dt-head .dt-label{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--ink-3);font-weight:700}
        .dt-label{padding:9px 12px;font-size:12.5px;color:var(--ink)}
        .dt-label b{color:var(--green-ink)}
        .dt-dname{color:var(--ink-2)}
        .dt-phaselbl{color:var(--ink-3);font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:.08em}
        .dt-track{position:relative;display:grid;grid-template-columns:repeat(${weeks},1fr);padding:6px 10px;
          background:repeating-linear-gradient(to right,transparent,transparent calc(100%/${weeks} - 1px),
            var(--line-2) calc(100%/${weeks} - 1px),var(--line-2) calc(100%/${weeks}))}
        .dt-wk{font-size:9.5px;color:var(--ink-4);text-align:center;font-variant-numeric:tabular-nums;padding:7px 0}
        .dt-phaserow{background:transparent}
        .dt-phase{font-size:10px;font-weight:700;color:var(--accent-ink);background:var(--accent-tint);
          padding:4px 8px;margin:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .dt-bar{height:22px;color:#fff;font-size:10.5px;font-weight:800;display:flex;align-items:center;gap:6px;padding:0 9px;margin:2px}
        .dt-open{color:#fff;font-weight:800;text-decoration:none;margin-left:auto;opacity:.9}
        .dt-legend{display:flex;gap:18px;margin-top:14px;font-size:12px;color:var(--ink-3)}
        .dt-legend i{display:inline-block;width:12px;height:12px;margin-right:6px;vertical-align:-1px}
      `}</style>
    </div>
  );
}
