import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useConfig, ROLE_SHOWS } from "../config.jsx";

// Floating "Change Role" genie: available on every page so a demo can switch the
// viewer's role mid-flow and watch access (pages, sub-parts, sections) change
// live. Replaces the old role-selection login step.
export default function ChangeRole() {
  const { users, user, login, roleLabel } = useConfig();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!user) return null;
  const pick = (u) => {
    setOpen(false);
    if (u.role === user.role) return;
    // land on Overview so a page the new role can't open never lingers
    nav("/", { replace: true });
    login(u);
  };

  return (
    <>
      <button className="cr-fab" onClick={() => setOpen(true)} title="Switch the viewer's role">
        <span className="cr-fab-ic" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="3.4" /><path d="M5.5 20a6.5 6.5 0 0 1 13 0" /><path d="M20 7l2 2-2 2M4 7L2 9l2 2" />
          </svg>
        </span>
        <span className="cr-fab-txt"><b>Change Role</b><i>{roleLabel[user.role]}</i></span>
      </button>

      {open && createPortal(
        <div className="cr-scrim" onClick={() => setOpen(false)}>
          <div className="cr-panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="cr-head">
              <div className="cr-head-txt">
                <div className="cr-title">Change Role</div>
                <div className="cr-sub">See the assessment as a different team member. Access updates live.</div>
              </div>
              <button className="cr-x" onClick={() => setOpen(false)} aria-label="Close">✕</button>
            </div>
            <div className="cr-list">
              {users.map((u) => {
                const active = u.role === user.role;
                return (
                  <button key={u.id} className={"cr-row" + (active ? " active" : "")} onClick={() => pick(u)}>
                    <div className="cr-row-main">
                      <span className="cr-row-name">{roleLabel[u.role]}</span>
                      <span className="cr-row-shows">{ROLE_SHOWS[u.role] || ""}</span>
                    </div>
                    {active
                      ? <span className="cr-row-cur">Current</span>
                      : <svg className="cr-row-arrow" width="16" height="16" viewBox="0 0 16 16"><path d="M3 8h9M8 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>,
        document.body
      )}

      <style>{`
        /* bottom-right, lifted clear of the fixed footer; a very subtle blue wash */
        .cr-fab{position:fixed;right:20px;bottom:calc(var(--footer-h) + 16px);z-index:120;
          display:inline-flex;align-items:center;gap:11px;
          background:rgba(91,127,184,.06);border:1px solid rgba(91,127,184,.28);
          box-shadow:0 8px 22px -12px rgba(91,127,184,.35),0 2px 6px -3px rgba(32,34,28,.12);
          padding:9px 15px 9px 11px;cursor:pointer}
        .cr-fab:hover{background:rgba(91,127,184,.11);border-color:var(--ds-blue)}
        .cr-fab-ic{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;flex:0 0 auto;
          background:rgba(91,127,184,.12);color:var(--ds-blue);border:1px solid rgba(91,127,184,.28)}
        .cr-fab-txt{display:flex;flex-direction:column;line-height:1.2;text-align:left}
        .cr-fab-txt b{font-size:12.5px;font-weight:800;color:var(--ink)}
        .cr-fab-txt i{font-size:10.5px;font-style:normal;color:var(--ink-3);font-weight:600}

        .cr-scrim{position:fixed;inset:0;z-index:210;background:rgba(20,24,18,.34);
          display:flex;align-items:flex-end;justify-content:flex-end;padding:20px}
        .cr-panel{width:360px;max-width:calc(100vw - 40px);background:#fff;border:1px solid var(--hair);
          box-shadow:var(--halo);display:flex;flex-direction:column;max-height:min(80vh,640px);
          animation:crIn .18s cubic-bezier(.2,.7,.3,1) both}
        @keyframes crIn{from{transform:translateY(10px);opacity:.4}to{transform:none;opacity:1}}
        .cr-head{display:flex;align-items:flex-start;gap:12px;padding:16px 18px;border-bottom:1px solid var(--hair)}
        .cr-title{font-size:16px;font-weight:800;color:var(--ink);letter-spacing:-.01em}
        .cr-sub{font-size:11.5px;color:var(--ink-3);margin-top:4px;line-height:1.45;max-width:40ch}
        .cr-x{margin-left:auto;flex:0 0 auto;width:28px;height:28px;border:1px solid var(--hair);
          background:var(--tile);cursor:pointer;font-size:12px;color:var(--ink-2)}
        .cr-x:hover{background:var(--hair)}
        .cr-list{display:flex;flex-direction:column;gap:8px;padding:14px 18px 18px;overflow-y:auto}
        .cr-row{display:flex;align-items:center;gap:12px;text-align:left;cursor:pointer;background:var(--paper);
          border:1px solid var(--hair);box-shadow:var(--soft);padding:12px 14px;transition:box-shadow .12s,transform .1s}
        .cr-row:hover{box-shadow:var(--lift);transform:translateY(-1px)}
        .cr-row.active{border-color:var(--fs-green);background:var(--accent-tint);box-shadow:none;cursor:default}
        .cr-row.active:hover{transform:none}
        .cr-row-main{display:flex;flex-direction:column;gap:3px;min-width:0}
        .cr-row-name{font-size:13.5px;font-weight:800;color:var(--ink)}
        .cr-row-shows{font-size:11px;color:var(--ink-3);font-weight:600;line-height:1.4}
        .cr-row-arrow{margin-left:auto;flex:0 0 auto;color:var(--ink-3)}
        .cr-row:hover .cr-row-arrow{color:var(--fs-green)}
        .cr-row-cur{margin-left:auto;flex:0 0 auto;font-size:8.5px;font-weight:800;text-transform:uppercase;
          letter-spacing:.06em;color:var(--fs-green);border:1px solid var(--fs-green);padding:2px 7px}
      `}</style>
    </>
  );
}
