import { createContext, useContext, useEffect, useState, useCallback } from "react";

const ConfigCtx = createContext(null);

const ROLE_LABEL = {
  "c-level": "C-Level",
  "architect": "Solution Architect",
  "engineer": "Data Engineer",
  "analyst": "Data Analyst",
  "delivery": "Delivery / PM",
  "admin": "Admin",
};

// Concise description of what each role does on the engagement (shown in the
// Change Role genie), not the pages they can open.
export const ROLE_SHOWS = {
  "c-level": "Tracks progress and outcomes at a glance.",
  "architect": "Shapes target architecture and lineage.",
  "engineer": "Builds connections and ingests metadata.",
  "analyst": "Classifies, enriches and interprets the data.",
  "delivery": "Runs the engagement end to end.",
  "admin": "Configures the workspace and onboards projects.",
};

export function ConfigProvider({ children }) {
  const [config, setConfig] = useState(null);
  const [error, setError] = useState(null);
  const [botOpen, setBotOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [access, setAccess] = useState({});
  const [roleLayers, setRoleLayers] = useState({});
  const [roleSubparts, setRoleSubparts] = useState({});
  const [profiles, setProfiles] = useState([]);
  const [sources, setSources] = useState({ targets: [], layers: {}, categories: {}, meters: [] });
  const [selection, setSelection] = useState({ available: {}, selected: {} });

  const [user, setUser] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem("fs_user") || "null"); } catch { return null; }
  });
  const [profile, setProfile] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem("fs_profile") || "null"); } catch { return null; }
  });

  // Per-browser scratch-session id for the Start-Fresh project. Minted new on
  // each generic pick so a fresh sign-in always starts blank (see backend).
  const [sessionId, setSessionId] = useState(() => sessionStorage.getItem("fs_session") || "");
  // whether the current Start-Fresh session has unsaved work (sources selected)
  const [genericDirty, setGenericDirty] = useState(false);

  const pid = profile?.id || "generic";
  const hdr = useCallback((extra = {}) =>
    ({ "X-Profile": pid, "X-Role": user?.role || "", "X-Session": sessionId, ...extra }), [pid, user, sessionId]);

  const loadProfiles = useCallback(() =>
    fetch("/api/profiles").then((r) => r.json()).then((d) => setProfiles(d.profiles || [])).catch(() => {}), []);

  const loadConfig = useCallback(() =>
    fetch("/api/config", { headers: { "X-Profile": pid, "X-Session": sessionId } }).then((r) => r.json()).then(setConfig).catch(() => setError("Could not load config.")), [pid, sessionId]);
  const loadSources = useCallback(() =>
    fetch("/api/sources", { headers: { "X-Profile": pid, "X-Session": sessionId } }).then((r) => r.json()).then(setSources).catch(() => {}), [pid, sessionId]);
  const loadSelection = useCallback(() =>
    fetch("/api/selection", { headers: { "X-Profile": pid, "X-Session": sessionId } }).then((r) => r.json()).then(setSelection).catch(() => {}), [pid, sessionId]);

  useEffect(() => {
    loadProfiles();
    fetch("/api/users").then((r) => r.json()).then((d) => {
      setUsers(d.users || []); setAccess(d.access || {});
      setRoleLayers(d.layers || {}); setRoleSubparts(d.subparts || {});
    }).catch(() => {});
  }, [loadProfiles]);

  useEffect(() => {
    if (!user) return;
    // clear stale per-profile data synchronously so a newly picked profile never
    // shows the previous one's connections/selection during the refetch gap
    setSources({ targets: [], layers: {}, categories: {}, meters: [] });
    setSelection({ available: {}, selected: {} });
    loadConfig(); loadSources(); loadSelection();
  }, [user, pid, loadConfig, loadSources, loadSelection]);

  const login = (u) => { setUser(u); sessionStorage.setItem("fs_user", JSON.stringify(u)); };
  // wipe any prior profile's per-profile data immediately so the next profile
  // never renders with stale connections/selection/config
  const clearProfileData = () => {
    setSources({ targets: [], layers: {}, categories: {}, meters: [] });
    setSelection({ available: {}, selected: {} });
    setConfig(null);
  };
  const pickProfile = (p) => {
    clearProfileData();
    setProfile(p); sessionStorage.setItem("fs_profile", JSON.stringify(p));
    if (p.mode === "generic") {
      // fresh scratch session every time Start-Fresh is opened -> always blank
      const sid = "s-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
      setSessionId(sid); sessionStorage.setItem("fs_session", sid);
      setGenericDirty(false);
    }
    setBotOpen(false);
  };
  const resetSession = useCallback(async () => {
    // discard the Start-Fresh scratch state on the server
    try { await fetch("/api/session/reset", { method: "POST", headers: { "X-Session": sessionId } }); } catch {}
  }, [sessionId]);
  const logout = async () => {
    if (pid === "generic") await resetSession();
    clearProfileData();
    setUser(null); setProfile(null); setGenericDirty(false);
    setSessionId(""); sessionStorage.removeItem("fs_session");
    sessionStorage.removeItem("fs_user"); sessionStorage.removeItem("fs_profile");
  };
  // true when in Start-Fresh with unsaved selections -> prompt to save on logout
  const hasUnsavedFresh = () => pid === "generic" && genericDirty;

  const saveSelection = async (selected) => {
    const res = await fetch("/api/selection", { method: "POST", headers: hdr({ "Content-Type": "application/json" }), body: JSON.stringify({ selected }) });
    const out = await res.json();
    // any source picked in a Start-Fresh session counts as unsaved work
    if (pid === "generic") {
      const any = Object.values(selected || {}).some((a) => (a || []).length);
      setGenericDirty(any);
    }
    await loadSelection(); await loadSources();
    return out;
  };

  const saveConnection = async (cid, values) => {
    const res = await fetch(`/api/connections/${cid}`, { method: "POST", headers: hdr({ "Content-Type": "application/json" }), body: JSON.stringify({ values }) });
    const out = await res.json();
    await loadSources();
    return out;
  };
  const testConnection = async (cid) => {
    const res = await fetch(`/api/connections/${cid}/test`, { method: "POST", headers: hdr() });
    const out = await res.json();
    await loadSources();
    return out;
  };

  // Save the current Start-Fresh session as a named, stored project (any role).
  const saveNewProject = async (name, engagement) => {
    const res = await fetch("/api/profiles/new", {
      method: "POST", headers: hdr({ "Content-Type": "application/json" }),
      body: JSON.stringify({ name, engagement }),
    });
    const out = await res.json();
    if (out.ok) {
      await loadProfiles();
      pickProfile({ id: out.id, name: out.name, mode: "client", engagement: out.engagement });
    }
    return out;
  };

  // Admin: upload a SOW PDF; backend extracts Overview fields (no dollar amounts)
  const uploadSow = async (file, name) => {
    const fd = new FormData();
    fd.append("file", file);
    if (name) fd.append("name", name);
    const res = await fetch("/api/profiles/from-sow", { method: "POST", headers: hdr(), body: fd });
    const out = await res.json();
    if (out.ok) await loadProfiles();
    return out;
  };

  // Admin: build a profile from a hand-filled Overview form (no SOW / no JSON)
  const createFromForm = async (form) => {
    const res = await fetch("/api/profiles/from-form", {
      method: "POST", headers: hdr({ "Content-Type": "application/json" }),
      body: JSON.stringify(form),
    });
    const out = await res.json();
    if (out.ok) await loadProfiles();
    return out;
  };

  // Admin: patch the active profile's details in place (edit, not create)
  const updateProfile = async (form) => {
    const res = await fetch("/api/profiles/update", {
      method: "POST", headers: hdr({ "Content-Type": "application/json" }),
      body: JSON.stringify(form),
    });
    const out = await res.json();
    if (out.ok) { await loadProfiles(); await loadConfig(); }
    return out;
  };

  // Admin: toggle whether C-Level sees usage meters on the Overview (active profile)
  const setMetersInPresentation = async (on) => {
    const res = await fetch("/api/settings/meters-presentation", {
      method: "POST", headers: hdr({ "Content-Type": "application/json" }),
      body: JSON.stringify({ on }),
    });
    const out = await res.json();
    if (out.ok) await loadConfig();
    return out;
  };
  const setMetersOverview = async (on) => {
    const res = await fetch("/api/settings/meters-overview", {
      method: "POST", headers: hdr({ "Content-Type": "application/json" }),
      body: JSON.stringify({ on }),
    });
    const out = await res.json();
    if (out.ok) await loadConfig();
    return out;
  };
  // Admin: whether the Presentation page shows the project-description intro
  const setProjectDescription = async (on) => {
    const res = await fetch("/api/settings/project-description", {
      method: "POST", headers: hdr({ "Content-Type": "application/json" }),
      body: JSON.stringify({ on }),
    });
    const out = await res.json();
    if (out.ok) await loadConfig();
    return out;
  };

  const createProfile = async (json) => {
    const res = await fetch("/api/profiles", { method: "POST", headers: hdr({ "Content-Type": "application/json" }), body: JSON.stringify(json) });
    const out = await res.json();
    if (out.ok) await loadProfiles();
    return out;
  };
  const deleteProfile = async (id, pin) => {
    const res = await fetch(`/api/profiles/${id}`, { method: "DELETE", headers: hdr(pin ? { "X-Delete-Pin": pin } : {}) });
    const out = await res.json();
    if (out.ok) await loadProfiles();
    return out;
  };

  const can = (routeKey) => user && (access[user.role] || []).includes(routeKey);
  // which assessment layers this role may open
  const rolesLoaded = Object.keys(roleLayers).length > 0;
  const canLayer = (layerKey) => user && (roleLayers[user.role] || []).includes(layerKey);
  // whether this role works on a given sub-part (only sub-parts listed in
  // roleSubparts are gated; unlisted sub-parts are visible to any layer viewer)
  const canSubpart = (subId) => {
    if (!user) return false;
    const roles = roleSubparts[subId];
    if (!roles) return true;
    return roles.includes(user.role);
  };
  const runDemo = async () => {
    const res = await fetch("/api/demo/run", { method: "POST", headers: hdr() });
    const out = await res.json();
    await loadSelection(); await loadSources(); await loadConfig();
    return out;
  };

  return (
    <ConfigCtx.Provider value={{
      config, error, botOpen, setBotOpen, users, access, user, profile, profiles,
      login, pickProfile, logout, can, canLayer, canSubpart, rolesLoaded, roleLabel: ROLE_LABEL,
      sources, loadSources, saveConnection, testConnection, runDemo,
      selection, saveSelection, createProfile, createFromForm, updateProfile, deleteProfile, loadProfiles, saveNewProject, uploadSow, setMetersInPresentation, setMetersOverview, setProjectDescription,
      hasUnsavedFresh, genericDirty, pid,
    }}>
      {children}
    </ConfigCtx.Provider>
  );
}

export const useConfig = () => useContext(ConfigCtx);

export function layerConnStatus(sources, layerKey) {
  const l = sources.layers?.[layerKey];
  if (!l) return { connected: 0, total: 0, complete: false };
  return { connected: l.connected, total: l.total, complete: l.total > 0 && l.connected === l.total, name: l.name };
}

// readiness: every SELECTED source connected. If nothing selected yet, not ready.
export function connReadiness(sources) {
  const layers = Object.values(sources.layers || {});
  const total = layers.reduce((a, l) => a + l.total, 0);
  const connected = layers.reduce((a, l) => a + l.connected, 0);
  return { connected, total, complete: total > 0 && connected === total, hasSelection: total > 0 };
}
