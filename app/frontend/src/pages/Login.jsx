import { useState } from "react";
import { useConfig } from "../config.jsx";
import { FS_LOGO } from "../fslogo.js";

const ROLE_DESC = {
  "c-level": "Presentation deliverables and Gantt.",
  "data-science": "Full access, every layer.",
  "delivery": "Journey, deliverables, Gantt, connections.",
  "admin": "Full access plus profiles.",
};

export default function Login() {
  const { profiles, users, profile, pickProfile, login, roleLabel, deleteProfile } = useConfig();
  const [step, setStep] = useState(profile ? 1 : 0);
  const OPEN_PIN = "2345";
  const [delId, setDelId] = useState(null);   // profile id in delete-confirm mode
  const [openId, setOpenId] = useState(null); // profile id in open-PIN mode
  const [openPin, setOpenPin] = useState("");
  const [openErr, setOpenErr] = useState(null);
  const [pin, setPin] = useState("");
  const [delErr, setDelErr] = useState(null);
  const [delBusy, setDelBusy] = useState(false);

  // Start Fresh opens freely; a saved client project needs the PIN.
  const selectProfile = (p) => {
    if (p.mode === "generic") { pickProfile(p); setStep(1); return; }
    setOpenId(p.id); setOpenPin(""); setOpenErr(null); setDelId(null);
  };
  const confirmOpen = (e, p) => {
    e.stopPropagation();
    if (openPin === OPEN_PIN) { pickProfile(p); setStep(1); }
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
      <div className="login-anim" aria-hidden="true">
        <span className="blob b1" /><span className="blob b2" /><span className="blob b3" />
        <div className="login-grid" />
      </div>

      <div className="login-card">
        <div className="login-strip" />
        <div className="login-inner">
          <div className="login-head">
            <img src={FS_LOGO} alt="Findability Sciences" className="login-logo" />
          </div>
          <div className="login-title">Data <span className="login-dash">-</span> BPC</div>

          {step === 0 ? (
            <>
              <div className="login-step"><span className="s-num">1 / 2</span> Select a client profile</div>
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
                        <span className={"lrow-tag " + (p.mode === "generic" ? "" : "on")}>{p.mode === "generic" ? "New" : "Client"}</span>
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
          ) : (
            <>
              <div className="login-step">
                <span className="s-num">2 / 2</span> <b>{profile?.name}</b>
                <button className="login-back" onClick={() => setStep(0)}>Change</button>
              </div>
              <div className="login-list">
                {users.map((u) => (
                  <button key={u.id} className="lrow" onClick={() => login(u)}>
                    <span className="lrow-name">{roleLabel[u.role]}</span>
                    <span className="lrow-desc">{ROLE_DESC[u.role]}</span>
                    <svg className="lrow-arrow" width="16" height="16" viewBox="0 0 16 16"><path d="M3 8h9M8 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                ))}
              </div>
            </>
          )}
          {step === 1 && <div className="login-foot">Profiles not protected · mock demo</div>}
        </div>
      </div>

      <style>{`
        .login{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;overflow:hidden;
          background:var(--page)}
        .login-anim{position:absolute;inset:0;z-index:0}
        .login-grid{position:absolute;inset:0;
          background-image:linear-gradient(rgba(110,156,58,.06) 1px,transparent 1px),
            linear-gradient(90deg,rgba(110,156,58,.06) 1px,transparent 1px);
          background-size:48px 48px;
          mask-image:radial-gradient(1000px 640px at 50% 42%,#000,transparent 78%);
          -webkit-mask-image:radial-gradient(1000px 640px at 50% 42%,#000,transparent 78%)}
        .blob{position:absolute;border-radius:50%;filter:blur(80px);opacity:.5;animation:drift 24s ease-in-out infinite}
        .b1{width:480px;height:480px;background:#B6D98A;left:-6%;top:-14%}
        .b2{width:420px;height:420px;background:#8FC06A;right:-4%;top:2%;animation-delay:-8s}
        .b3{width:560px;height:560px;background:#CFE6AE;left:22%;bottom:-26%;animation-delay:-15s}
        @keyframes drift{0%{transform:translate(0,0) scale(1)}50%{transform:translate(50px,-40px) scale(1.12)}100%{transform:translate(0,0) scale(1)}}
        @media(prefers-reduced-motion:reduce){.blob{animation:none}}

        .login-card{position:relative;z-index:1;width:430px;max-width:92vw;background:var(--paper);
          border:1px solid var(--hair);border-radius:0;box-shadow:var(--soft);overflow:hidden}
        .login-strip{height:3px;background:var(--strip)}
        .login-inner{padding:26px 28px 20px}
        .login-head{display:flex;align-items:center;gap:13px;margin-bottom:10px}
        .login-logo{height:22px}
        .login-badge{display:inline-flex;align-items:center;gap:6px;font-size:10.5px;font-weight:700;color:var(--ink-2)}
        .login-badge .bpc{background:var(--accent-tint);color:var(--accent-ink);padding:2px 7px;font-size:9.5px;font-weight:800;letter-spacing:.08em;border-radius:0}
        .login-badge .dash{color:var(--ink-4)}
        .login-title{font-size:25px;font-weight:800;letter-spacing:-.025em;color:var(--ink)}
        .login-title .login-dash{color:var(--accent);margin:0 2px}
        .login-step{font-size:12px;color:var(--ink-2);margin:8px 0 18px;font-weight:600;display:flex;align-items:center;gap:9px}
        .login-step .s-num{font-size:9px;text-transform:uppercase;letter-spacing:.12em;font-weight:800;color:var(--accent);
          background:var(--accent-tint);padding:3px 8px;border-radius:0}
        .login-step b{color:var(--ink);font-weight:800}
        .login-back{margin-left:auto;background:var(--tile);border:1px solid var(--hair);color:var(--ink-2);
          font:800 9px var(--font);text-transform:uppercase;letter-spacing:.08em;padding:4px 9px;border-radius:0;cursor:pointer}
        .login-back:hover{background:var(--tile-2)}
        .login-list{display:grid;gap:9px}
        .lrow{display:flex;align-items:center;gap:11px;text-align:left;cursor:pointer;background:var(--tile);
          border:1px solid transparent;border-radius:0;padding:13px 15px;color:var(--ink);transition:all .14s}
        .lrow:hover{background:var(--paper);border-color:var(--accent-soft);box-shadow:var(--soft);transform:translateY(-1px)}
        .lrow-tag{font-size:8px;text-transform:uppercase;letter-spacing:.1em;font-weight:800;padding:3px 8px;border-radius:0;
          background:var(--hair-2);color:var(--ink-3)}
        .lrow-tag.on{background:var(--accent-tint);color:var(--accent-ink)}
        .lrow-name{font-size:14px;font-weight:800}
        .lrow-desc{font-size:11px;color:var(--ink-3);font-weight:600}
        .lrow-arrow{margin-left:auto;color:var(--ink-4)}
        .lrow:hover .lrow-arrow{color:var(--accent)}
        .lrow-trash{margin-left:auto;background:transparent;border:1px solid transparent;color:var(--ink-4);
          width:28px;height:28px;display:flex;align-items:center;justify-content:center;cursor:pointer;border-radius:0;padding:0}
        .lrow-trash:hover{color:var(--err);border-color:var(--hair);background:var(--paper)}
        .lrow-trash + .lrow-arrow{margin-left:8px}
        .lrow.deleting{cursor:default;background:var(--paper);border-color:var(--hair)}
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
