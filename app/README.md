# FS I-CUPP Delivery Console

React + Flask mock demo. A plug-and-play delivery console for FS engagements: the
client walks the I-CUPP framework layer by layer, an intake chatbot asks the
questions FS needs, deliverables link out, and a Gantt tracks all nine by phase and
week. Configured for Skyworks ODS Assessment; re-target any client by swapping one
JSON file.

## Layout

```
app/
  backend/
    app.py               Flask: config API, chat intake, artifact serving, SPA host
    client_config.json   THE plug-and-play file: client, ICUPP layers, phases,
                         9 deliverables, chatbot script. Swap this per client.
    requirements.txt
  frontend/              Vite + React SPA (built to frontend/dist)
    src/pages/           Overview, Journey, LayerPage, Deliverables, GanttPage, Intake
    src/components/      ChatBot (scripted intake), Stepper (ICUPP)
```

## Run (production-style, one server)

```
cd app/frontend && npm install && npm run build
cd ../backend && pip install -r requirements.txt && python app.py
# open http://localhost:5000
```

Flask serves the built SPA, the config/chat API, and the deliverable artifacts
(D1/D2 HTML reports out of the repo root via /artifacts/...).

## Run (dev, hot reload)

```
# terminal 1
cd app/backend && python app.py           # :5000
# terminal 2
cd app/frontend && npm run dev            # :5173, proxies /api + /artifacts to :5000
```

## How it maps to the SOW

- **I-CUPP layers** (Infrastructure, Collection, Unification, Processing/BPC,
  Presentation) are the client journey. Infrastructure is the Skyworks-owned input
  layer FS does not provision; the other four produce the deliverables.
- **9 deliverables / 4 phases / weeks 1-12** come straight from the SOW. Delivered
  ones (D1, D2) link to the real HTML reports; the rest are planned.
- **Chatbot** is a deterministic scripted flow (no LLM, no data connection). It asks
  per-layer intake questions and writes answers to `intake_store.json`. This is the
  "get info to populate what we need" piece and is fully reproducible for a demo.

## Re-target for another client

Edit `backend/client_config.json`: swap client info, layer summaries, deliverables,
and the chatbot question flow. Point `deliverables[].artifact` at that client's
files. No code changes. Swap `--navy` / `--accent` in `frontend/src/styles/app.css`
for the new client's brand colors and rebuild.
