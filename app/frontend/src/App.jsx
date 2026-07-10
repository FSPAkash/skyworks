import { useEffect, useState } from "react";
import { Routes, Route, NavLink, useNavigate } from "react-router-dom";
import { ConfigProvider, useConfig, connReadiness } from "./config.jsx";
import { FS_LOGO } from "./fslogo.js";
import { SKY_LOGO } from "./skylogo.js";
import Overview from "./pages/Overview.jsx";
import Journey from "./pages/Journey.jsx";
import LayerPage from "./pages/LayerPage.jsx";
import Deliverables from "./pages/Deliverables.jsx";
import GanttPage from "./pages/GanttPage.jsx";
import Intake from "./pages/Intake.jsx";
import Admin from "./pages/Admin.jsx";
import Login from "./pages/Login.jsx";
import ChatBot from "./components/ChatBot.jsx";

function Topbar() {
  const { config, user, logout, roleLabel } = useConfig();
  // The Skyworks wordmark is a specific client asset - only show it for the real
  // Skyworks engagement, not for user-saved projects that cloned the template.
  const skyBrand = config?.brand === "skyworks";
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
        <span className="tb-badge">Data <span className="dash">-</span> <span className="bpc">BPC</span></span>
        <span className="tb-sub">{config ? config.client.engagement : ""}</span>
      </div>
      <div className="tb-right">
        {user && <div className="tb-user"><span className="tb-urole">{roleLabel[user.role]}</span></div>}
        {user && <button className="tb-logout" onClick={logout}>Sign out</button>}
      </div>
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
  const { config, sources, can } = useConfig();
  const r = connReadiness(sources);
  const link = ({ isActive }) => "navlink" + (isActive ? " active" : "");
  const gated = !r.complete;

  return (
    <nav className="sidebar">
      {can("intake") && (
        <>
          <div className="nav-group">Start here</div>
          <NavLink to="/intake" className={link}>
            <span className="ic num">1</span> Connections
            <span className="nav-tag">{r.complete ? "Ready" : `${r.connected}/${r.total}`}</span>
          </NavLink>
        </>
      )}

      <div className="nav-group">Console</div>
      {can("overview") && <NavLink to="/" end className={link}><span className="dotm" /> Overview</NavLink>}
      {can("journey") && (
        <NavLink to="/journey" className={link}>
          <span className="dotm" /> I-CUP Journey {gated && <span className="nav-tag">Locked</span>}
        </NavLink>
      )}
      {can("deliverables") && <NavLink to="/deliverables" className={link}><span className="dotm" /> Deliverables</NavLink>}
      {can("gantt") && <NavLink to="/gantt" className={link}><span className="dotm" /> Delivery Gantt</NavLink>}

      {can("journey") && config && (
        <>
          <div className="nav-group">I-CUP Layers</div>
          {config.layers.map((l) => (
            <NavLink key={l.key} to={`/layer/${l.key}`} className={link}>
              <span className="ic">{l.id}</span> {l.name}
              {gated && <span className="nav-tag">Locked</span>}
            </NavLink>
          ))}
        </>
      )}

      {can("admin") && (
        <>
          <div className="nav-group">Admin</div>
          <NavLink to="/admin" className={link}><span className="dotm" /> Client Config</NavLink>
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

// route guard: role access; journey/layer also need all sources connected
function Guard({ routeKey, needsConn, children }) {
  const { sources, can, setBotOpen } = useConfig();
  const nav = useNavigate();
  const r = connReadiness(sources);
  const allowed = can(routeKey);
  const connOk = !needsConn || r.complete;
  useEffect(() => {
    if (!allowed) { nav("/", { replace: true }); return; }
    if (!connOk) { nav("/intake", { replace: true }); setBotOpen(true); }
  }, [allowed, connOk, nav, setBotOpen]);
  if (!allowed || !connOk) return null;
  return children;
}

function Shell() {
  const { config, error, user, profile, can } = useConfig();
  if (!user || !profile) return <Login />;
  const home = can("overview") ? <Overview /> : <Deliverables />;
  return (
    <div className="app">
      <Topbar />
      <Sidebar />
      <main className="main">
        <SaveProjectBar />
        {error && <div style={{ color: "var(--err)" }}>{error}</div>}
        {!config && !error && <div className="lede">Loading…</div>}
        {config && (
          <Routes>
            <Route path="/" element={home} />
            <Route path="/intake" element={<Guard routeKey="intake"><Intake /></Guard>} />
            <Route path="/journey" element={<Guard routeKey="journey" needsConn><Journey /></Guard>} />
            <Route path="/layer/:key" element={<Guard routeKey="layer" needsConn><LayerPage /></Guard>} />
            <Route path="/deliverables" element={<Guard routeKey="deliverables"><Deliverables /></Guard>} />
            <Route path="/gantt" element={<Guard routeKey="gantt"><GanttPage /></Guard>} />
            <Route path="/admin" element={<Guard routeKey="admin"><Admin /></Guard>} />
            <Route path="*" element={home} />
          </Routes>
        )}
      </main>
      <Footer />
      {config && can("intake") && <ChatBot />}
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
