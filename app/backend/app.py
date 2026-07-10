"""FS Data BPC - I-CUP Delivery Console (Flask backend).

Serves the active config (Generic Template by default; an Admin can upload a
client config to switch), captures per-section chatbot intake, serves deliverable
artifacts, exposes mock role-based users, and hosts the built React SPA.

Plug-and-play: the app boots in Generic Template mode. Upload a client config JSON
via the Admin panel (POST /api/config/upload) to re-target it for a client.
"""
import hashlib
import json
import os
import random
import time
from datetime import datetime
from flask import Flask, jsonify, request, send_from_directory, abort

try:
    from keep_alive import init_keep_alive
    KEEP_ALIVE_AVAILABLE = True
except ImportError as e:
    print(f"Keep-alive service not available: {e}")
    KEEP_ALIVE_AVAILABLE = False

BASE = os.path.dirname(os.path.abspath(__file__))
# Root used to resolve deliverable artifact paths. Locally this is the repo root
# (two levels up). On a host where only app/ is deployed, set ARTIFACT_ROOT.
REPO = os.environ.get("ARTIFACT_ROOT") or os.path.abspath(os.path.join(BASE, os.pardir, os.pardir))
GENERIC_PATH = os.path.join(BASE, "config_generic.json")
PROFILES_DIR = os.path.join(BASE, "profiles")             # one dir per client profile
DIST = os.path.join(BASE, os.pardir, "frontend", "dist")
GENERIC_ID = "generic"

os.makedirs(PROFILES_DIR, exist_ok=True)

# ---------------------------------------------------------------------------
# Connector catalog: what fields the BPC backend needs to actually connect to
# each source type. Intake provisions a connection per source; the catalog
# drives the form and the test. Secrets are captured as a REFERENCE (vault path
# / secret name), never a raw password - BPC resolves it at pull time.
# ---------------------------------------------------------------------------
# Each field carries a realistic `prefill` so a connection opens populated and
# tests green out of the box (mock demo). Users can edit any value.
DB_FIELDS = [
    {"key": "host", "label": "Host", "prefill": "sql-ods.corp.internal", "required": True},
    {"key": "port", "label": "Port", "prefill": "1433", "required": True},
    {"key": "database", "label": "Database", "prefill": "ODS_PROD", "required": True},
    {"key": "authMode", "label": "Auth mode", "type": "select",
     "options": ["Service account", "Integrated / AD", "Basic"], "prefill": "Service account", "required": True},
    {"key": "username", "label": "Service account / user", "prefill": "svc_bpc_ro", "required": True},
    {"key": "secretRef", "label": "Secret reference (vault path / key name)",
     "prefill": "kv://bpc/ods/sql-ro", "required": True, "secret": True},
]
API_FIELDS = [
    {"key": "baseUrl", "label": "Base URL", "prefill": "https://api.corp.internal/v2", "required": True},
    {"key": "authMode", "label": "Auth mode", "type": "select",
     "options": ["OAuth client credentials", "API key", "Service account"], "prefill": "OAuth client credentials", "required": True},
    {"key": "clientId", "label": "Client / app id", "prefill": "bpc-connector", "required": True},
    {"key": "secretRef", "label": "Secret reference (vault path / key name)",
     "prefill": "kv://bpc/erp/oauth", "required": True, "secret": True},
]
MAIL_FIELDS = [
    {"key": "tenant", "label": "Tenant / domain", "prefill": "corp.onmicrosoft.com", "required": True},
    {"key": "authMode", "label": "Auth mode", "type": "select",
     "options": ["OAuth app (Graph)", "Service account"], "prefill": "OAuth app (Graph)", "required": True},
    {"key": "clientId", "label": "App / client id", "prefill": "bpc-mail-reader", "required": True},
    {"key": "secretRef", "label": "Secret reference (vault path / key name)",
     "prefill": "kv://bpc/mail/graph", "required": True, "secret": True},
]
FILE_FIELDS = [
    {"key": "location", "label": "Location (share / bucket / SFTP)", "prefill": "sftp://feeds.corp.internal/ods", "required": True},
    {"key": "authMode", "label": "Auth mode", "type": "select",
     "options": ["Key pair", "Service account", "Basic"], "prefill": "Key pair", "required": True},
    {"key": "secretRef", "label": "Secret reference (vault path / key name)",
     "prefill": "kv://bpc/feeds/sftp", "required": True, "secret": True},
]

# maps a source label (from config sourceGroups) to a connector kind
CONNECTORS = {
    "SAP":        {"kind": "erp",  "fields": API_FIELDS},
    "ECC":        {"kind": "erp",  "fields": API_FIELDS},
    "S/4 HANA":   {"kind": "erp",  "fields": API_FIELDS},
    "PeopleSoft": {"kind": "erp",  "fields": API_FIELDS},
    "Salesforce": {"kind": "crm",  "fields": API_FIELDS},
    "Dynamics 365": {"kind": "crm", "fields": API_FIELDS},
    "HubSpot":    {"kind": "crm",  "fields": API_FIELDS},
    "CRM":        {"kind": "crm",  "fields": API_FIELDS},
    "SQL":        {"kind": "db",   "fields": DB_FIELDS},
    "SQL Server": {"kind": "db",   "fields": DB_FIELDS},
    "Oracle":     {"kind": "db",   "fields": DB_FIELDS},
    "Db2":        {"kind": "db",   "fields": DB_FIELDS},
    "Exchange":   {"kind": "mail", "fields": MAIL_FIELDS},
    "Exchange / M365": {"kind": "mail", "fields": MAIL_FIELDS},
    "Microsoft 365": {"kind": "mail", "fields": MAIL_FIELDS},
    "Google Workspace": {"kind": "mail", "fields": MAIL_FIELDS},
}
DEFAULT_CONNECTOR = {"kind": "external", "fields": FILE_FIELDS}

# mock users for role-based access (demo only, no real auth)
USERS = [
    {"id": "exec",  "name": "C-Level",       "role": "c-level",      "title": "Executive leadership"},
    {"id": "ds",    "name": "Data Science",  "role": "data-science", "title": "Data science team"},
    {"id": "pm",    "name": "Delivery / PM", "role": "delivery",     "title": "Delivery and project management"},
    {"id": "admin", "name": "Admin",         "role": "admin",        "title": "Platform administration"},
]

# what each role may see (route keys the frontend also enforces)
ROLE_ACCESS = {
    "c-level":      ["overview", "deliverables", "gantt"],
    "data-science": ["overview", "journey", "layer", "deliverables", "gantt", "intake"],
    "delivery":     ["overview", "journey", "layer", "deliverables", "gantt", "intake"],
    "admin":        ["overview", "journey", "layer", "deliverables", "gantt", "intake", "admin"],
}

app = Flask(__name__, static_folder=None)

# Initialize keep-alive service for Render.com (must be at module level for Gunicorn)
if KEEP_ALIVE_AVAILABLE:
    try:
        init_keep_alive()
        print("Keep-alive service initialized")
    except Exception as e:
        print(f"Failed to initialize keep-alive: {e}")


@app.get("/api/health")
def health_check():
    return jsonify({"status": "healthy", "timestamp": datetime.now().isoformat()})


REQUIRED_KEYS = {"product", "client", "layers", "phases", "deliverables", "chatbot"}
PULL_LAYERS = {"infrastructure", "collection", "unification"}


def validate_config(cfg):
    if not isinstance(cfg, dict):
        return "Config must be a JSON object."
    missing = REQUIRED_KEYS - set(cfg.keys())
    if missing:
        return f"Config missing required keys: {', '.join(sorted(missing))}."
    if not isinstance(cfg.get("layers"), list) or not cfg["layers"]:
        return "Config 'layers' must be a non-empty list."
    return None


# ---------------------------------------------------------------------------
# Profiles: each stored client (plus the built-in Generic) is a profile with
# its own config, source selection, and connection registry. The active profile
# is chosen at login and sent per request via the X-Profile header.
# ---------------------------------------------------------------------------
def slugify(name):
    s = "".join(c.lower() if c.isalnum() else "-" for c in (name or "profile"))
    return "-".join(p for p in s.split("-") if p)[:40] or "profile"


def profile_dir(pid):
    return os.path.join(PROFILES_DIR, pid)


def read_config(pid):
    if pid == GENERIC_ID:
        with open(GENERIC_PATH, encoding="utf-8") as f:
            return json.load(f)
    path = os.path.join(profile_dir(pid), "config.json")
    if not os.path.exists(path):
        return None
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def list_profiles():
    out = [{"id": GENERIC_ID, "name": "Start Fresh Project", "mode": "generic", "engagement": "New I-CUP Project"}]
    for pid in sorted(os.listdir(PROFILES_DIR)):
        cfg = read_config(pid)
        if cfg:
            out.append({"id": pid, "name": cfg["client"]["name"], "mode": cfg.get("mode", "client"),
                        "engagement": cfg["client"].get("engagement", "")})
    return out


def active_pid():
    pid = request.headers.get("X-Profile", GENERIC_ID)
    if pid != GENERIC_ID and not os.path.exists(os.path.join(profile_dir(pid), "config.json")):
        return GENERIC_ID
    return pid


def _pf(pid, name):
    return os.path.join(profile_dir(pid), name)


# --- Start-Fresh (generic) session state ---------------------------------
# The generic "Start Fresh Project" is a scratch session, not a stored profile.
# Its selection/connections live IN MEMORY, keyed by a per-browser session id
# sent via the X-Session header. This guarantees a fresh sign-in always starts
# blank (no cross-session or cross-deploy carryover) and needs no disk, so it
# behaves identically on Render's ephemeral filesystem. Saving a project copies
# this scratch state onto a real (on-disk) profile.
_GENERIC_STATE = {}  # { sessionId: {"selection": {...}, "connections": {...}} }


def _session_id():
    return request.headers.get("X-Session", "anon")


def _generic_bucket():
    return _GENERIC_STATE.setdefault(_session_id(), {"selection": {}, "connections": {}})


def clear_generic_session(sid):
    _GENERIC_STATE.pop(sid, None)


def load_selection(pid):
    if pid == GENERIC_ID:
        return dict(_generic_bucket()["selection"])
    p = _pf(pid, "selection.json")
    if os.path.exists(p):
        with open(p, encoding="utf-8") as f:
            return json.load(f)
    return {}


def save_selection(pid, data):
    if pid == GENERIC_ID:
        _generic_bucket()["selection"] = data
        return
    os.makedirs(profile_dir(pid), exist_ok=True)
    with open(_pf(pid, "selection.json"), "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def load_connections(pid):
    if pid == GENERIC_ID:
        return dict(_generic_bucket()["connections"])
    p = _pf(pid, "connections.json")
    if os.path.exists(p):
        with open(p, encoding="utf-8") as f:
            return json.load(f)
    return {}


def save_connections(pid, data):
    if pid == GENERIC_ID:
        _generic_bucket()["connections"] = data
        return
    os.makedirs(profile_dir(pid), exist_ok=True)
    with open(_pf(pid, "connections.json"), "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def connector_for(label):
    return CONNECTORS.get(label, DEFAULT_CONNECTOR)


def all_targets(pid):
    """Every possible pull-layer source in this profile's config."""
    cfg = read_config(pid)
    targets = []
    for layer in cfg["layers"]:
        if layer["key"] not in PULL_LAYERS:
            continue
        for group in layer.get("sourceGroups", []):
            for item in group["items"]:
                cid = hashlib.md5(f"{layer['key']}::{group['label']}::{item}".encode()).hexdigest()[:10]
                conn = connector_for(item)
                targets.append({"id": cid, "layer": layer["key"], "layerName": layer["name"],
                                "group": group["label"], "source": item,
                                "kind": conn["kind"], "fields": conn["fields"]})
    return targets


def selected_targets(pid):
    """Only the sources the user selected (via the Co-Pilot). Empty selection
    for a layer means nothing selected yet, so nothing shows."""
    sel = load_selection(pid)  # { layerKey: [source, ...] }
    chosen = {(k, s) for k, arr in sel.items() for s in arr}
    return [t for t in all_targets(pid) if (t["layer"], t["source"]) in chosen]


# --- profile endpoints ---
@app.get("/api/profiles")
def profiles():
    return jsonify({"profiles": list_profiles()})


@app.get("/api/config")
def config():
    cfg = read_config(active_pid())
    if not cfg:
        abort(404)
    return jsonify(cfg)


@app.post("/api/profiles")
def create_profile():
    if request.headers.get("X-Role", "") != "admin":
        return jsonify({"ok": False, "error": "Admin role required."}), 403
    data = request.get_json(force=True, silent=True)
    err = validate_config(data)
    if err:
        return jsonify({"ok": False, "error": err}), 400
    pid = slugify(data["client"]["name"])
    os.makedirs(profile_dir(pid), exist_ok=True)
    with open(_pf(pid, "config.json"), "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    return jsonify({"ok": True, "id": pid, "name": data["client"]["name"]})


@app.post("/api/profiles/new")
def new_profile():
    """Save the current Start-Fresh session as a named, stored project.

    Any signed-in user can do this from the UI (no admin, no JSON upload): we
    clone the generic template, name it, and carry over whatever sources /
    connections were set up in the generic session so the work isn't lost.
    """
    data = request.get_json(force=True, silent=True) or {}
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"ok": False, "error": "A project name is required."}), 400
    pid = slugify(name)
    if pid == GENERIC_ID or os.path.exists(os.path.join(profile_dir(pid), "config.json")):
        return jsonify({"ok": False, "error": "A project with a similar name already exists."}), 409
    cfg = read_config(GENERIC_ID)
    cfg["mode"] = "client"
    cfg["client"]["name"] = name
    if data.get("engagement"):
        cfg["client"]["engagement"] = data["engagement"].strip()
    os.makedirs(profile_dir(pid), exist_ok=True)
    with open(_pf(pid, "config.json"), "w", encoding="utf-8") as f:
        json.dump(cfg, f, indent=2)
    # carry over the generic session's selection + connections, if any
    sel = load_selection(GENERIC_ID)
    if sel:
        save_selection(pid, sel)
    conns = load_connections(GENERIC_ID)
    if conns:
        save_connections(pid, conns)
    # the scratch session has been promoted to a real profile; drop it so the
    # next Start-Fresh session begins blank
    clear_generic_session(_session_id())
    return jsonify({"ok": True, "id": pid, "name": name,
                    "engagement": cfg["client"].get("engagement", "")})


@app.post("/api/session/reset")
def session_reset():
    """Discard the current Start-Fresh scratch session (called on sign-out).
    Ensures the next fresh session starts blank."""
    clear_generic_session(_session_id())
    return jsonify({"ok": True})


DELETE_PIN = "2345"  # mock demo gate for deleting a profile from the login screen


@app.delete("/api/profiles/<pid>")
def delete_profile(pid):
    # allow either an admin session or the correct delete PIN (login-screen path)
    is_admin = request.headers.get("X-Role", "") == "admin"
    pin_ok = request.headers.get("X-Delete-Pin", "") == DELETE_PIN
    if not (is_admin or pin_ok):
        return jsonify({"ok": False, "error": "Admin role or delete PIN required."}), 403
    if pid == GENERIC_ID:
        return jsonify({"ok": False, "error": "Cannot delete the Generic Template."}), 400
    import shutil
    d = profile_dir(pid)
    if os.path.exists(d):
        shutil.rmtree(d)
    return jsonify({"ok": True})


@app.get("/api/users")
def users():
    return jsonify({"users": USERS, "access": ROLE_ACCESS})


# --- source selection (the Co-Pilot chooses which systems exist) ---
@app.get("/api/selection")
def get_selection():
    pid = active_pid()
    cfg = read_config(pid)
    # ordered list of pull layers (I, C, U as they appear in the config), each
    # with its source groups. The Co-Pilot walks these one group at a time.
    layers = []
    for layer in cfg["layers"]:
        if layer["key"] not in PULL_LAYERS:
            continue
        layers.append({"key": layer["key"], "name": layer["name"], "id": layer["id"],
                       "groups": layer.get("sourceGroups", [])})
    return jsonify({"layers": layers, "selected": load_selection(pid)})


def prefill_values(target):
    return {f["key"]: f["prefill"] for f in target["fields"] if f.get("prefill")}


@app.post("/api/selection")
def set_selection():
    pid = active_pid()
    data = request.get_json(force=True) or {}
    sel = data.get("selected", {})
    chosen = {(k, s) for k, arr in sel.items() for s in arr}
    targets = {t["id"]: t for t in all_targets(pid) if (t["layer"], t["source"]) in chosen}
    conns = {cid: c for cid, c in load_connections(pid).items() if cid in targets}
    # newly selected sources get realistic prefilled values so they look real;
    # status "configured" means filled but not yet tested.
    for cid, t in targets.items():
        if cid not in conns:
            conns[cid] = {"id": cid, "source": t["source"], "layer": t["layer"], "kind": t["kind"],
                          "values": prefill_values(t), "status": "configured", "testedAt": None, "detail": None}
    save_connections(pid, conns)
    save_selection(pid, sel)
    return jsonify({"ok": True, "selected": sel})


# --- connections (only for selected sources) ---
@app.get("/api/sources")
def sources():
    pid = active_pid()
    conns = load_connections(pid)
    targets = selected_targets(pid)
    for t in targets:
        t["connection"] = conns.get(t["id"])
    by_layer = {}
    for t in targets:
        st = (t["connection"] or {}).get("status", "not-configured")
        by_layer.setdefault(t["layer"], {"total": 0, "connected": 0, "name": t["layerName"]})
        by_layer[t["layer"]]["total"] += 1
        if st == "connected":
            by_layer[t["layer"]]["connected"] += 1
    return jsonify({"targets": targets, "layers": by_layer})


@app.post("/api/connections/<cid>")
def save_connection(cid):
    pid = active_pid()
    target = next((t for t in selected_targets(pid) if t["id"] == cid), None)
    if not target:
        abort(404)
    values = (request.get_json(force=True) or {}).get("values", {})
    conns = load_connections(pid)
    prev = conns.get(cid, {})
    conns[cid] = {"id": cid, "source": target["source"], "layer": target["layer"], "kind": target["kind"],
                  "values": values,
                  "status": "connected" if (prev.get("status") == "connected" and prev.get("values") == values) else "configured",
                  "testedAt": prev.get("testedAt"), "detail": prev.get("detail")}
    save_connections(pid, conns)
    return jsonify({"ok": True, "connection": conns[cid]})


@app.post("/api/connections/<cid>/test")
def test_connection(cid):
    pid = active_pid()
    target = next((t for t in selected_targets(pid) if t["id"] == cid), None)
    if not target:
        abort(404)
    conns = load_connections(pid)
    values = conns.get(cid, {}).get("values", {})
    missing = [f["label"] for f in target["fields"] if f.get("required") and not str(values.get(f["key"], "")).strip()]
    if missing:
        return jsonify({"ok": False, "status": "error",
                        "error": "Missing required fields: " + ", ".join(missing)}), 400
    seed = int(hashlib.md5((pid + cid).encode()).hexdigest(), 16)
    rng = random.Random(seed)
    time.sleep(0.4)
    ping = rng.randint(11, 140)
    kind = target["kind"]
    if kind == "db":
        objects, unit = rng.randint(120, 900), "tables"
    elif kind in ("erp", "crm"):
        objects, unit = rng.randint(40, 300), "objects"
    elif kind == "mail":
        objects, unit = rng.randint(3, 40), "mailboxes"
    else:
        objects, unit = rng.randint(2, 60), "datasets"
    detail = {"pingMs": ping, "discovered": objects, "unit": unit,
              "endpoint": values.get("host") or values.get("baseUrl") or values.get("tenant") or values.get("location", "")}
    conns[cid] = {**conns.get(cid, {}), "id": cid, "source": target["source"], "layer": target["layer"],
                  "kind": kind, "values": values, "status": "connected",
                  "testedAt": int(time.time()), "detail": detail}
    save_connections(pid, conns)
    return jsonify({"ok": True, "status": "connected", "detail": detail, "connection": conns[cid]})


@app.get("/api/connections")
def list_connections():
    conns = load_connections(active_pid())
    ready = [c for c in conns.values() if c.get("status") == "connected"]
    return jsonify({"connections": list(conns.values()), "readyCount": len(ready)})


@app.get("/artifacts/<path:subpath>")
def artifacts(subpath):
    root = os.path.realpath(REPO)
    full = os.path.realpath(os.path.join(root, subpath))
    # containment check, case-insensitive on Windows
    if os.path.normcase(os.path.commonpath([root, full])) != os.path.normcase(root):
        abort(403)
    if not os.path.exists(full):
        abort(404)
    directory, filename = os.path.split(full)
    return send_from_directory(directory, filename)


@app.get("/")
@app.get("/<path:path>")
def spa(path=""):
    candidate = os.path.join(DIST, path)
    if path and os.path.exists(candidate) and os.path.isfile(candidate):
        return send_from_directory(DIST, path)
    index = os.path.join(DIST, "index.html")
    if os.path.exists(index):
        return send_from_directory(DIST, "index.html")
    return ("React build not found. Run `npm run build` in app/frontend.", 200)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=True)
