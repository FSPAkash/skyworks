import { useState } from "react";
import { useConfig } from "../config.jsx";

// Delivery timeline (Gantt): week columns x deliverables, with phase bands and
// status-colored bars. A deliverable past its due week and not delivered shows
// as delayed. Reads phases + deliverables from config.
const STATUS_COLOR = {
  delivered: "var(--ok)",
  "in-progress": "var(--accent)",
  delayed: "var(--err)",
  planned: "var(--line-strong)",
};

function stateOf(d, phase, currentWeek) {
  const due = phase?.weekEnd ?? 0;
  if (d.status === "delivered") return "delivered";
  if (currentWeek > 0 && due > 0 && currentWeek >= due) return "delayed";
  if (d.status === "in-progress") return "in-progress";
  return "planned";
}

export default function DeliveryTimeline() {
  const { config } = useConfig();
  const weeks = config.client.activeWeeks || 12;
  const currentWeek = config.client.currentWeek || 0;
  const cols = Array.from({ length: weeks }, (_, i) => i + 1);
  const phaseOf = (id) => config.phases.find((p) => p.id === id);
  const nowPct = currentWeek > 0 ? Math.min(100, (currentWeek / weeks) * 100) : null;
  const [openReason, setOpenReason] = useState(null);   // deliverable id whose delay reason is shown

  return (
    <div className="dt-wrap">
      <div className="dt">
        {/* week header */}
        <div className="dt-row dt-head">
          <div className="dt-label">Deliverable</div>
          <div className="dt-track">
            {nowPct != null && (
              <div className="dt-now" style={{ left: `${nowPct}%` }}><span className="dt-now-tag">Now · W{currentWeek}</span></div>
            )}
            {cols.map((w) => <div key={w} className={"dt-wk" + (w === currentWeek ? " now" : "")}>W{w}</div>)}
          </div>
        </div>

        {/* phase bands */}
        <div className="dt-row dt-phaserow">
          <div className="dt-label dt-phaselbl">Phases</div>
          <div className="dt-track">
            {nowPct != null && <div className="dt-now line" style={{ left: `${nowPct}%` }} />}
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
          const state = stateOf(d, p, currentWeek);
          const clickable = state === "delivered" && d.artifact;
          const hasReason = state === "delayed" && d.delayReason;
          const title = hasReason
            ? "Delayed — click for reason"
            : clickable ? "Open deliverable" : d.name;
          const span = { gridColumn: `${p.weekStart} / ${p.weekEnd + 1}` };
          const reasonOpen = openReason === d.id;
          return (
            <div key={d.id} className="dt-row">
              <div className="dt-label">
                <b>{d.code}</b> <span className="dt-dname">{d.name}</span>
              </div>
              <div className="dt-track">
                {nowPct != null && <div className="dt-now line" style={{ left: `${nowPct}%` }} />}
                {clickable ? (
                  <a href={d.artifact} target="_blank" rel="noreferrer" className={"dt-bar " + state}
                    style={{ ...span, background: STATUS_COLOR[state] }} title={title}>
                    <span>{d.code}</span>
                    <span className="dt-open">Open ↗</span>
                  </a>
                ) : hasReason ? (
                  <div className="dt-barwrap" style={span}>
                    <button type="button" className={"dt-bar delayed" + (reasonOpen ? " active" : "")}
                      style={{ background: STATUS_COLOR[state], width: "100%" }} title={title}
                      onClick={() => setOpenReason(reasonOpen ? null : d.id)}>
                      <span>{d.code}</span>
                      <span className="dt-open">! delayed</span>
                    </button>
                    {reasonOpen && (
                      <div className="dt-reason" role="dialog">
                        <div className="dt-reason-head">
                          <span className="dt-reason-tag">Why {d.code} is delayed</span>
                          <button className="dt-reason-x" onClick={() => setOpenReason(null)} aria-label="Close">×</button>
                        </div>
                        <p>{d.delayReason}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className={"dt-bar " + state}
                    style={{ ...span, background: STATUS_COLOR[state] }} title={title}>
                    <span>{d.code}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="dt-legend">
        <span><i style={{ background: "var(--ok)" }} /> Delivered</span>
        <span><i style={{ background: "var(--accent)" }} /> In progress</span>
        <span><i style={{ background: "var(--err)" }} /> Delayed</span>
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
        .dt-bar{height:22px;color:#fff;font-size:10.5px;font-weight:800;display:flex;align-items:center;gap:6px;
          padding:0 9px;margin:2px;text-decoration:none;min-width:0;box-sizing:border-box}
        a.dt-bar,button.dt-bar{cursor:pointer;transition:filter .14s ease}
        button.dt-bar{border:none;font-family:var(--font);font-size:10.5px;font-weight:800;text-align:left}
        a.dt-bar:hover,button.dt-bar:hover{filter:brightness(1.08)}
        button.dt-bar.active{filter:brightness(1.1);box-shadow:0 0 0 2px var(--paper),0 0 0 3px var(--err)}
        .dt-bar.planned{color:var(--ink-2)}
        .dt-open{color:inherit;font-weight:800;text-decoration:none;margin-left:auto;opacity:.92;white-space:nowrap}
        /* delayed reason popover */
        .dt-barwrap{position:relative;display:flex}
        .dt-reason{position:absolute;top:calc(100% + 6px);left:0;z-index:20;width:280px;max-width:74vw;
          background:var(--paper);border:1px solid var(--err);box-shadow:var(--halo);padding:11px 13px;
          border-left:3px solid var(--err)}
        .dt-reason-head{display:flex;align-items:center;gap:8px}
        .dt-reason-tag{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.09em;color:var(--err)}
        .dt-reason-x{margin-left:auto;background:none;border:none;cursor:pointer;font-size:16px;line-height:1;
          color:var(--ink-3);padding:0 2px}
        .dt-reason-x:hover{color:var(--ink)}
        .dt-reason p{margin:6px 0 0;font-size:12px;line-height:1.5;color:var(--ink);font-weight:500}
        /* now marker */
        .dt-now{position:absolute;top:0;bottom:0;left:0;z-index:3;pointer-events:none}
        .dt-now.line{width:2px;background:var(--fs-green);opacity:.85}
        .dt-head .dt-now{width:2px;background:var(--fs-green)}
        .dt-now-tag{position:absolute;top:-2px;left:50%;transform:translateX(-50%);font-size:8px;font-weight:800;
          text-transform:uppercase;letter-spacing:.05em;color:#fff;background:var(--fs-green);padding:1px 5px;white-space:nowrap}
        .dt-wk.now{color:var(--accent-ink);font-weight:800}
        .dt-legend{display:flex;flex-wrap:wrap;gap:18px;margin-top:14px;font-size:12px;color:var(--ink-3)}
        .dt-legend i{display:inline-block;width:12px;height:12px;margin-right:6px;vertical-align:-1px}
      `}</style>
    </div>
  );
}
