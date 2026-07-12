import { useConfig } from "../config.jsx";
import { FS_LOGO } from "../fslogo.js";

// Presentation page: the face of the assessment for decision makers - hero,
// key stats, the engagement narrative, alignment, exec meters and the packaged
// deliverables. This is the former Overview content, minus the Gantt timeline
// (the timeline now lives on Overview as the project delivery view).

const STATE_CLASS = { delivered: "delivered", "in-progress": "in-progress", planned: "planned" };

// radial gauge: an SVG arc that fills to `value` (0-100)
function MeterGauge({ value = 0, tone = "green" }) {
  const R = 26, C = 2 * Math.PI * R;
  const pct = Math.max(0, Math.min(100, value));
  const dash = (pct / 100) * C;
  const stroke = tone === "blue" ? "var(--ds-blue)" : "var(--fs-green)";
  return (
    <svg className="gauge" width="72" height="72" viewBox="0 0 72 72">
      <circle cx="36" cy="36" r={R} fill="none" stroke="var(--hair)" strokeWidth="7" />
      <circle cx="36" cy="36" r={R} fill="none" stroke={stroke} strokeWidth="7"
        strokeLinecap="round" strokeDasharray={`${dash} ${C}`}
        transform="rotate(-90 36 36)" className="gauge-arc" />
      <text x="36" y="40" textAnchor="middle" className="gauge-txt">{pct}%</text>
    </svg>
  );
}

function MeterTiles({ meters }) {
  if (!meters || !meters.length) return null;
  return (
    <div className="mtr-wrap">
      <div className="card-head-standalone ul mtr-title">Live usage &amp; utilization</div>
      <div className="mtr-grid">
        {meters.map((m, i) => (
          <div key={m.label} className="mtr-tile" style={{ animationDelay: `${i * 70}ms` }}>
            <div className="mtr-gauge"><MeterGauge value={m.value} tone={m.category === "cloud" || m.category === "llm" ? "blue" : "green"} /></div>
            <div className="mtr-info">
              <div className="mtr-label">{m.label}</div>
              <div className="mtr-detail">{m.detail}</div>
              <div className="mtr-cat">{m.category}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Presentation() {
  const { config, sources } = useConfig();
  const { client, deliverables } = config;
  const ov = config.overview || {};
  const layer = (config.layers || []).find((l) => l.key === "presentation");
  const delivered = deliverables.filter((d) => d.status === "delivered").length;
  const align = ov.alignment;
  const alignCurrent = Math.max(0, Math.min(100, Number(align?.current) || 0));
  const showMeters = !!config.settings?.metersToCLevel && (sources.meters || []).length > 0;

  return (
    <div className="ov">
      {/* header - matches the ICU layer pages: bare title + lede, no hero card */}
      <h1 className="page">{layer?.name || "Presentation"}</h1>
      <p className="lede">{layer?.summary || ov.headline}</p>

      {ov.highlights && ov.highlights.length > 0 && (
        <div className="ov-hl">
          {ov.highlights.map((h, i) => (
            <div key={h.label} className="ov-hl-tile" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="ov-hl-val">{h.value}{h.unit && <span className="u"> {h.unit}</span>}</div>
              <div className="ov-hl-lbl">{h.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* key stats */}
      <div className="grid g3 ov-stats">
        <div className="stat"><div className="label">Deliverables</div><div className="value">{delivered}<span className="u"> / {deliverables.length}</span></div><div className="sub">accepted to date</div></div>
        <div className="stat"><div className="label">Active weeks</div>
          <div className="value">{client.activeWeeks ? client.activeWeeks : "—"}</div>
          <div className="sub">{client.activeWeeks ? `+ ${client.acceptanceWeeks} acceptance` : "not scheduled"}</div></div>
        <div className="stat"><div className="label">Phases</div>
          <div className="value">{client.activeWeeks ? config.phases.length : "—"}</div>
          <div className="sub">{client.activeWeeks ? `weeks 1-${client.activeWeeks}` : "not scheduled"}</div></div>
      </div>

      {/* meter tiles (admin-enabled exec view) */}
      {showMeters && <MeterTiles meters={sources.meters} />}

      {/* business case + alignment */}
      <div className="grid g2 ov-two" style={{ alignItems: "start" }}>
        <div className="card hi">
          <div className="card-head">The engagement</div>
          <div className="card-body">
            {ov.background && <p className="ov-bg">{ov.background}</p>}
            {ov.outcome && <p className="ov-out">{ov.outcome}</p>}
          </div>
        </div>

        <div className="card">
          <div className="card-head">{align?.label || "Alignment"}</div>
          <div className="card-body">
            {align && (
              <>
                <div className="ov-align-top">
                  <span className="ov-align-pct">{alignCurrent}<span className="ov-align-sym">%</span></span>
                  <span className="ov-align-goal">toward {align.target}% target</span>
                </div>
                <div className="align-track"><div className="align-fill" style={{ width: `${alignCurrent}%` }} /></div>
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

      {/* deliverables */}
      <div className="card-head-standalone ul" style={{ margin: "0 0 12px" }}>Deliverables</div>
      <div className="grid g2">
        {deliverables.map((d, i) => (
          <div key={d.id} className="card lift ov-deliv" style={{ animationDelay: `${i * 45}ms` }}>
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
        @keyframes ovRise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        @keyframes gaugeIn{from{stroke-dasharray:0 999}}
        @media(prefers-reduced-motion:reduce){.ov *{animation:none!important}}
        .ov{animation:ovRise .45s ease both}

        .ov-hl{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:18px 0 22px}
        @media(max-width:820px){.ov-hl{grid-template-columns:repeat(2,1fr)}}
        .ov-hl-tile{position:relative;padding:13px 15px;background:var(--paper);
          border:1px solid var(--hair);box-shadow:var(--soft);animation:ovRise .45s ease both;
          border-top:3px solid var(--fs-green)}
        .ov-hl-val{font-size:25px;font-weight:800;letter-spacing:-.02em;color:var(--ink);font-variant-numeric:tabular-nums;line-height:1.1}
        .ov-hl-val .u{font-size:13px;color:var(--accent-ink);font-weight:700}
        .ov-hl-lbl{font-size:10px;text-transform:uppercase;letter-spacing:.1em;font-weight:800;color:var(--ink-3);margin-top:4px}

        .ov-stats{margin-bottom:22px}
        .ov-stats .stat{animation:ovRise .45s ease both}

        .mtr-wrap{margin:22px 0}
        .mtr-title{margin:0 0 10px}
        .mtr-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
        @media(max-width:900px){.mtr-grid{grid-template-columns:repeat(2,1fr)}}
        @media(max-width:560px){.mtr-grid{grid-template-columns:1fr}}
        .mtr-tile{display:flex;align-items:center;gap:14px;padding:14px 16px;background:var(--paper);
          border:1px solid var(--hair);box-shadow:var(--soft);animation:ovRise .45s ease both}
        .mtr-gauge{flex:0 0 auto}
        .gauge-arc{animation:gaugeIn .9s ease-out both}
        .gauge-txt{font:800 15px var(--font);fill:var(--ink)}
        .mtr-info{min-width:0}
        .mtr-label{font-size:12.5px;font-weight:800;color:var(--ink);line-height:1.25}
        .mtr-detail{font-size:11px;color:var(--ink-3);margin-top:3px;line-height:1.35}
        .mtr-cat{display:inline-block;margin-top:7px;font-size:8.5px;font-weight:800;text-transform:uppercase;
          letter-spacing:.1em;color:#fff;background:var(--fs-green);padding:2px 7px}

        .ov-two{margin-bottom:22px}
        .ov-bg{margin:0 0 12px;font-size:13.5px;line-height:1.62;color:var(--ink-2)}
        .ov-out{margin:0;font-size:13px;line-height:1.55;color:var(--ink-3)}
        .ov-align-top{display:flex;align-items:baseline;gap:8px;margin-bottom:10px}
        .ov-align-pct{font-size:36px;font-weight:800;color:var(--ink);letter-spacing:-.02em;font-variant-numeric:tabular-nums}
        .ov-align-sym{font-size:18px;color:var(--accent-ink)}
        .ov-align-goal{font-size:12px;color:var(--ink-3)}
        .align-track{height:12px;background:var(--tile);border:1px solid var(--hair);overflow:hidden}
        .align-fill{height:100%;background:var(--fs-green);transition:width .7s cubic-bezier(.2,.7,.3,1)}
        .ms-row{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--hair)}
        .ms-row:last-child{border-bottom:none}
        .ms-dot{width:9px;height:9px;border-radius:0;flex:0 0 auto;background:var(--ds-yellow);border:1px solid var(--hair)}
        .ms-dot.delivered{background:var(--fs-green)}
        .ms-dot.in-progress{background:var(--ds-blue)}
        .ov-deliv{animation:ovRise .45s ease both}
      `}</style>
    </div>
  );
}
