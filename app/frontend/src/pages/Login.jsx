import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useConfig } from "../config.jsx";
import { FS_LOGO } from "../fslogo.js";

// Background scene: a geometric data pipeline that FRAMES the login card. The
// viewBox mirrors the card's proportions with tight gutters; nodes flank the
// card and right-angle connectors hug its edges, so it scales cleanly to any
// screen (preserveAspectRatio "meet" => never clips off-screen). Loops.
// simple geometric line icons drawn inside a node, centered on (cx, cy)
function NodeIcon({ kind, cx, cy, color }) {
  const p = { fill: "none", stroke: color, strokeWidth: 2.4, strokeLinecap: "round", strokeLinejoin: "round" };
  const g = (children) => <g transform={`translate(${cx - 16} ${cy - 16})`}>{children}</g>; // 32x32 box
  switch (kind) {
    case "connect": // two plugs linking
      return g(<>
        <rect x="2" y="11" width="11" height="10" {...p} />
        <rect x="19" y="11" width="11" height="10" {...p} />
        <path d="M13 16 H19" {...p} />
      </>);
    case "catalog": // stacked rows / catalog
      return g(<>
        <rect x="3" y="4" width="26" height="24" {...p} />
        <path d="M3 12 H29 M3 20 H29 M11 4 V28" {...p} />
      </>);
    case "map": // connected nodes graph
      return g(<>
        <circle cx="6" cy="7" r="3.2" {...p} />
        <circle cx="26" cy="9" r="3.2" {...p} />
        <circle cx="15" cy="25" r="3.2" {...p} />
        <path d="M8.6 9 L12.6 22 M23.4 11 L17 22 M9 7.6 L23 9" {...p} />
      </>);
    case "enrich": // spark / plus burst
      return g(<>
        <path d="M16 4 V13 M16 19 V28 M4 16 H13 M19 16 H28" {...p} />
        <path d="M9 9 L12 12 M23 9 L20 12 M9 23 L12 20 M23 23 L20 20" {...p} />
      </>);
    case "report": // document with lines
      return g(<>
        <path d="M7 3 H21 L26 8 V29 H7 Z" {...p} />
        <path d="M21 3 V8 H26 M11 15 H22 M11 20 H22 M11 25 H18" {...p} />
      </>);
    case "package": // box / cube
      return g(<>
        <path d="M16 3 L28 9 V23 L16 29 L4 23 V9 Z" {...p} />
        <path d="M4 9 L16 15 L28 9 M16 15 V29" {...p} />
      </>);
    default: return null;
  }
}

function DataScene() {
  // Frame: card sits centered in the viewBox. The centre "safe zone" is kept
  // comfortably WIDER than the real login card (~430px) so the flanking nodes are
  // never covered by it. The SVG is size-capped in CSS so scaling stays sane.
  const VB = { w: 1360, h: 740 };
  const card = { x: 430, y: 90, w: 500, h: 520 };   // safe zone (real card sits inside)
  const S = 132;                                     // square node size
  // colour-coded by stage: Infrastructure / Collection / Processing / Unification / Presentation
  const stage = {
    I: { c: "var(--ds-blue)" },
    C: { c: "var(--ds-teal)" },
    G: { c: "var(--fs-green)" },
    U: { c: "var(--ds-yellow)" },
    P: { c: "var(--ds-lilac)" },
  };
  const lx = card.x - 78 - S;                        // left column x
  const rx = card.x + card.w + 78;                   // right column x
  // both columns share the same three rows so the two sides mirror each other
  const rowY = [96, 300, 504];
  const [y1, y2, y3] = rowY;
  // journey: Connect(I) -> Catalog(C) -> Map(U) -> Enrich(Processing) -> Package(P) -> Report(P)
  const nodes = [
    { x: lx, y: y1, icon: "connect", name: "Connect", s: "I" },
    { x: lx, y: y2, icon: "catalog", name: "Catalog", s: "C" },
    { x: lx, y: y3, icon: "map",     name: "Map",     s: "U" },
    { x: rx, y: y3, icon: "enrich",  name: "Enrich",  s: "G" },   // bottom-right (Processing)
    { x: rx, y: y2, icon: "package", name: "Package", s: "P" },   // mid-right
  ];
  const report = { x: rx, y: y1, icon: "report", name: "Report", s: "P" }; // top-right, last
  const cyOf = (y) => y + S / 2;
  const lcx = lx + S / 2, rcx = rx + S / 2;
  const chL = card.x - 30;                            // vertical channel left of card
  const chR = card.x + card.w + 30;                  // vertical channel right of card
  const chB = card.y + card.h + 26;                  // horizontal channel below card
  // each connector is coloured by the stage of the node it FEEDS INTO
  const connectors = [
    { d: `M ${lcx} ${y1 + S} L ${lcx} ${y2}`, s: "C" },        // -> Catalog
    { d: `M ${lcx} ${y2 + S} L ${lcx} ${y3}`, s: "U" },        // -> Map
    { d: `M ${lx + S} ${cyOf(y3)} L ${chL} ${cyOf(y3)} L ${chL} ${chB} L ${chR} ${chB} L ${chR} ${cyOf(y3)} L ${rx} ${cyOf(y3)}`, s: "G" }, // -> Enrich (Processing)
    { d: `M ${rcx} ${y3} L ${rcx} ${y2 + S}`, s: "P" },        // -> Package
    { d: `M ${rcx} ${y2} L ${rcx} ${y1 + S}`, s: "P" },        // -> Report
  ];

  const Node = ({ n, className, style }) => (
    <g className={className} style={style}>
      <rect x={n.x} y={n.y} width={S} height={S} fill="var(--paper)" stroke="var(--grid-line)" strokeWidth="2" />
      <rect x={n.x} y={n.y} width={S} height="6" fill={stage[n.s].c} />
      <NodeIcon kind={n.icon} cx={n.x + S / 2} cy={n.y + S / 2 - 8} color="var(--ink)" />
      <text x={n.x + S / 2} y={n.y + S - 20} textAnchor="middle" className="ds-node-n">{n.name}</text>
    </g>
  );

  return (
    <div className="ds-scene" aria-hidden="true">
      <svg viewBox={`0 0 ${VB.w} ${VB.h}`} preserveAspectRatio="xMidYMid meet" className="ds-svg">
        {/* connectors - right angles only, drawn on in sequence, stage-coloured */}
        <g fill="none" strokeWidth="2.5" strokeLinejoin="miter" strokeLinecap="butt">
          {connectors.map((w, i) => (
            <path key={i} d={w.d} stroke={stage[w.s].c} className="ds-wire" style={{ animationDelay: `${0.5 + i * 1.3}s` }} />
          ))}
        </g>

        {/* step nodes */}
        {nodes.map((n, i) => (
          <Node key={i} n={n} className="ds-node" style={{ animationDelay: `${i * 1.3}s` }} />
        ))}

        {/* generated report - draws in last */}
        <Node n={report} className="ds-report" />
      </svg>
    </div>
  );
}

export default function Login() {
  const { profiles, users, pickProfile, login, deleteProfile } = useConfig();
  const nav = useNavigate();
  const OPEN_PIN = "2345";
  const [delId, setDelId] = useState(null);   // profile id in delete-confirm mode
  const [openId, setOpenId] = useState(null); // profile id in open-PIN mode
  const [openPin, setOpenPin] = useState("");
  const [openErr, setOpenErr] = useState(null);
  const [pin, setPin] = useState("");
  const [delErr, setDelErr] = useState(null);
  const [delBusy, setDelBusy] = useState(false);

  // Role is no longer a login step: profile pick lands straight in the app as
  // Admin (full access). The role is switched mid-demo from the Change Role genie.
  const adminUser = users.find((u) => u.role === "admin") || users[users.length - 1];
  const enter = (p) => { nav("/", { replace: true }); pickProfile(p); if (adminUser) login(adminUser); };

  // Start Fresh opens freely; a saved client project needs the PIN.
  const selectProfile = (p) => {
    if (p.mode === "generic") { enter(p); return; }
    setOpenId(p.id); setOpenPin(""); setOpenErr(null); setDelId(null);
  };
  const confirmOpen = (e, p) => {
    e.stopPropagation();
    if (openPin === OPEN_PIN) { enter(p); }
    else setOpenErr("Wrong PIN.");
  };
  const cancelOpen = (e) => { e.stopPropagation(); setOpenId(null); setOpenPin(""); setOpenErr(null); };

  const startDelete = (e, id) => { e.stopPropagation(); setDelId(id); setOpenId(null); setPin(""); setDelErr(null); };
  const cancelDelete = (e) => { e.stopPropagation(); setDelId(null); setPin(""); setDelErr(null); };
  const confirmDelete = async (e, id) => {
    e.stopPropagation();
    setDelBusy(true); setDelErr(null);
    const out = await deleteProfile(id, pin);
    setDelBusy(false);
    if (out.ok) { setDelId(null); setPin(""); }
    else setDelErr(out.error || "Wrong PIN.");
  };

  return (
    <div className="login">
      <div className="login-card">
        <div className="login-strip" />
        <div className="login-inner">
          <div className="login-head">
            <img src={FS_LOGO} alt="Findability Sciences" className="login-logo" />
          </div>
          <div className="login-title"><span className="login-dash">BPC</span> for Data</div>

          <>
              <div className="login-step"><span className="s-num">Profile</span> Select a client profile</div>
              <div className="login-list">
                {profiles.map((p) => (
                  <div key={p.id} className={"lrow" + (delId === p.id || openId === p.id ? " deleting" : "")}
                    role="button" tabIndex={0}
                    onClick={() => { if (delId !== p.id && openId !== p.id) selectProfile(p); }}>
                    {delId === p.id ? (
                      <div className="lrow-del" onClick={(e) => e.stopPropagation()}>
                        <span className="lrow-del-lbl">PIN to delete</span>
                        <input className="lrow-pin" type="password" inputMode="numeric" autoFocus
                          value={pin} placeholder="••••" onChange={(e) => setPin(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && confirmDelete(e, p.id)} />
                        {delErr && <span className="lrow-del-err">{delErr}</span>}
                        <button className="lrow-del-btn danger" disabled={delBusy} onClick={(e) => confirmDelete(e, p.id)}>{delBusy ? "…" : "Delete"}</button>
                        <button className="lrow-del-btn" onClick={cancelDelete}>Cancel</button>
                      </div>
                    ) : openId === p.id ? (
                      <div className="lrow-del" onClick={(e) => e.stopPropagation()}>
                        <span className="lrow-del-lbl">PIN to open</span>
                        <input className="lrow-pin" type="password" inputMode="numeric" autoFocus
                          value={openPin} placeholder="••••" onChange={(e) => setOpenPin(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && confirmOpen(e, p)} />
                        {openErr && <span className="lrow-del-err">{openErr}</span>}
                        <button className="lrow-del-btn go" onClick={(e) => confirmOpen(e, p)}>Open</button>
                        <button className="lrow-del-btn" onClick={cancelOpen}>Cancel</button>
                      </div>
                    ) : (
                      <>
                        <span className={"lrow-tag " + (p.mode === "generic" ? "" : "on")}>{p.mode === "generic" ? "New" : p.isDemo ? "Mock" : "Client"}</span>
                        <span className="lrow-name">{p.name}</span>
                        {p.mode !== "generic" && (
                          <button className="lrow-trash" title="Delete project" onClick={(e) => startDelete(e, p.id)} aria-label="Delete project">
                            <svg width="15" height="15" viewBox="0 0 16 16"><path d="M3 4h10M6.5 4V3h3v1M5 4l.5 9h5L11 4" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </button>
                        )}
                        <svg className="lrow-arrow" width="16" height="16" viewBox="0 0 16 16"><path d="M3 8h9M8 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </>
                    )}
                  </div>
                ))}
              </div>
          </>
          <div className="login-foot">Enter as Admin · switch roles anytime from Change Role</div>
        </div>
      </div>

      <style>{`
        .login{position:fixed;inset:0;display:grid;place-items:center;
          overflow:auto;padding:24px;background:rgba(132,180,72,.08)}
        /* ---- geometric data-pipeline background scene (10s loop) ---- */
        /* kept subtle so the login card stays the prominent element */
        .ds-scene{position:fixed;inset:0;z-index:0;pointer-events:none;opacity:.55;
          display:grid;place-items:center;overflow:hidden}
        /* scale by WIDTH only (height:auto) so the centre safe-zone width tracks the
           viewport width and always stays wider than the real card (~430px); short
           screens just crop the top/bottom channel runs, never the side nodes */
        .ds-svg{width:min(100vw,1360px);height:auto;display:block}
        .ds-node-n{font:800 15px var(--font);fill:var(--ink);letter-spacing:-.01em}

        /* connectors: geometric draw-on, hold, fade before loop restart */
        .ds-wire{stroke-dasharray:3000;stroke-dashoffset:3000;
          animation:dsDraw 10s linear infinite}
        @keyframes dsDraw{
          0%,5%{stroke-dashoffset:3000;opacity:1}
          14%{stroke-dashoffset:0;opacity:1}
          86%{stroke-dashoffset:0;opacity:1}
          94%,100%{stroke-dashoffset:0;opacity:0}
        }
        /* step nodes pop in just before their outgoing connector */
        .ds-node{opacity:0;transform-box:fill-box;transform-origin:center;
          animation:dsPop 10s ease-in-out infinite}
        @keyframes dsPop{
          0%{opacity:0;transform:translateY(6px) scale(.97)}
          8%{opacity:1;transform:none}
          86%{opacity:1}
          94%,100%{opacity:0}
        }
        /* report generates after the pipeline completes */
        .ds-report{opacity:0;transform-box:fill-box;transform-origin:center;
          animation:dsReport 10s ease-in-out infinite}
        @keyframes dsReport{
          0%,66%{opacity:0;transform:translateY(10px) scale(.96)}
          74%{opacity:1;transform:none}
          88%{opacity:1}
          95%,100%{opacity:0}
        }

        @media(prefers-reduced-motion:reduce){
          .ds-wire,.ds-node,.ds-report{animation:none;opacity:.6;stroke-dashoffset:0}
        }
        @media(max-width:1200px){.ds-scene{display:none}}

        .login-card{position:relative;z-index:1;width:430px;max-width:100%;background:var(--paper);
          border:var(--grid-w) solid var(--grid-line);border-radius:0;box-shadow:var(--halo);overflow:hidden;
          display:flex;flex-direction:column;max-height:calc(100vh - 48px)}
        .login-strip{height:5px;background:var(--fs-green);border-bottom:var(--grid-w) solid var(--grid-line);flex:0 0 auto}
        .login-inner{padding:26px 28px 20px;display:flex;flex-direction:column;min-height:0;overflow:hidden}
        .login-head{display:flex;align-items:center;gap:13px;margin-bottom:10px}
        .login-logo{height:22px}
        .login-badge{display:inline-flex;align-items:center;gap:6px;font-size:10.5px;font-weight:700;color:var(--ink-2)}
        .login-badge .bpc{background:var(--accent-tint);color:var(--accent-ink);padding:2px 7px;font-size:9.5px;font-weight:800;letter-spacing:.08em;border-radius:0}
        .login-badge .dash{color:var(--ink-4)}
        .login-title{font-size:25px;font-weight:800;letter-spacing:-.025em;color:var(--ink)}
        .login-title .login-dash{color:var(--accent);margin:0 2px}
        .login-step{font-size:12px;color:var(--ink-2);margin:8px 0 18px;font-weight:600;display:flex;align-items:center;gap:9px}
        .login-step .s-num{font-size:9px;text-transform:uppercase;letter-spacing:.12em;font-weight:800;color:#fff;
          background:var(--fs-green);border:1.5px solid var(--grid-line);padding:3px 8px;border-radius:0}
        .login-step b{color:var(--ink);font-weight:800}
        .login-back{margin-left:auto;background:var(--paper);border:1.5px solid var(--grid-line);color:var(--ink-2);
          font:800 9px var(--font);text-transform:uppercase;letter-spacing:.08em;padding:4px 9px;border-radius:0;cursor:pointer}
        .login-back:hover{background:var(--tile)}
        .login-list{display:grid;gap:10px;overflow-y:auto;min-height:0;padding:2px 2px 2px 0;margin-right:-2px}
        .lrow{display:flex;align-items:center;gap:11px;text-align:left;cursor:pointer;background:var(--paper);
          border:var(--grid-w) solid var(--grid-line);border-radius:0;padding:13px 15px;color:var(--ink);
          box-shadow:var(--soft);transition:box-shadow .14s,transform .1s}
        .lrow:hover{box-shadow:var(--lift);transform:translateY(-2px)}
        .lrow-tag{font-size:8px;text-transform:uppercase;letter-spacing:.1em;font-weight:800;padding:3px 8px;border-radius:0;
          background:var(--paper);border:1.5px solid var(--grid-line);color:var(--ink)}
        .lrow-tag.on{background:var(--fs-green);color:#fff}
        .lrow-name{font-size:14px;font-weight:800}
        .lrow-desc{font-size:11px;color:var(--ink-3);font-weight:600}
        .lrow.role{align-items:flex-start}
        .lrow-rmain{display:flex;flex-direction:column;gap:5px;min-width:0}
        .lrow-shows{font-size:11px;color:var(--ink-2);font-weight:600;line-height:1.5;display:flex;flex-wrap:wrap;
          align-items:center;gap:6px}
        .lrow-shows-lbl{font-size:8px;text-transform:uppercase;letter-spacing:.1em;font-weight:800;color:#fff;
          background:var(--fs-green);border:1.5px solid var(--grid-line);padding:2px 6px;border-radius:0}
        .lrow-arrow{margin-left:auto;color:var(--ink-3);flex:0 0 auto;align-self:center}
        .lrow:hover .lrow-arrow{color:var(--accent)}
        .lrow-trash{margin-left:auto;background:transparent;border:1.5px solid transparent;color:var(--ink-4);
          width:28px;height:28px;display:flex;align-items:center;justify-content:center;cursor:pointer;border-radius:0;padding:0}
        .lrow-trash:hover{color:var(--ds-red);border-color:var(--grid-line);background:var(--paper)}
        .lrow-trash + .lrow-arrow{margin-left:8px}
        .lrow.deleting{cursor:default;background:var(--paper);border-color:var(--grid-line)}
        .lrow-del{display:flex;align-items:center;gap:9px;width:100%;flex-wrap:wrap}
        .lrow-del-lbl{font-size:9px;text-transform:uppercase;letter-spacing:.1em;font-weight:800;color:var(--ink-3)}
        .lrow-pin{width:74px;height:30px;border:1px solid var(--hair);padding:0 10px;font:700 14px var(--font);
          letter-spacing:.2em;text-align:center;background:var(--tile);color:var(--ink);border-radius:0}
        .lrow-pin:focus{outline:none;border-color:var(--fs-green);box-shadow:0 0 0 3px var(--accent-tint)}
        .lrow-del-err{font-size:10.5px;color:var(--err);font-weight:700;flex-basis:100%}
        .lrow-del-btn{margin-left:auto;font:800 9px var(--font);text-transform:uppercase;letter-spacing:.08em;
          padding:7px 11px;border:1px solid var(--hair);background:var(--tile);color:var(--ink-2);cursor:pointer;border-radius:0}
        .lrow-del-btn:hover{background:var(--tile-2)}
        .lrow-del-btn.danger{margin-left:0;background:var(--err);border-color:var(--err);color:#fff}
        .lrow-del-btn.danger:hover{filter:brightness(.94)}
        .lrow-del-btn.go{margin-left:0;background:var(--fs-green);border-color:var(--fs-green);color:#fff}
        .lrow-del-btn.go:hover{filter:brightness(.94)}
        .lrow-del-btn:disabled{opacity:.6;cursor:default}
        .login-foot{font-size:9px;color:var(--ink-4);text-align:center;margin-top:16px;
          text-transform:uppercase;letter-spacing:.14em;font-weight:700}
      `}</style>
    </div>
  );
}
