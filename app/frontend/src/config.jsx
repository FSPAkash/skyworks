import { createContext, useContext, useEffect, useState, useCallback } from "react";

const ConfigCtx = createContext(null);

const ROLE_LABEL = {
  "c-level": "C-Level",
  "data-science": "Data Science",
  "delivery": "Delivery / PM",
  "admin": "Admin",
};

export function ConfigProvider({ children }) {
  const [config, setConfig] = useState(null);
  const [error, setError] = useState(null);
  const [botOpen, setBotOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [access, setAccess] = useState({});
  const [profiles, setProfiles] = useState([]);
  const [sources, setSources] = useState({ targets: [], layers: {} });
  const [selection, setSelection] = useState({ available: {}, selected: {} });

  const [user, setUser] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem("fs_user") || "null"); } catch { return null; }
  });
  const [profile, setProfile] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem("fs_profile") || "null"); } catch { return null; }
  });

  const pid = profile?.id || "generic";
  const hdr = useCallback((extra = {}) => ({ "X-Profile": pid, "X-Role": user?.role || "", ...extra }), [pid, user]);

  const loadProfiles = useCallback(() =>
    fetch("/api/profiles").then((r) => r.json()).then((d) => setProfiles(d.profiles || [])).catch(() => {}), []);

  const loadConfig = useCallback(() =>
    fetch("/api/config", { headers: { "X-Profile": pid } }).then((r) => r.json()).then(setConfig).catch(() => setError("Could not load config.")), [pid]);
  const loadSources = useCallback(() =>
    fetch("/api/sources", { headers: { "X-Profile": pid } }).then((r) => r.json()).then(setSources).catch(() => {}), [pid]);
  const loadSelection = useCallback(() =>
    fetch("/api/selection", { headers: { "X-Profile": pid } }).then((r) => r.json()).then(setSelection).catch(() => {}), [pid]);

  useEffect(() => {
    loadProfiles();
    fetch("/api/users").then((r) => r.json()).then((d) => { setUsers(d.users || []); setAccess(d.access || {}); }).catch(() => {});
  }, [loadProfiles]);

  useEffect(() => {
    if (!user) return;
    loadConfig(); loadSources(); loadSelection();
  }, [user, pid, loadConfig, loadSources, loadSelection]);

  const login = (u) => { setUser(u); sessionStorage.setItem("fs_user", JSON.stringify(u)); };
  const pickProfile = (p) => { setProfile(p); sessionStorage.setItem("fs_profile", JSON.stringify(p)); };
  const logout = () => {
    setUser(null); setProfile(null);
    sessionStorage.removeItem("fs_user"); sessionStorage.removeItem("fs_profile");
  };

  const saveSelection = async (selected) => {
    const res = await fetch("/api/selection", { method: "POST", headers: hdr({ "Content-Type": "application/json" }), body: JSON.stringify({ selected }) });
    const out = await res.json();
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

  return (
    <ConfigCtx.Provider value={{
      config, error, botOpen, setBotOpen, users, access, user, profile, profiles,
      login, pickProfile, logout, can, roleLabel: ROLE_LABEL,
      sources, loadSources, saveConnection, testConnection,
      selection, saveSelection, createProfile, deleteProfile, loadProfiles, saveNewProject,
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
