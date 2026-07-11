import { useConfig } from "../config.jsx";
import { FS_LOGO } from "../fslogo.js";
import DeliveryTimeline from "../components/DeliveryTimeline.jsx";

const STATE_CLASS = { delivered: "delivered", "in-progress": "in-progress", planned: "planned" };

export default function Overview() {
  const { config } = useConfig();
  const { client, deliverables } = config;
  const ov = config.overview || {};
  const delivered = deliverables.filter((d) => d.status === "delivered").length;
  const align = ov.alignment;

  return (
    <div>
      <div className="eyebrow"><span className="bar" /> {client.name}</div>
      <h1 className="page">{client.engagement}</h1>
      {ov.headline && <p className="lede" style={{ fontSize: 15 }}>{ov.headline}</p>}

      {/* exec highlights */}
      {ov.highlights && ov.highlights.length > 0 && (
        <div className="grid g4" style={{ marginBottom: 14 }}>
          {ov.highlights.map((h) => (
            <div key={h.label} className="stat">
              <div className="label">{h.label}</div>
              <div className="value">{h.value}{h.unit && <span className="u"> {h.unit}</span>}</div>
            </div>
          ))}
        </div>
      )}

      <div className="grid g3" style={{ marginBottom: 24 }}>
        <div className="stat"><div className="label">Deliverables</div><div className="value">{delivered}<span className="u"> / {deliverables.length}</span></div><div className="sub">accepted to date</div></div>
        <div className="stat"><div className="label">Active weeks</div>
          <div className="value">{client.activeWeeks ? client.activeWeeks : "—"}</div>
          <div className="sub">{client.activeWeeks ? `+ ${client.acceptanceWeeks} acceptance` : "not scheduled"}</div></div>
        <div className="stat"><div className="label">Phases</div>
          <div className="value">{client.activeWeeks ? config.phases.length : "—"}</div>
          <div className="sub">{client.activeWeeks ? `weeks 1-${client.activeWeeks}` : "not scheduled"}</div></div>
      </div>

      {/* business case + alignment */}
      <div className="grid g2" style={{ alignItems: "start", marginBottom: 24 }}>
        <div className="card hi">
          <div className="card-head">The engagement</div>
          <div className="card-body">
            {ov.background && <p style={{ margin: "0 0 12px", fontSize: 13.5, lineHeight: 1.6, color: "var(--ink-2)" }}>{ov.background}</p>}
            {ov.outcome && <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: "var(--ink-3)" }}>{ov.outcome}</p>}
          </div>
        </div>

        <div className="card">
          <div className="card-head">{align?.label || "Alignment"}</div>
          <div className="card-body">
            {align && (
              <>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 34, fontWeight: 800, color: "var(--ink)", letterSpacing: "-.02em" }}>{align.current}<span style={{ fontSize: 18, color: "var(--accent-ink)" }}>%</span></span>
                  <span style={{ fontSize: 12, color: "var(--ink-3)" }}>toward {align.target}% target</span>
                </div>
                <div className="align-track"><div className="align-fill" style={{ width: `${align.current}%` }} /></div>
              </>
            )}
            {ov.milestones && (
              <div style={{ marginTop: 16 }}>
                {ov.milestones.map((m) => (
                  <div key={m.name} className="ms-row">
                    <span className={"ms-dot " + (STATE_CLASS[m.status] || "planned")} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ink)" }}>{m.name}</div>
                      <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{m.when} · {m.trigger}</div>
                    </div>
                    <span className={"st " + (STATE_CLASS[m.status] || "planned")}>{m.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* delivery timeline */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-head"><span className="dot-r" /> Delivery timeline</div>
        <div className="card-body" style={{ padding: 14 }}>
          <DeliveryTimeline />
        </div>
      </div>

      {/* deliverables */}
      <div className="card-head-standalone ul" style={{ margin: "0 0 12px" }}>Deliverables</div>
      <div className="grid g2">
        {deliverables.map((d) => (
          <div key={d.id} className="card">
            <div className="card-head">
              <span className="chip accent">{d.code}</span> {d.name}
              <span className={"st " + (STATE_CLASS[d.status] || "planned")} style={{ marginLeft: "auto" }}>{d.status}</span>
            </div>
            <div className="card-body">
              <p style={{ margin: "0 0 10px", fontSize: 13, color: "var(--ink-2)" }}>{d.purpose}</p>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span className="wkn">{d.weeks}</span>
                <span className="mono">Ph {d.phase}</span>
                {d.artifact ? (
                  <a className="btn primary" href={d.artifact} target="_blank" rel="noreferrer" style={{ marginLeft: "auto" }}>Open</a>
                ) : d.status !== "delivered" ? (
                  <span className="chip" style={{ marginLeft: "auto" }}>{d.status === "in-progress" ? "In progress" : "Not yet delivered"}</span>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="footer-note">
        <span>Confidential</span> · <img src={FS_LOGO} alt="FS" /> BPC for Data
      </div>

      <style>{`
        .align-track{height:9px;background:var(--tile);border:1px solid var(--hair);overflow:hidden}
        .align-fill{height:100%;background:var(--fs-green)}
        .ms-row{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--line-2)}
        .ms-row:last-child{border-bottom:none}
        .ms-dot{width:9px;height:9px;border-radius:50%;flex:0 0 auto;background:var(--line-strong)}
        .ms-dot.delivered{background:var(--ok)}
        .ms-dot.in-progress{background:var(--accent)}
      `}</style>
    </div>
  );
}
