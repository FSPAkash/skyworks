import { useState } from "react";
import { useConfig } from "../config.jsx";
import { FS_LOGO } from "../fslogo.js";

// Overview = a compact delivery timeline bar. A single week axis carries every
// deliverable as a node (code only) that alternates above/below the line; each
// node is joined to the axis by a half-square (L) connector that traces its week
// span - so overlapping spans read cleanly. Delivered nodes open the artifact;
// delayed nodes reveal the reason on hover. Below it: an expandable full Gantt,
// and (admin-gated) an expandable usage-metrics section.

function stateOf(d, phase, currentWeek) {
  const due = phase?.weekEnd ?? 0;
  if (d.status === "delayed") return "delayed";
  if (d.status === "delivered") return "delivered";
  if (currentWeek > 0 && due > 0 && currentWeek >= due) return "delayed";
  if (d.status === "in-progress") return "active";
  return "upcoming";
}
const STATE_LABEL = { delivered: "Delivered", delayed: "Delayed", active: "In progress", upcoming: "Upcoming" };

// short badge shown on each deliverable pill for its stage/group
const GROUP_TAG = { Infrastructure: "I", Collection: "C", Unification: "U", BPC: "BPC", "Exec Strategy": "Exec" };
const groupTag = (d) => GROUP_TAG[d.group] || "";

// radial gauge for the usage meters (shared shape with the Presentation page)
function MeterGauge({ value = 0, tone = "green" }) {
  const R = 26, C = 2 * Math.PI * R;
  const pct = Math.max(0, Math.min(100, value));
  const dash = (pct / 100) * C;
  const stroke = tone === "blue" ? "var(--ds-blue)" : "var(--fs-green)";
  return (
    <svg className="gauge" width="72" height="72" viewBox="0 0 72 72">
      <circle cx="36" cy="36" r={R} fill="none" stroke="var(--hair)" strokeWidth="7" />
      <circle cx="36" cy="36" r={R} fill="none" stroke={stroke} strokeWidth="7"
        strokeLinecap="round" strokeDasharray={`${dash} ${C}`} transform="rotate(-90 36 36)" className="gauge-arc" />
      <text x="36" y="40" textAnchor="middle" className="gauge-txt">{pct}%</text>
    </svg>
  );
}

export default function Overview() {
  const { config, sources } = useConfig();
  const { client, deliverables, phases } = config;
  const weeks = client.activeWeeks || 0;
  const currentWeek = client.currentWeek || 0;
  const scheduled = weeks > 0;
  const phaseOf = (id) => phases.find((p) => p.id === id);

  const [openReason, setOpenReason] = useState(null);
  const [hoverId, setHoverId] = useState(null);
  const [metersOpen, setMetersOpen] = useState(false);

  const meters = sources.meters || [];
  const showMetersSection = !!config.settings?.metersOnOverview && meters.length > 0;

  // Each deliverable becomes a rounded span "pill" covering its phase weeks. Pills
  // alternate above/below a slim week rail and pack into lanes so overlapping
  // spans never collide; a small inset separates one span's finish from the next
  // one's start. The current week is shown as a soft tinted band (no hard line).
  const INSET = 0.12;                                 // week-fraction pulled in at each end
  const laneEnds = { above: [], below: [] };
  const items = deliverables.map((d, idx) => {
    const p = phaseOf(d.phase) || { weekStart: 1, weekEnd: 1, name: "" };
    // a deliverable may override the phase span with its own weekStart/weekEnd
    // (used to shift a single deliverable off its phase, e.g. a slip).
    const baseStart = d.weekStart ?? p.weekStart ?? 1;
    const baseEnd = d.weekEnd ?? p.weekEnd ?? baseStart;
    const ws = Math.max(1, Math.min(weeks || 1, baseStart));
    const we = Math.max(ws, Math.min(weeks || 1, baseEnd));
    // a deliverable may pin itself to a side (e.g. D4/D5 sit together below);
    // otherwise it alternates above/below by index
    const side = d.timelineSide === "above" || d.timelineSide === "below"
      ? d.timelineSide
      : (idx % 2 === 0 ? "above" : "below");
    let lane = laneEnds[side].findIndex((end) => ws > end);
    if (lane === -1) { lane = laneEnds[side].length; laneEnds[side].push(we); }
    else laneEnds[side][lane] = we;
    const startPct = weeks ? ((ws - 1 + INSET) / weeks) * 100 : 0;
    const endPct = weeks ? ((we - INSET) / weeks) * 100 : 0;
    const midPct = (startPct + endPct) / 2;
    return { d, p, ws, we, startPct, endPct, midPct, side, lane, state: stateOf(d, p, currentWeek) };
  });
  const lanesAbove = laneEnds.above.length || 1;
  const lanesBelow = laneEnds.below.length || 1;
  const LANE = 48;                                    // px per pill lane
  const GAP = 30;                                     // rail-to-first-lane gap
  const RAIL = 28;                                    // week-number rail height (weeks only now)
  const railY = (lanesAbove - 1) * LANE + GAP + RAIL / 2;   // rail centre-line y
  const plotH = railY + RAIL / 2 + GAP + (lanesBelow - 1) * LANE + 6;
  const weekW = weeks ? 100 / weeks : 0;

  const onNode = (it) => {
    if (it.state === "delivered" && it.d.artifact) {
      window.open(it.d.artifact, "_blank", "noopener");
    } else if (it.state === "delayed" && it.d.delayReason) {
      setOpenReason(openReason === it.d.id ? null : it.d.id);
    }
  };

  return (
    <div className="ov">
      {/* the timeline bar - title now sits inside the container top */}
      <div className="ov-card">
        <div className="ov-card-head">
          <h1 className="ov-h1">Delivery timeline</h1>
          {scheduled && <span className="ov-card-week">Week {currentWeek} of {weeks}</span>}
        </div>
        {scheduled ? (
          <>
            <div className="tb-plot" style={{ height: plotH }}>
              {/* the week-number rail (weeks only; current week is the sole highlight) */}
              <div className="tb-rail-bar" style={{ top: railY - RAIL / 2, height: RAIL }}>
                {Array.from({ length: weeks }, (_, i) => i + 1).map((w) => (
                  <div key={w} className={"tb-wkcell" + (w === currentWeek ? " now" : "")}
                    style={{ left: `${((w - 1) / weeks) * 100}%`, width: `${weekW}%` }}>
                    {w === currentWeek ? `NOW - W${w}` : `W${w}`}
                  </div>
                ))}
              </div>

              {/* deliverable span pills */}
              {items.map((it) => {
                const pillY = it.side === "above"
                  ? railY - RAIL / 2 - GAP - it.lane * LANE
                  : railY + RAIL / 2 + GAP + it.lane * LANE;
                const clickable = it.state === "delivered" && it.d.artifact;
                const hasReason = it.state === "delayed" && it.d.delayReason;
                const showTip = hoverId === it.d.id;
                return (
                  <div key={it.d.id} className={"tb-item " + it.state}>
                    {/* the rounded span pill */}
                    <button type="button"
                      className={"tb-pill" + (openReason === it.d.id ? " sel" : "") + (clickable || hasReason ? " act" : "")}
                      style={{ left: `${it.startPct}%`, width: `${it.endPct - it.startPct}%`, top: pillY }}
                      onClick={() => onNode(it)}
                      onMouseEnter={() => { setHoverId(it.d.id); if (hasReason) setOpenReason(it.d.id); }}
                      onMouseLeave={() => { setHoverId((c) => (c === it.d.id ? null : c)); if (hasReason) setOpenReason((c) => (c === it.d.id ? null : c)); }}>
                      <span className="tb-dot" />
                      <span className="tb-grp">{groupTag(it.d)}</span>
                      <span className="tb-code">{it.d.code}</span>
                      {it.state === "delivered" && <span className="tb-tag">Open ↗</span>}
                      {it.state === "delayed" && <span className="tb-tag">delayed</span>}
                    </button>
                    {/* hover tooltip: name + span + status (all pills) */}
                    {showTip && !(hasReason && openReason === it.d.id) && (
                      <div className={"tb-tip " + it.state} style={{ left: `${it.midPct}%`, top: it.side === "above" ? pillY - 18 : pillY + 18, transform: it.side === "above" ? "translate(-50%,-100%)" : "translate(-50%,0)" }}>
                        <span className="tb-tip-code">{it.d.code} · W{it.ws}{it.we !== it.ws ? `–${it.we}` : ""}</span>
                        <span className="tb-tip-name">{it.d.name}</span>
                        <span className="tb-tip-meta">{STATE_LABEL[it.state]}{clickable ? " · click to open" : ""}</span>
                      </div>
                    )}
                    {/* delay reason popover takes over on hover for delayed pills */}
                    {hasReason && openReason === it.d.id && (
                      <div className="tb-reason" style={{ left: `${it.midPct}%`, top: it.side === "above" ? pillY - 14 : pillY + 14, transform: it.side === "above" ? "translate(-50%,-100%)" : "translate(-50%,0)" }}>
                        <span className="tb-reason-tag">{it.d.code} · {it.d.name} — delayed</span>
                        <p>{it.d.delayReason}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="tb-legend">
              <span><i className="delivered" /> Delivered — click to open</span>
              <span><i className="active" /> In progress</span>
              <span><i className="delayed" /> Delayed — hover for reason</span>
              <span><i className="upcoming" /> Upcoming</span>
              <span><i className="nowband" /> Current week</span>
            </div>
          </>
        ) : (
          <div className="ov-empty">No schedule yet. Set up the engagement to see the delivery timeline.</div>
        )}
      </div>

      {/* admin-gated usage-metrics expander */}
      {showMetersSection && (
        <div className="ov-exp">
          <button type="button" className="ov-exp-toggle" onClick={() => setMetersOpen((o) => !o)} aria-expanded={metersOpen}>
            <span className={"ov-caret" + (metersOpen ? " open" : "")}>▸</span>
            Usage metrics
            <span className="ov-exp-count">{meters.length}</span>
          </button>
          {metersOpen && (
            <div className="ov-exp-body">
              <div className="mtr-grid">
                {meters.map((m, i) => (
                  <div key={m.label} className="mtr-tile" style={{ animationDelay: `${i * 60}ms` }}>
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
          )}
        </div>
      )}

      <div className="footer-note">
        <span>Confidential</span> · <img src={FS_LOGO} alt="FS" />
      </div>

      <style>{`
        @keyframes ovRise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        @keyframes gaugeIn{from{stroke-dasharray:0 999}}
        @media(prefers-reduced-motion:reduce){.ov *{animation:none!important}}
        .ov{animation:ovRise .45s ease both}

        /* timeline title row - sits inside the container top */
        .ov-card-head{display:flex;align-items:baseline;gap:12px;margin-bottom:20px;
          padding-bottom:14px;border-bottom:1px solid var(--hair)}
        .ov-h1{margin:0;font-size:20px;font-weight:800;letter-spacing:-.02em;color:var(--ink)}
        .ov-card-week{margin-left:auto;font-size:11px;font-weight:800;text-transform:uppercase;
          letter-spacing:.08em;color:var(--ink-3);font-variant-numeric:tabular-nums}

        /* frosted-glass timeline container */
        .ov-card{background:rgba(255,255,255,.55);backdrop-filter:blur(20px) saturate(1.4);
          -webkit-backdrop-filter:blur(20px) saturate(1.4);border:1px solid rgba(255,255,255,.65);
          box-shadow:var(--halo);padding:22px 26px 18px;margin-bottom:16px;
          background-image:radial-gradient(120% 140% at 0% 0%,rgba(132,180,72,.10),transparent 55%),
            radial-gradient(120% 140% at 100% 100%,rgba(91,127,184,.10),transparent 55%)}
        .ov-empty{font-size:13px;color:var(--ink-3);padding:6px 0}

        /* timeline plot */
        .tb-plot{position:relative;width:100%}

        /* the week-number rail - bold cell edges mark each week start/end */
        .tb-rail-bar{position:absolute;left:0;right:0;z-index:1;border:1.5px solid var(--line-strong);
          border-radius:6px;overflow:hidden;background:var(--paper)}
        .tb-wkcell{position:absolute;top:0;bottom:0;display:flex;align-items:center;justify-content:center;
          border-right:1.5px solid var(--line-strong);font-size:11px;font-weight:700;color:var(--ink-2);
          font-variant-numeric:tabular-nums;letter-spacing:.02em}
        .tb-wkcell:last-child{border-right:none}
        .tb-wkcell.now{background:var(--fs-green);color:#fff;font-weight:800;font-size:10px;letter-spacing:.03em}


        /* rounded span pill */
        .tb-pill{position:absolute;transform:translateY(-50%);display:flex;align-items:center;gap:7px;
          min-width:56px;height:30px;padding:0 12px;border:1px solid transparent;border-radius:999px;
          cursor:default;font:800 11.5px var(--font);letter-spacing:.01em;z-index:4;white-space:nowrap;
          backdrop-filter:blur(8px) saturate(1.3);-webkit-backdrop-filter:blur(8px) saturate(1.3);
          box-shadow:0 1px 2px rgba(27,29,24,.08),0 3px 8px -4px rgba(27,29,24,.18);transition:transform .14s ease,box-shadow .14s ease}
        .tb-pill.act{cursor:pointer}
        .tb-pill.act:hover{transform:translateY(-50%) translateY(-1px);box-shadow:0 2px 4px rgba(27,29,24,.1),0 8px 16px -6px rgba(27,29,24,.26)}
        .tb-dot{width:8px;height:8px;border-radius:50%;flex:0 0 auto;background:currentColor;opacity:.9}
        .tb-grp{font-size:8.5px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;
          padding:1px 5px;border:1px solid currentColor;border-radius:999px;opacity:.85;flex:0 0 auto}
        .tb-code{font-weight:800}
        .tb-tag{font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;opacity:.8;
          padding-left:3px;border-left:1px solid currentColor;margin-left:1px}
        /* translucent glass fills with a saturated edge + text (blur reads through) */
        .tb-item.delivered .tb-pill{background:rgba(231,241,218,.62);border-color:var(--ok);color:var(--ok)}
        .tb-item.active .tb-pill{background:rgba(233,240,250,.62);border-color:var(--ds-blue);color:var(--ds-blue)}
        .tb-item.delayed .tb-pill{background:rgba(246,231,228,.62);border-color:var(--err);color:var(--err)}
        .tb-item.upcoming .tb-pill{background:rgba(255,255,255,.5);border-color:var(--line-strong);color:var(--ink-3)}
        .tb-pill.sel{box-shadow:0 0 0 3px var(--paper),0 0 0 4px currentColor}

        /* hover tooltip: code + name + span + status (pointer-events off so it
           never steals the hover from its pill and thrashes enter/leave) */
        .tb-tip{position:absolute;z-index:11;width:210px;max-width:66vw;background:var(--paper);
          border:1px solid var(--hair);box-shadow:var(--halo);padding:9px 11px;border-radius:6px;
          animation:ovRise .12s ease both;pointer-events:none}
        .tb-tip-code{display:block;font-size:9.5px;font-weight:800;letter-spacing:.04em;color:var(--green-ink)}
        .tb-tip-name{display:block;font-size:12px;font-weight:700;color:var(--ink);margin:2px 0 4px;line-height:1.3}
        .tb-tip-meta{display:block;font-size:10px;color:var(--ink-3)}

        /* delay reason popover */
        .tb-reason{position:absolute;z-index:12;width:240px;max-width:70vw;background:var(--paper);
          border:1px solid var(--err);box-shadow:var(--halo);padding:10px 12px;border-radius:6px;pointer-events:none}
        .tb-reason-tag{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.09em;color:var(--err)}
        .tb-reason p{margin:5px 0 0;font-size:11.5px;line-height:1.5;color:var(--ink);font-weight:500}

        .tb-legend{display:flex;flex-wrap:wrap;gap:16px;margin-top:16px;padding-top:14px;
          border-top:1px solid var(--hair);font-size:11px;color:var(--ink-3)}
        .tb-legend i{display:inline-block;width:11px;height:11px;margin-right:6px;vertical-align:-1px;border-radius:50%}
        .tb-legend i.delivered{background:var(--ok-soft);border:1.5px solid var(--ok)}
        .tb-legend i.active{background:#E9F0FA;border:1.5px solid var(--ds-blue)}
        .tb-legend i.delayed{background:var(--err-soft);border:1.5px solid var(--err)}
        .tb-legend i.upcoming{background:var(--paper);border:1.5px solid var(--line-strong)}
        .tb-legend i.nowband{border-radius:2px;background:var(--fs-green);border:none}

        /* expanders (gantt + meters) */
        .ov-exp{background:var(--paper);border:1px solid var(--hair);box-shadow:var(--soft);margin-bottom:16px}
        .ov-exp-toggle{display:flex;align-items:center;gap:9px;width:100%;background:none;border:none;cursor:pointer;
          padding:13px 18px;font:800 12px var(--font);text-transform:uppercase;letter-spacing:.07em;color:var(--ink)}
        .ov-caret{display:inline-block;transition:transform .18s ease;color:var(--ink-3);font-size:11px}
        .ov-caret.open{transform:rotate(90deg)}
        .ov-exp-count{margin-left:auto;font-size:11px;font-weight:800;color:var(--ink-3);background:var(--tile);padding:2px 8px}
        .ov-exp-body{border-top:1px solid var(--hair);padding:16px 18px;animation:ovRise .25s ease both}

        /* deliverables grid: code · definition · status · open */
        .ov-dgrid{padding:0}
        .dg-row{display:grid;grid-template-columns:52px 1fr 150px 70px;align-items:center;gap:12px;
          padding:12px 18px;border-bottom:1px solid var(--hair)}
        .dg-row:last-child{border-bottom:none}
        .dg-row.open{cursor:pointer}
        .dg-row.open:hover{background:var(--tile)}
        .dg-code{font-size:12.5px;font-weight:800;color:var(--green-ink)}
        .dg-def{font-size:13px;color:var(--ink);min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .dg-status{display:inline-flex;align-items:center;gap:7px;font-size:11px;font-weight:700;text-transform:uppercase;
          letter-spacing:.04em;color:var(--ink-2)}
        .dg-status i{width:9px;height:9px;border-radius:50%;flex:0 0 auto}
        .dg-status.delivered i{background:var(--ok)} .dg-status.delivered{color:var(--ok)}
        .dg-status.active i{background:var(--ds-blue)} .dg-status.active{color:var(--ds-blue)}
        .dg-status.delayed i{background:var(--err)} .dg-status.delayed{color:var(--err)}
        .dg-status.upcoming i{background:var(--line-strong)} .dg-status.upcoming{color:var(--ink-3)}
        .dg-open{font-size:11px;font-weight:800;color:var(--green-ink);text-align:right}
        @media(max-width:640px){.dg-row{grid-template-columns:44px 1fr auto;gap:8px}.dg-open{display:none}}

        /* usage-meter tiles */
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
      `}</style>
    </div>
  );
}
