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
import re
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
CLOUD_FIELDS = [
    {"key": "workspace", "label": "Workspace / account", "prefill": "bpc-analytics", "required": True},
    {"key": "region", "label": "Region", "prefill": "eastus", "required": True},
    {"key": "authMode", "label": "Auth mode", "type": "select",
     "options": ["Service principal", "Managed identity", "Access key"], "prefill": "Service principal", "required": True},
    {"key": "secretRef", "label": "Secret reference (vault path / key name)",
     "prefill": "kv://bpc/cloud/sp", "required": True, "secret": True},
]
LLM_FIELDS = [
    {"key": "endpoint", "label": "Model endpoint", "prefill": "https://models.bpc.internal/v1", "required": True},
    {"key": "model", "label": "Model", "type": "select",
     "options": ["bpc-metadata-ingest", "bpc-usage-scorer", "bpc-classifier", "bpc-summarizer"], "prefill": "bpc-metadata-ingest", "required": True},
    {"key": "authMode", "label": "Auth mode", "type": "select",
     "options": ["API key", "Managed identity"], "prefill": "API key", "required": True},
    {"key": "secretRef", "label": "Secret reference (vault path / key name)",
     "prefill": "kv://bpc/llm/key", "required": True, "secret": True},
]

# Each source label maps to a connector kind; the kind rolls up to a top-level
# CATEGORY (sources / cloud / llm) used by the Infrastructure view. A config
# source may override its category by prefixing the group or via CATEGORY_BY_KIND.
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
    # cloud platforms
    "Microsoft Fabric": {"kind": "cloud", "fields": CLOUD_FIELDS},
    "Databricks":       {"kind": "cloud", "fields": CLOUD_FIELDS},
    "Snowflake":        {"kind": "cloud", "fields": CLOUD_FIELDS},
    "Synapse":          {"kind": "cloud", "fields": CLOUD_FIELDS},
    "Warehouse":        {"kind": "cloud", "fields": CLOUD_FIELDS},
    "Cloud Platform":   {"kind": "cloud", "fields": CLOUD_FIELDS},
    "Data Lake":        {"kind": "cloud", "fields": CLOUD_FIELDS},
    # LLM / model endpoints (the BPC accelerator)
    "BPC Models":       {"kind": "llm", "fields": LLM_FIELDS},
    "Metadata Ingest Model": {"kind": "llm", "fields": LLM_FIELDS},
    "Usage Scoring Model":   {"kind": "llm", "fields": LLM_FIELDS},
    "Classification Model":  {"kind": "llm", "fields": LLM_FIELDS},
    "Summarization Model":   {"kind": "llm", "fields": LLM_FIELDS},
}
DEFAULT_CONNECTOR = {"kind": "external", "fields": FILE_FIELDS}

# kind -> top-level connection category shown in Infrastructure
CATEGORY_BY_KIND = {
    "erp": "sources", "crm": "sources", "db": "sources", "mail": "sources", "external": "sources",
    "cloud": "cloud", "llm": "llm",
}
CATEGORY_LABEL = {"sources": "Sources", "cloud": "Cloud", "llm": "LLM"}

# mock users for role-based access (demo only, no real auth). Roles mirror the
# SOW delivery personas; each sees only the parts of the assessment they work on.
USERS = [
    {"id": "exec",     "name": "C-Level",          "role": "c-level",   "title": "Executive leadership"},
    {"id": "architect","name": "Solution Architect","role": "architect", "title": "Architecture & lineage"},
    {"id": "engineer", "name": "Data Engineer",    "role": "engineer",  "title": "Ingestion, ETL & connectivity"},
    {"id": "analyst",  "name": "Data Analyst",     "role": "analyst",   "title": "Domain, scoring & enrichment"},
    {"id": "pm",       "name": "Delivery / PM",    "role": "delivery",  "title": "Delivery and project management"},
    {"id": "admin",    "name": "Admin",            "role": "admin",     "title": "Platform administration"},
]

# Route keys each role may open. Layers are one route ("layers"); which LAYERS
# and which SUB-PARTS a role sees is controlled by ROLE_LAYERS / ROLE_SUBPARTS.
# C-Level: overview only. PM: everything except admin settings. Admin: all.
ROLE_ACCESS = {
    "c-level":   ["overview"],
    "architect": ["overview", "layers"],
    "engineer":  ["overview", "layers"],
    "analyst":   ["overview", "layers"],
    "delivery":  ["overview", "layers"],
    "admin":     ["overview", "layers", "admin"],
}

# which assessment layers each role may open
_ALL_LAYERS = ["infrastructure", "collection", "unification", "presentation"]
ROLE_LAYERS = {
    "c-level":   [],
    "architect": ["infrastructure", "unification", "presentation"],
    "engineer":  ["infrastructure", "collection", "unification"],
    "analyst":   ["collection", "unification", "presentation"],
    "delivery":  _ALL_LAYERS,
    "admin":     _ALL_LAYERS,
}

# which Collection sub-parts a role works on (sub-part id -> roles). PM/Admin see
# all. Sub-parts a role can't see are hidden. Layers other than Collection show
# all their sub-parts to any role that can open the layer.
ROLE_SUBPARTS = {
    "domain-intelligence":   ["analyst", "delivery", "admin"],
    "automated-data-catalog":["engineer", "analyst", "delivery", "admin"],
    "data-enrichment":       ["analyst", "delivery", "admin"],
    "transformation":        ["engineer", "delivery", "admin"],   # ETL / DB assessment
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
    out = [{"id": GENERIC_ID, "name": "Start Fresh Project", "mode": "generic", "engagement": "New Data Assessment"}]
    for pid in sorted(os.listdir(PROFILES_DIR)):
        cfg = read_config(pid)
        if cfg:
            out.append({"id": pid, "name": cfg["client"]["name"], "mode": cfg.get("mode", "client"),
                        "isDemo": bool(cfg.get("isDemo")),
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
# profiles/sessions with "Run full project" applied -> config presented as done
_FULL_DEMO = set()


def _session_id():
    return request.headers.get("X-Session", "anon")


def _generic_bucket():
    return _GENERIC_STATE.setdefault(_session_id(), {"selection": {}, "connections": {}})


def clear_generic_session(sid):
    _GENERIC_STATE.pop(sid, None)
    _FULL_DEMO.discard(f"{GENERIC_ID}::{sid}")


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


def category_for(group, kind):
    """Top-level connection category. A sourceGroup may set an explicit
    'category' in config; otherwise it's derived from the connector kind."""
    if isinstance(group, dict) and group.get("category") in CATEGORY_LABEL:
        return group["category"]
    return CATEGORY_BY_KIND.get(kind, "sources")


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
                                "kind": conn["kind"], "category": category_for(group, conn["kind"]),
                                "fields": conn["fields"]})
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
    pid = active_pid()
    cfg = read_config(pid)
    if not cfg:
        abort(404)
    if _demo_key(pid) in _FULL_DEMO:
        cfg = apply_full_demo(cfg)
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


def _test_detail(pid, cid, kind, values):
    """Deterministic mock handshake result (shared by test + run-demo)."""
    rng = random.Random(int(hashlib.md5((pid + cid).encode()).hexdigest(), 16))
    ping = rng.randint(11, 140)
    if kind == "db":
        objects, unit = rng.randint(120, 900), "tables"
    elif kind in ("erp", "crm"):
        objects, unit = rng.randint(40, 300), "objects"
    elif kind == "mail":
        objects, unit = rng.randint(3, 40), "mailboxes"
    elif kind == "cloud":
        objects, unit = rng.randint(6, 80), "workspaces"
    elif kind == "llm":
        objects, unit = rng.randint(1, 6), "models"
    else:
        objects, unit = rng.randint(2, 60), "datasets"
    return {"pingMs": ping, "discovered": objects, "unit": unit,
            "endpoint": values.get("host") or values.get("baseUrl") or values.get("tenant")
            or values.get("workspace") or values.get("endpoint") or values.get("location", "")}


def auto_provision(pid, select_all=True):
    """Select every source in the profile and mark all connections 'connected'
    with prefilled values + mock detail. Powers the demo profile and the
    'Run full project' button so meters and connections show live data."""
    targets = all_targets(pid)
    if select_all:
        sel = {}
        for t in targets:
            sel.setdefault(t["layer"], [])
            if t["source"] not in sel[t["layer"]]:
                sel[t["layer"]].append(t["source"])
        save_selection(pid, sel)
    conns = load_connections(pid)
    for t in targets:
        cid = t["id"]
        vals = prefill_values(t)
        conns[cid] = {"id": cid, "source": t["source"], "layer": t["layer"], "kind": t["kind"],
                      "values": vals, "status": "connected", "testedAt": int(time.time()),
                      "detail": _test_detail(pid, cid, t["kind"], vals)}
    save_connections(pid, conns)


def _demo_key(pid):
    return f"{pid}::{_session_id()}" if pid == GENERIC_ID else pid


def apply_full_demo(cfg):
    """Present a config as a finished engagement: every deliverable delivered,
    alignment at target, milestones complete, statuses green."""
    for d in cfg.get("deliverables", []):
        d["status"] = "delivered"
        if not d.get("artifact"):
            d["artifact"] = "/artifacts/demo/index.html"
    # give a blank Start-Fresh project a schedule once the full project is run
    cl = cfg.setdefault("client", {})
    if not cl.get("activeWeeks"):
        cl["activeWeeks"] = 10
        cl["acceptanceWeeks"] = cl.get("acceptanceWeeks") or 2
        cl["durationWeeks"] = cl.get("durationWeeks") or 12
    ov = cfg.setdefault("overview", {})
    if ov.get("alignment"):
        ov["alignment"]["current"] = ov["alignment"].get("target", 100)
    for m in ov.get("milestones", []):
        m["status"] = "delivered"
    for layer in cfg.get("layers", []):
        for s in (layer.get("presentation", {}) or {}).get("statuses", []):
            s["state"] = "delivered"
        # populate sub-part boxes: promote demoMetrics -> metrics, mark delivered
        for sp in layer.get("subparts", []):
            if sp.get("demoMetrics") and not sp.get("metrics"):
                sp["metrics"] = sp["demoMetrics"]
            sp["state"] = "delivered"
    return cfg


@app.post("/api/demo/run")
def demo_run():
    """Run the full project on the active profile: connect every source and mark
    the engagement complete end to end."""
    pid = active_pid()
    auto_provision(pid)
    _FULL_DEMO.add(_demo_key(pid))
    return jsonify({"ok": True})


def _strip_money(text):
    """Remove any line containing a currency amount or fee wording. No dollar
    figure is ever parsed, stored, or shown."""
    out = []
    money = re.compile(r"\$|\bUSD\b|\bfee\b|\bpayment\b|\binvoice\b|\bcost of\b", re.I)
    for ln in text.splitlines():
        if money.search(ln):
            continue
        out.append(ln)
    return "\n".join(out)


def parse_sow_pdf(raw):
    """Extract Overview-relevant fields from a SOW PDF (no dollar amounts).
    Returns a dict merged onto the generic template to form a profile config."""
    from pypdf import PdfReader
    import io
    reader = PdfReader(io.BytesIO(raw))
    text = _strip_money("\n".join((p.extract_text() or "") for p in reader.pages))
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    joined = "\n".join(lines)

    # engagement / client name
    client = None
    m = re.search(r"between\s+(.+?)\s*\(", joined)
    if m:
        client = m.group(1).strip()
    # engagement: prefer a named "... Assessment/Readiness/Modernization" phrase
    # from the body, not a section heading.
    engagement = None
    m = re.search(r"conduct a[n]?\s+(.+?assessment|.+?readiness assessment|.+?modernization[^.,]*)", joined, re.I)
    if m:
        engagement = re.sub(r"\s+", " ", m.group(1)).strip(" .,")
    if not engagement:
        for l in lines:
            if re.search(r"\b(assessment|modernization|readiness)\b", l, re.I) and 12 < len(l) < 70 \
               and not re.search(r"methodology|deliverable|phase|scope", l, re.I):
                engagement = l.strip(" ."); break

    # weeks
    weeks = None
    m = re.search(r"(\d+)\s*weeks", joined, re.I)
    if m:
        weeks = int(m.group(1))

    # deliverables: "# Deliverable Description" table rows. The name is the
    # leading Title-Case phrase; a run-on description follows, which we trim.
    # a deliverable name usually ends at one of these nouns; cut right after it
    _END = re.compile(r"^(Report|Inventory|Map|Backlog|Playbook|Scorecard|Summary|"
                      r"Baseline|Model|Catalog|Assessment|Analysis|Plan|Matrix)\b", re.I)

    def clean_name(s):
        s = re.sub(r"([a-z])([A-Z])", r"\1 \2", s)   # split runs like "InventoryCatalog"
        s = re.sub(r"\s+", " ", s).strip()
        words = s.split(" ")
        out = []
        for w in words:
            out.append(w)
            if len(out) >= 2 and _END.match(w):
                break
            if out and len(out) >= 2 and w and w[0].islower():
                out.pop(); break
            if len(out) >= 6:
                break
        return " ".join(out).strip(" .,-")

    dels = []
    for m in re.finditer(r"(?:^|\n)\s*(\d{1,2})\s+([A-Z][A-Za-z0-9 /&\-]{6,70})", joined):
        n, name = int(m.group(1)), clean_name(m.group(2))
        if 1 <= n <= 20 and name and not any(d["n"] == n for d in dels):
            dels.append({"n": n, "name": name})
    dels = sorted(dels, key=lambda d: d["n"])[:12]

    # candidate systems (upstream/reference) mentioned
    known = ["SAP", "Kinaxis", "PLM", "EDI", "PROMIS", "CRM", "Warehouse",
             "Enterprise Analytics", "Oracle", "Db2", "SQL", "Snowflake",
             "Databricks", "Microsoft Fabric", "Synapse", "Salesforce"]
    systems = [s for s in known if re.search(re.escape(s), joined, re.I)]

    return {"client": client, "engagement": engagement, "weeks": weeks,
            "deliverables": dels, "systems": systems, "chars": len(text)}


@app.post("/api/profiles/from-sow")
def profile_from_sow():
    """Admin uploads a SOW PDF; we extract Overview fields (never any dollar
    amount) and build a profile from the generic template."""
    if request.headers.get("X-Role", "") != "admin":
        return jsonify({"ok": False, "error": "Admin role required."}), 403
    f = request.files.get("file")
    if not f:
        return jsonify({"ok": False, "error": "No PDF uploaded."}), 400
    raw = f.read()
    try:
        parsed = parse_sow_pdf(raw)
    except Exception as e:
        return jsonify({"ok": False, "error": f"Could not read PDF: {e}"}), 400

    name = (request.form.get("name") or parsed.get("client") or "SOW Project").strip()
    pid = slugify(name)
    if pid == GENERIC_ID or os.path.exists(os.path.join(profile_dir(pid), "config.json")):
        return jsonify({"ok": False, "error": "A project with a similar name already exists."}), 409

    cfg = read_config(GENERIC_ID)
    cfg["mode"] = "client"
    cfg["client"]["name"] = name
    if parsed.get("engagement"):
        cfg["client"]["engagement"] = parsed["engagement"]
    if parsed.get("weeks"):
        cfg["client"]["durationWeeks"] = parsed["weeks"]
    cfg["sowSource"] = {"parsed": True, "deliverables": len(parsed["deliverables"]),
                        "systems": parsed["systems"], "chars": parsed["chars"]}
    # overlay parsed deliverable names onto the template's deliverables where present
    if parsed["deliverables"]:
        base = cfg.get("deliverables", [])
        merged = []
        for i, d in enumerate(parsed["deliverables"]):
            tmpl = base[i] if i < len(base) else {}
            merged.append({**tmpl, "id": d["n"], "code": f"D{d['n']}", "name": d["name"],
                           "status": tmpl.get("status", "planned"),
                           "artifact": tmpl.get("artifact")})
        cfg["deliverables"] = merged

    os.makedirs(profile_dir(pid), exist_ok=True)
    with open(_pf(pid, "config.json"), "w", encoding="utf-8") as f2:
        json.dump(cfg, f2, indent=2)
    return jsonify({"ok": True, "id": pid, "name": name, "parsed": {
        "engagement": parsed.get("engagement"), "weeks": parsed.get("weeks"),
        "deliverables": len(parsed["deliverables"]), "systems": parsed["systems"]}})


@app.post("/api/profiles/from-form")
def profile_from_form():
    """Admin fills the Overview fields by hand (no SOW / no JSON). Builds a
    profile from the generic template with the supplied overview data."""
    if request.headers.get("X-Role", "") != "admin":
        return jsonify({"ok": False, "error": "Admin role required."}), 403
    d = request.get_json(silent=True) or {}
    name = (d.get("name") or "").strip()
    if not name:
        return jsonify({"ok": False, "error": "Client / project name is required."}), 400
    pid = slugify(name)
    if pid == GENERIC_ID or os.path.exists(os.path.join(profile_dir(pid), "config.json")):
        return jsonify({"ok": False, "error": "A project with a similar name already exists."}), 409

    def num(v, dflt):
        try: return int(v)
        except (TypeError, ValueError): return dflt

    cfg = read_config(GENERIC_ID)
    cfg["mode"] = "client"
    cl = cfg["client"]
    cl["name"] = name
    if d.get("engagement"): cl["engagement"] = d["engagement"].strip()
    if d.get("framework"): cl["framework"] = d["framework"].strip()
    cl["durationWeeks"] = num(d.get("durationWeeks"), cl.get("durationWeeks", 12))
    cl["activeWeeks"] = num(d.get("activeWeeks"), cl.get("activeWeeks", 10))
    cl["acceptanceWeeks"] = num(d.get("acceptanceWeeks"), cl.get("acceptanceWeeks", 2))

    ov = cfg.setdefault("overview", {})
    if d.get("headline"): ov["headline"] = d["headline"].strip()
    if d.get("background"): ov["background"] = d["background"].strip()
    if d.get("outcome"): ov["outcome"] = d["outcome"].strip()
    # highlights: list of {label, value, unit}
    hl = [h for h in (d.get("highlights") or [])
          if (h.get("label") or "").strip() and (str(h.get("value")).strip())]
    if hl:
        ov["highlights"] = [{"label": h["label"].strip(), "value": str(h["value"]).strip(),
                             **({"unit": h["unit"].strip()} if (h.get("unit") or "").strip() else {})}
                            for h in hl]
    al = ov.setdefault("alignment", {"current": 0, "target": 100, "label": "Assessment progress"})
    al["current"] = num(d.get("alignmentCurrent"), al.get("current", 0))
    al["target"] = num(d.get("alignmentTarget"), al.get("target", 100))
    if d.get("alignmentLabel"): al["label"] = d["alignmentLabel"].strip()

    os.makedirs(profile_dir(pid), exist_ok=True)
    with open(_pf(pid, "config.json"), "w", encoding="utf-8") as f2:
        json.dump(cfg, f2, indent=2)
    return jsonify({"ok": True, "id": pid, "name": name})


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
    return jsonify({"users": USERS, "access": ROLE_ACCESS,
                    "layers": ROLE_LAYERS, "subparts": ROLE_SUBPARTS})


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


def usage_meters(pid, targets):
    """Deterministic mock 'usage' meters per connection category, so the
    Infrastructure view always has something live to show. Values are seeded by
    (pid, category) so they're stable per profile."""
    def seeded(cat, lo, hi):
        s = int(hashlib.md5((pid + "::meter::" + cat).encode()).hexdigest(), 16)
        return random.Random(s).randint(lo, hi)

    cats = {c: [t for t in targets if t["category"] == c] for c in CATEGORY_LABEL}
    connected = lambda arr: sum(1 for t in arr if (t.get("connection") or {}).get("status") == "connected")
    meters = []
    # Meters represent live usage, so only show them for categories that actually
    # have a CONNECTED target - never for merely selected/configured ones.
    # Sources: freshness / rows pulled
    src = cats["sources"]
    if connected(src):
        meters.append({"category": "sources", "label": "Records ingested",
                       "value": seeded("src_rows", 40, 96), "unit": "%", "kind": "bar",
                       "detail": f"{seeded('src_m', 2, 48)}.{seeded('src_d',0,9)}M rows this cycle"})
        meters.append({"category": "sources", "label": "Source freshness",
                       "value": seeded("src_fresh", 70, 99), "unit": "%", "kind": "bar",
                       "detail": f"last sync {seeded('src_sync', 2, 55)}m ago"})
    # Cloud: compute / storage
    cld = cats["cloud"]
    if connected(cld):
        meters.append({"category": "cloud", "label": "Compute utilization",
                       "value": seeded("cld_cpu", 35, 88), "unit": "%", "kind": "bar",
                       "detail": f"{seeded('cld_cu', 40, 260)} CU active"})
        meters.append({"category": "cloud", "label": "Storage used",
                       "value": seeded("cld_stor", 20, 75), "unit": "%", "kind": "bar",
                       "detail": f"{seeded('cld_tb', 1, 9)}.{seeded('cld_tf',0,9)} TB / 12 TB"})
    # LLM: token usage / calls
    llm = cats["llm"]
    if connected(llm):
        meters.append({"category": "llm", "label": "LLM token usage",
                       "value": seeded("llm_tok", 30, 82), "unit": "%", "kind": "bar",
                       "detail": f"{seeded('llm_m', 1, 9)}.{seeded('llm_k',0,9)}M / 12M tokens"})
        meters.append({"category": "llm", "label": "Inference calls",
                       "value": seeded("llm_calls", 45, 95), "unit": "%", "kind": "bar",
                       "detail": f"{seeded('llm_c', 4, 90)}k calls this cycle"})
    return meters


# --- connections (only for selected sources) ---
@app.get("/api/sources")
def sources():
    pid = active_pid()
    conns = load_connections(pid)
    targets = selected_targets(pid)
    for t in targets:
        t["connection"] = conns.get(t["id"])
    by_layer = {}
    by_category = {}
    for t in targets:
        st = (t["connection"] or {}).get("status", "not-configured")
        by_layer.setdefault(t["layer"], {"total": 0, "connected": 0, "name": t["layerName"]})
        by_layer[t["layer"]]["total"] += 1
        cat = t["category"]
        by_category.setdefault(cat, {"total": 0, "connected": 0, "label": CATEGORY_LABEL[cat]})
        by_category[cat]["total"] += 1
        if st == "connected":
            by_layer[t["layer"]]["connected"] += 1
            by_category[cat]["connected"] += 1
    return jsonify({"targets": targets, "layers": by_layer,
                    "categories": by_category, "meters": usage_meters(pid, targets)})


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
    time.sleep(0.4)
    kind = target["kind"]
    detail = _test_detail(pid, cid, kind, values)
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
