import { useConfig } from "../config.jsx";

const WEEKS = 12;
const STATUS_COLOR = {
  delivered: "var(--ok)",
  "in-progress": "var(--accent)",
  planned: "var(--line-strong)",
};

export default function GanttPage() {
  const { config } = useConfig();
  const cols = Array.from({ length: WEEKS }, (_, i) => i + 1);

  // deliverable week span comes from its phase
  const phaseOf = (id) => config.phases.find((p) => p.id === id);

  return (
    <div>
      <div className="eyebrow"><span className="bar" /> Delivery · Timeline</div>
      <h1 className="page">Delivery Gantt</h1>
      <p className="lede">
        Every deliverable tracked against its phase weeks. Bar color shows status:
        delivered, in progress, or planned. Weeks are phase-level, matching the SOW.
      </p>

      <div className="card" style={{ overflowX: "auto" }}>
        <div className="card-body" style={{ padding: 0 }}>
          <div className="gantt">
            {/* header row */}
            <div className="g-row g-head">
              <div className="g-label">Deliverable</div>
              <div className="g-meta">Layer</div>
              <div className="g-track">
                {cols.map((w) => (
                  <div key={w} className="g-wk">W{w}</div>
                ))}
              </div>
            </div>

            {/* phase bands */}
            <div className="g-row g-phaserow">
              <div className="g-label" style={{ color: "var(--ink-3)", fontWeight: 700, fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".08em" }}>Phases</div>
              <div className="g-meta" />
              <div className="g-track">
                {config.phases.map((p) => (
                  <div
                    key={p.id}
                    className="g-phase"
                    style={{
                      gridColumn: `${p.weekStart} / ${p.weekEnd + 1}`,
                    }}
                    title={p.name}
                  >
                    Ph {p.id} · {p.name}
                  </div>
                ))}
              </div>
            </div>

            {/* deliverable rows */}
            {config.deliverables.map((d) => {
              const p = phaseOf(d.phase);
              return (
                <div key={d.id} className="g-row">
                  <div className="g-label">
                    <b style={{ color: "var(--green-ink)" }}>{d.code}</b> {d.name}
                  </div>
                  <div className="g-meta">
                    <span className={"st " + d.status} style={{ fontSize: 9.5 }}>{d.status}</span>
                  </div>
                  <div className="g-track">
                    <div
                      className="g-bar"
                      style={{
                        gridColumn: `${p.weekStart} / ${p.weekEnd + 1}`,
                        background: STATUS_COLOR[d.status],
                      }}
                    >
                      {d.code}
                      {d.artifact && (
                        <a href={d.artifact} target="_blank" rel="noreferrer" className="g-open" title="Open deliverable">↗</a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 18, marginTop: 16, fontSize: 12, color: "var(--ink-3)" }}>
        <span><i className="lg" style={{ background: "var(--ok)" }} /> Delivered</span>
        <span><i className="lg" style={{ background: "var(--accent)" }} /> In progress</span>
        <span><i className="lg" style={{ background: "var(--line-strong)" }} /> Planned</span>
      </div>

      <style>{`
        .gantt{min-width:900px}
        .g-row{display:grid;grid-template-columns:260px 96px 1fr;align-items:center;
          border-bottom:1px solid var(--line-2)}
        .g-row:last-child{border-bottom:none}
        .g-head{background:var(--bg-stripe);border-bottom:1px solid var(--line)}
        .g-head .g-label,.g-head .g-meta{font-size:10.5px;text-transform:uppercase;letter-spacing:.08em;
          color:var(--ink-3);font-weight:600}
        .g-label{padding:9px 12px;font-size:12.5px;color:var(--ink)}
        .g-meta{padding:9px 8px}
        .g-track{position:relative;display:grid;grid-template-columns:repeat(${WEEKS},1fr);
          gap:0;padding:6px 10px;background:
            repeating-linear-gradient(to right,transparent,transparent calc((100% - 20px)/${WEEKS} - 1px),
            var(--line-2) calc((100% - 20px)/${WEEKS} - 1px),var(--line-2) calc((100% - 20px)/${WEEKS}))}
        .g-wk{font-size:10px;color:var(--ink-4);text-align:center;font-variant-numeric:tabular-nums;padding:8px 0}
        .g-phaserow{background:#fff}
        .g-phase{font-size:10px;font-weight:700;color:var(--accent-ink);background:var(--accent-tint);
          padding:4px 8px;margin:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .g-bar{height:22px;color:#fff;font-size:10.5px;font-weight:800;
          display:flex;align-items:center;gap:6px;padding:0 9px;margin:2px}
        .g-open{color:#fff;font-weight:800;text-decoration:none;margin-left:auto;opacity:.85}
        .lg{display:inline-block;width:12px;height:12px;margin-right:6px;vertical-align:-1px}
      `}</style>
    </div>
  );
}
