# Deploy — FS Data BPC

This app is a **Flask backend** (profiles, connections, the simulated test
handshake) serving a **pre-built React SPA**. Netlify cannot host it (static
only, no Python, no disk). Deploy to a Python host instead. Render is set up
here as a one-file blueprint.

## What's in the box

- `app/backend/` — Flask app (`app.py`), `requirements.txt`, `Procfile`
- `app/frontend/dist/` — **pre-built** SPA (committed, so the host needs no Node)
- `render.yaml` — Render blueprint (build + start + env, ready to go)

## Deploy to Render (recommended)

1. Push this repo to GitHub (or connect the folder to Render).
2. Render dashboard → **New → Blueprint** → pick the repo. It reads `render.yaml`
   and provisions the service automatically. Nothing to configure.
3. First deploy takes a minute. The app comes up at the Render URL.

That's it. `render.yaml` already sets:
- `rootDir: app/backend`, `buildCommand: pip install -r requirements.txt`
- `startCommand: gunicorn app:app --bind 0.0.0.0:$PORT`
- `ARTIFACT_ROOT=/opt/render/project/src` so deliverable artifacts (D1, D2) resolve

## Any other Python host (Railway / Fly / Heroku)

The `Procfile` in `app/backend/` works too:
```
web: gunicorn app:app --bind 0.0.0.0:$PORT
```
Point the host at `app/backend`, install `requirements.txt`, run the Procfile.
Set `ARTIFACT_ROOT` to the repo checkout root if you want D1/D2 artifacts served.

## If you change the frontend

The host serves the committed `dist/`. After editing anything in
`app/frontend/src/`, rebuild and commit:
```
cd app/frontend
npm install   # first time only
npm run build
```

## Note on saved projects

Profiles and connections are written to `app/backend/profiles/` on disk. On
Render's free tier this disk is **ephemeral** — saved projects reset on redeploy
or restart. Fine for a demo. For durable storage, attach a Render persistent
disk (paid) mounted at `app/backend/profiles`.
