import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { Routes, Route, NavLink, useNavigate, useParams } from "react-router-dom";
import { ConfigProvider, useConfig, connReadiness } from "./config.jsx";
import { FS_LOGO } from "./fslogo.js";
import { SKY_LOGO } from "./skylogo.js";
import Overview from "./pages/Overview.jsx";
import LayerPage from "./pages/LayerPage.jsx";
import Admin from "./pages/Admin.jsx";
import Login from "./pages/Login.jsx";
import ChatBot from "./components/ChatBot.jsx";

function Topbar() {
  const { config, user, logout, roleLabel, hasUnsavedFresh, saveNewProject, profile, runDemo, can } = useConfig();
  // The Skyworks wordmark is a specific client asset - only show it for the real
  // Skyworks engagement, not for user-saved projects that cloned the template.
  const skyBrand = config?.brand === "skyworks";
  const [prompt, setPrompt] = useState(false);   // save-before-signout prompt
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [demoBusy, setDemoBusy] = useState(false);

  // Run full project skips the Genie entirely: it connects everything server-side,
  // which flips readiness to complete and lets the setup blur clear on its own.
  const runFull = async () => { setDemoBusy(true); await runDemo(); setDemoBusy(false); };
  const showRunFull = profile?.mode === "generic" && can && can("layers");

  const onSignOut = () => {
    if (hasUnsavedFresh()) { setPrompt(true); setName(""); setErr(null); }
    else logout();
  };
  const saveThenOut = async () => {
    if (!name.trim()) { setErr("Name required."); return; }
    setBusy(true); setErr(null);
    const out = await saveNewProject(name.trim());
    setBusy(false);
    if (out.ok) { setPrompt(false); logout(); }
    else setErr(out.error || "Could not save.");
  };

  return (
    <header className="topbar">
      <div className="tb-left">
        {skyBrand ? (
          <>
            <span className="tb-prep">Prepared for</span>
            <img className="tb-sky" src={SKY_LOGO} alt={config?.client?.name} />
          </>
        ) : (
          <img className="tb-fs" src={FS_LOGO} alt="Findability Sciences" />
        )}
      </div>
      <div className="tb-center">
        <span className="tb-badge"><span className="bpc">BPC</span> for Data</span>
        <span className="tb-sub">{config ? config.client.engagement : ""}</span>
      </div>
      <div className="tb-right">
        {showRunFull && (
          <button className="tb-runfull" onClick={runFull} disabled={demoBusy}
            title="Skip the Genie and populate the whole project">
            {demoBusy ? "Running…" : "Run full project"}
          </button>
        )}
        {user && <div className="tb-user"><span className="tb-urole">{roleLabel[user.role]}</span></div>}
        {user && <button className="tb-logout" onClick={onSignOut}>Sign out</button>}
      </div>

      {prompt && createPortal(
        <div className="so-overlay" onClick={() => !busy && setPrompt(false)}>
          <div className="so-modal" onClick={(e) => e.stopPropagation()}>
            <div className="so-title">Save this project before signing out?</div>
            <div className="so-sub">This Start Fresh Project has unsaved sources. Name it to keep it, or sign out and discard.</div>
            <input className="so-in" placeholder="Project name" value={name} autoFocus
              onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveThenOut()} />
            {err && <div className="so-err">{err}</div>}
            <div className="so-row">
              <button className="btn" disabled={busy} onClick={() => { setPrompt(false); logout(); }}>Discard & sign out</button>
              <button className="btn primary" disabled={busy} onClick={saveThenOut}>{busy ? "Saving…" : "Save & sign out"}</button>
            </div>
            <button className="so-cancel" disabled={busy} onClick={() => setPrompt(false)}>Cancel</button>
          </div>
          <style>{`
            .so-overlay{position:fixed;inset:0;z-index:200;background:rgba(20,24,18,.34);
              backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center}
            .so-modal{width:420px;max-width:92vw;background:var(--paper);border:1px solid var(--hair);
              box-shadow:var(--halo);padding:22px 22px 16px}
            .so-title{font-size:16px;font-weight:800;color:var(--ink)}
            .so-sub{font-size:12.5px;color:var(--ink-2);margin:7px 0 15px;line-height:1.5}
            .so-in{width:100%;height:38px;border:1px solid var(--hair);padding:0 12px;font:600 13px var(--font);
              background:var(--tile);color:var(--ink)}
            .so-in:focus{outline:none;border-color:var(--fs-green);box-shadow:0 0 0 3px var(--accent-tint)}
            .so-err{font-size:11.5px;color:var(--err);font-weight:700;margin-top:8px}
            .so-row{display:flex;gap:9px;margin-top:16px}
            .so-row .btn{flex:1}
            .so-cancel{display:block;width:100%;margin-top:9px;background:none;border:none;color:var(--ink-3);
              font:700 11px var(--font);text-transform:uppercase;letter-spacing:.1em;cursor:pointer;padding:6px}
            .so-cancel:hover{color:var(--ink)}
          `}</style>
        </div>,
        document.body
      )}
    </header>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <span className="ft-label">Powered by</span>
      <img className="ft-logo" src={FS_LOGO} alt="Findability Sciences" />
      <span className="ft-conf">Confidential</span>
    </footer>
  );
}

function Sidebar() {
  const { config, sources, can, canLayer } = useConfig();
  const r = connReadiness(sources);
  const link = ({ isActive }) => "navlink" + (isActive ? " active" : "");
  // layers other than Infrastructure lock until every selected source is connected
  const gated = !r.complete;

  return (
    <nav className="sidebar">
      <div className="nav-group">Overview &amp; Admin</div>
      {can("overview") && <NavLink to="/" end className={({ isActive }) => "navlink nav-hero" + (isActive ? " active" : "")}><span className="dotm" /> Overview</NavLink>}
      {can("admin") && <NavLink to="/admin" className={link}><span className="dotm" /> Admin Settings</NavLink>}

      {can("layers") && config && (
        <>
          <div className="nav-group">Assessment Layers</div>
          {config.layers.filter((l) => canLayer(l.key)).map((l) => {
            const locked = gated && l.key !== "infrastructure";
            return (
              <NavLink key={l.key} to={`/layer/${l.key}`} className={link}>
                <span className="ic">{l.id}</span> {l.name}
                {l.key === "infrastructure" && <span className="nav-tag">{r.complete ? "Ready" : r.hasSelection ? `${r.connected}/${r.total}` : "Set up"}</span>}
                {locked && <span className="nav-tag">Locked</span>}
              </NavLink>
            );
          })}
        </>
      )}
    </nav>
  );
}

// Save-as-project bar: shown while working in the Start Fresh Project, lets any
// user name and store the current session as its own profile.
function SaveProjectBar() {
  const { profile, saveNewProject } = useConfig();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [engagement, setEngagement] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  if (profile?.mode !== "generic") return null;

  const save = async () => {
    if (!name.trim()) { setErr("Name required."); return; }
    setBusy(true); setErr(null);
    const out = await saveNewProject(name.trim(), engagement.trim());
    setBusy(false);
    if (!out.ok) setErr(out.error || "Could not save.");
  };

  return (
    <div className="savebar">
      <span className="sb-tag">Start Fresh Project</span>
      {!open ? (
        <>
          <span className="sb-txt">Working in an unsaved project.</span>
          <button className="btn primary" style={{ height: 32, marginLeft: "auto" }} onClick={() => setOpen(true)}>Save as project</button>
        </>
      ) : (
        <div className="sb-form">
          <input className="sb-in" placeholder="Project name" value={name} autoFocus
            onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()} />
          <input className="sb-in" placeholder="Engagement (optional)" value={engagement}
            onChange={(e) => setEngagement(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()} />
          <button className="btn primary" style={{ height: 32 }} onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</button>
          <button className="btn" style={{ height: 32 }} onClick={() => { setOpen(false); setErr(null); }}>Cancel</button>
          {err && <span className="sb-err">{err}</span>}
        </div>
      )}
      <style>{`
        .savebar{display:flex;align-items:center;gap:12px;padding:11px 15px;margin-bottom:16px;
          border:1px solid var(--hair);background:var(--tile)}
        .sb-tag{font:800 9px var(--font);text-transform:uppercase;letter-spacing:.1em;color:var(--accent-ink);
          background:var(--accent-tint);padding:4px 8px;flex:0 0 auto}
        .sb-txt{font-size:12.5px;color:var(--ink-2);font-weight:600}
        .sb-form{display:flex;align-items:center;gap:8px;flex:1}
        .sb-in{height:32px;border:1px solid var(--hair);padding:0 10px;font:600 12.5px var(--font);
          background:var(--paper);color:var(--ink);min-width:160px}
        .sb-in:focus{outline:none;border-color:var(--fs-green);box-shadow:0 0 0 3px var(--accent-tint)}
        .sb-err{font-size:11.5px;color:var(--err);font-weight:700}
      `}</style>
    </div>
  );
}

// simple route guard by role key (overview / layers / admin)
function Guard({ routeKey, children }) {
  const { can } = useConfig();
  const nav = useNavigate();
  const allowed = can(routeKey);
  useEffect(() => { if (!allowed) nav("/", { replace: true }); }, [allowed, nav]);
  if (!allowed) return null;
  return children;
}

// layer route guard: role must be allowed the layer; non-infra layers also need
// all connections ready (infrastructure is where you connect, so it's open).
function LayerGuard() {
  const { key } = useParams();
  const { canLayer, rolesLoaded, sources, setBotOpen } = useConfig();
  const nav = useNavigate();
  const r = connReadiness(sources);
  const allowed = canLayer(key);
  const connOk = key === "infrastructure" || r.complete;
  useEffect(() => {
    if (!rolesLoaded) return;   // wait until role map is loaded before deciding
    if (!allowed) { nav("/", { replace: true }); return; }
    if (!connOk) { nav("/layer/infrastructure", { replace: true }); setBotOpen(true); }
  }, [rolesLoaded, allowed, connOk, key, nav, setBotOpen]);
  if (!rolesLoaded) return <div className="lede">Loading…</div>;
  if (!allowed || !connOk) return null;
  return <LayerPage />;
}

// Whenever the active profile changes, snap back to the Overview so a page left
// open under the previous profile never lingers when switching. Keyed on `pid`
// only: `nav` must NOT be a dependency or the effect can re-fire every render
// and trap the app on "/", blocking all navigation.
function RouteReset() {
  const { pid } = useConfig();
  const nav = useNavigate();
  const seen = useRef(pid);
  useEffect(() => {
    if (seen.current !== pid) {   // real profile switch, not a re-render
      seen.current = pid;
      nav("/", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pid]);
  return null;
}

function Shell() {
  const { config, error, user, profile, can } = useConfig();
  if (!user || !profile) return <Login />;
  return (
    <div className="app">
      <RouteReset />
      <Topbar />
      <Sidebar />
      <main className="main">
        <SaveProjectBar />
        {error && <div style={{ color: "var(--err)" }}>{error}</div>}
        {!config && !error && <div className="lede">Loading…</div>}
        {config && (
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/layer/:key" element={<LayerGuard />} />
            <Route path="/admin" element={<Guard routeKey="admin"><Admin /></Guard>} />
            <Route path="*" element={<Overview />} />
          </Routes>
        )}
      </main>
      <Footer />
      {config && can("layers") && <ChatBot key={profile.id} />}
    </div>
  );
}

export default function App() {
  return (
    <ConfigProvider>
      <Shell />
    </ConfigProvider>
  );
}
