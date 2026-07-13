import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useConfig, connReadiness } from "../config.jsx";
import { GENIE_LOGO } from "../genielogo.js";

// Natural step-by-step intake: the Co-Pilot walks the source groups one at a
// time in I -> C -> U order, asking conversationally, then provisions the picks
// as connections.
export default function ChatBot() {
  const { config, selection, saveSelection, sources, botOpen, setBotOpen, pid } = useConfig();
  const nav = useNavigate();
  const bodyRef = useRef(null);

  // flat ordered step list: one per (layer, group)
  const steps = useMemo(() => {
    const out = [];
    (selection.layers || []).forEach((l) =>
      (l.groups || []).forEach((g) =>
        out.push({ layerKey: l.key, layerName: l.name, layerId: l.id, group: g.label, items: g.items })
      )
    );
    return out;
  }, [selection.layers]);

  const [i, setI] = useState(0);                 // current step index
  const [picks, setPicks] = useState({});        // { layerKey: Set(sources) }
  const [msgs, setMsgs] = useState([]);          // conversation log
  const [phase, setPhase] = useState("ask");     // ask | done
  const [busy, setBusy] = useState(false);

  const r = connReadiness(sources);
  const started = msgs.length > 0;
  // profile already fully provisioned (e.g. a delivered engagement): nothing to
  // ask, just confirm the info is on file.
  const gathered = r.hasSelection && r.complete;

  const reset = () => {
    const seed = {};
    (selection.layers || []).forEach((l) => { seed[l.key] = new Set(selection.selected?.[l.key] || []); });
    setPicks(seed);
    setI(0);
    setPhase("ask");
    setMsgs([{ from: "bot", text: "Let's set up the data sources to connect. Going layer by layer, starting with Infrastructure." }]);
  };

  // switching profiles: wipe the conversation so it never carries stale state
  // (e.g. fresh project -> Skyworks). Next open re-inits from the new profile.
  useEffect(() => {
    setMsgs([]); setPhase("ask"); setI(0); setPicks({});
  }, [pid]);

  // start / refresh when opened, or when the loaded data for this profile arrives
  useEffect(() => {
    if (!botOpen || !steps.length) return;
    if (gathered) {
      // already provisioned -> confirm, don't ask (even if a stale "ask" was shown)
      if (phase !== "done" || !started) {
        setPhase("done");
        setMsgs([{ from: "bot", text: `Source information already gathered. ${r.total} connection${r.total === 1 ? "" : "s"} live across the layers. Open Infrastructure to review endpoints.` }]);
      }
    } else if (!started) {
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [botOpen, steps.length, gathered]);

  useEffect(() => { if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight; }, [msgs, i, phase]);

  const step = steps[i];
  const cur = step ? (picks[step.layerKey] || new Set()) : new Set();

  const toggle = (src) => {
    const s = new Set(picks[step.layerKey] || []);
    s.has(src) ? s.delete(src) : s.add(src);
    setPicks({ ...picks, [step.layerKey]: s });
  };

  const answerText = (set) => (set.size ? [...set].join(", ") : "None here");

  const next = () => {
    // log the user's answer for this group
    setMsgs((m) => [...m,
      { from: "user", text: answerText(cur) },
    ]);
    if (i + 1 < steps.length) {
      const nx = steps[i + 1];
      if (nx.layerKey !== step.layerKey) {
        setMsgs((m) => [...m, { from: "bot", text: `Got it. On to ${nx.layerName}.` }]);
      }
      setI(i + 1);
    } else {
      finish();
    }
  };

  const finish = async () => {
    setBusy(true);
    const payload = Object.fromEntries((selection.layers || []).map((l) => [l.key, [...(picks[l.key] || [])]]));
    const total = Object.values(payload).reduce((a, arr) => a + arr.length, 0);
    await saveSelection(payload);
    setBusy(false);
    setPhase("done");
    setMsgs((m) => [...m, { from: "bot", text: total ? `Done. ${total} connection${total === 1 ? "" : "s"} set up across the layers. Open Infrastructure to review endpoints and test each one.` : "No sources selected. Reopen anytime to add some." }]);
  };

  const goConnections = () => { setBotOpen(false); nav("/layer/infrastructure"); };

  if (!config) return null;

  // draw attention on the Start-Fresh project until sources are set up
  const needsSetup = pid === "generic" && !gathered;
  // the user has "started" once they pick any source, finish, or it's gathered
  const beganSetup = gathered || phase === "done" || r.hasSelection
    || Object.values(picks).some((s) => s && s.size);
  // the Genie flow is COMPLETE once setup is finished or sources are gathered
  const setupComplete = gathered || phase === "done";
  // "Start here" pill only until they begin
  const showPill = pid === "generic" && !beganSetup;
  // On a fresh Start-Fresh project the Genie is MANDATORY: it can't be dismissed
  // and the blur stays until the whole flow is complete. This holds even if the
  // panel is toggled - the backdrop is driven by completion, not by botOpen.
  const mustComplete = pid === "generic" && !setupComplete;
  // keep the panel forced open while setup is mandatory
  const panelOpen = botOpen || mustComplete;
  const modalBackdrop = mustComplete;

  return (
    <>
      {modalBackdrop && <div className="cb-backdrop" />}
      {!panelOpen && (
        <div className="cb-fab-wrap">
          {showPill && <span className="cb-pill">Start here</span>}
          <button className={"cb-fab" + (needsSetup ? " glow" : "")} onClick={() => setBotOpen(true)}>
            <span className="cb-fab-ic"><img src={GENIE_LOGO} alt="FS" /></span>
            <span>
              <b>FS Data Genie</b>
              <i>{gathered ? "Info gathered" : r.hasSelection ? `Sources ${r.connected}/${r.total}` : "Set up sources to connect"}</i>
            </span>
          </button>
        </div>
      )}

      {panelOpen && (
        <div className={"cb-panel" + (needsSetup ? " glow" : "")}>
          {showPill && <span className="cb-pill">Start here</span>}
          <div className="cb-head">
            <span className="cb-head-tag"><img src={GENIE_LOGO} alt="FS" /></span>
            <div>
              <div className="cb-title">FS Data Genie</div>
              <div className="cb-progress">
                {steps.length > 0 && phase === "ask"
                  ? `${step?.layerName} · step ${i + 1} of ${steps.length}`
                  : phase === "done" ? "Setup complete" : "Source intake"}
              </div>
            </div>
            {!mustComplete && <button className="cb-x" onClick={() => setBotOpen(false)}>×</button>}
          </div>

          <div className="cb-body" ref={bodyRef}>
            {msgs.map((m, k) => (
              <div key={k} className={"cb-msg " + m.from}>
                <div className="cb-bubble">{m.text}</div>
              </div>
            ))}

            {phase === "ask" && step && (
              <div className="cb-msg bot">
                <div className="cb-ask">
                  <div className="cb-ask-head">
                    <span className="cb-lchip">{step.layerId}</span>
                    <span>{groupPrompt(step)}</span>
                  </div>
                  <div className="cb-opts">
                    {step.items.map((it) => {
                      const on = cur.has(it);
                      return (
                        <button key={it} className={"cb-pick" + (on ? " on" : "")} onClick={() => toggle(it)}>
                          <span className="cb-box" />{it}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="cb-input">
            {phase === "ask" && step ? (
              <button className="btn primary" style={{ width: "100%" }} onClick={next} disabled={busy}>
                {i + 1 < steps.length ? "Continue" : "Finish setup"}
              </button>
            ) : phase === "done" ? (
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn" onClick={reset}>Redo</button>
                <button className="btn primary" style={{ flex: 1 }} onClick={goConnections}>Open Infrastructure</button>
              </div>
            ) : (
              <button className="btn primary" style={{ width: "100%" }} onClick={reset}>Start</button>
            )}
          </div>
        </div>
      )}

      <style>{`
        /* blur/dim backdrop so a fresh Start-Fresh project must start with the Genie.
           z-index sits BELOW the topbar/footer (z 40) so Sign Out stays reachable as
           an escape hatch, but the whole workspace + sidebar are blocked. */
        .cb-backdrop{position:fixed;inset:0;z-index:39;background:rgba(27,29,24,.14);
          backdrop-filter:blur(1.5px);-webkit-backdrop-filter:blur(1.5px);
          animation:cbFade .25s ease both}
        @keyframes cbFade{from{opacity:0}to{opacity:1}}

        /* Genie: flat De Stijl block - charcoal frame, white fill, FS-green mark */
        .cb-fab{position:fixed;right:22px;bottom:calc(var(--footer-h) + 16px);display:flex;align-items:center;gap:12px;
          padding:10px 16px 10px 12px;border:var(--grid-w) solid var(--grid-line);cursor:pointer;border-radius:0;
          background:rgba(44,90,168,.45);backdrop-filter:blur(14px) saturate(1.3);-webkit-backdrop-filter:blur(14px) saturate(1.3);
          z-index:60;text-align:left;box-shadow:var(--halo);transition:background .12s,box-shadow .14s,transform .1s}
        .cb-fab:hover{background:rgba(44,90,168,.6);box-shadow:var(--lift);transform:translateY(-2px)}
        .cb-fab b{color:#fff!important}
        .cb-fab i{color:rgba(255,255,255,.85)!important}
        .cb-fab-ic{width:36px;height:36px;border:1.5px solid var(--grid-line);border-radius:0;overflow:hidden;
          display:flex;align-items:center;justify-content:center;flex:0 0 auto;background:var(--paper)}
        .cb-fab-ic img{width:100%;height:100%;object-fit:contain;display:block}
        .cb-fab span span,.cb-fab>span:last-child{display:flex;flex-direction:column}
        .cb-fab b{font-size:13px;color:var(--ink);font-weight:800}
        .cb-fab i{font-size:10.5px;color:var(--ink-3);font-style:normal;font-weight:600}

        .cb-panel{position:fixed;right:22px;bottom:calc(var(--footer-h) + 16px);width:400px;
          max-height:min(660px,calc(100vh - var(--header-h) - var(--footer-h) - 32px));
          border:var(--grid-w) solid var(--grid-line);border-radius:0;
          background:rgba(70,115,190,.28);backdrop-filter:blur(6px) saturate(1.5);-webkit-backdrop-filter:blur(6px) saturate(1.5);
          box-shadow:var(--halo);display:flex;flex-direction:column;overflow:hidden;z-index:60}
        /* header matches the body glass exactly - one continuous surface */
        .cb-head{background:transparent;
          color:#fff;padding:12px 15px;display:flex;align-items:center;gap:10px;
          border-bottom:var(--grid-w) solid rgba(255,255,255,.4);text-shadow:0 1px 2px rgba(27,29,24,.4)}
        .cb-head-tag{width:26px;height:26px;padding:0;overflow:hidden;border-radius:0;flex:0 0 auto;
          background:var(--paper);border:1.5px solid var(--grid-line);
          display:flex;align-items:center;justify-content:center}
        .cb-head-tag img{width:100%;height:100%;object-fit:contain;display:block}
        .cb-title{font-weight:800;font-size:13px;color:#fff}
        .cb-progress{font-size:9px;text-transform:uppercase;letter-spacing:.12em;color:rgba(255,255,255,.85);font-weight:700;margin-top:1px}
        .cb-x{background:var(--paper);border:1.5px solid var(--grid-line);color:var(--ink);width:26px;height:26px;font-size:15px;cursor:pointer;font-weight:800;margin-left:auto;border-radius:0}
        .cb-x:hover{background:var(--tile)}
        .cb-body{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;background:transparent}
        .cb-msg{display:flex;flex-direction:column;max-width:88%}
        .cb-msg.bot{align-self:flex-start}
        .cb-msg.user{align-self:flex-end}
        .cb-bubble{padding:10px 13px;font-size:12.5px;line-height:1.45;border-radius:0}
        .cb-msg.bot .cb-bubble{background:var(--paper);border:1.5px solid var(--grid-line);color:var(--ink)}
        .cb-msg.user .cb-bubble{background:var(--fs-green);color:#fff;border:1.5px solid var(--grid-line);font-weight:600}
        .cb-ask{background:var(--paper);border:1.5px solid var(--grid-line);border-radius:0;padding:13px}
        .cb-ask-head{display:flex;align-items:center;gap:9px;font-size:12.5px;font-weight:600;color:var(--ink);margin-bottom:11px;line-height:1.4}
        .cb-lchip{width:22px;height:22px;background:var(--fs-green);color:#fff;border:1.5px solid var(--grid-line);border-radius:0;
          display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;flex:0 0 auto}
        .cb-opts{display:flex;flex-wrap:wrap;gap:7px}
        .cb-pick{display:inline-flex;align-items:center;gap:8px;font:800 12px var(--font);color:var(--ink-2);cursor:pointer;
          background:var(--paper);border:1.5px solid var(--grid-line);border-radius:0;padding:6px 12px 6px 9px;transition:background .12s}
        .cb-pick:hover{background:var(--tile)}
        .cb-pick.on{background:var(--fs-green);border-color:var(--grid-line);color:#fff}
        .cb-box{width:14px;height:14px;border:1.5px solid var(--grid-line);border-radius:0;flex:0 0 auto;position:relative;background:var(--paper)}
        .cb-pick.on .cb-box{background:var(--paper)}
        .cb-pick.on .cb-box::after{content:"";position:absolute;left:2px;top:2px;width:6px;height:6px;background:var(--fs-green)}
        .cb-input{border-top:var(--grid-w) solid rgba(255,255,255,.4);padding:13px;background:transparent}

        /* attention glow while the Start-Fresh project still needs source setup */
        @keyframes cbGlow{
          0%,100%{box-shadow:0 0 0 0 rgba(132,180,72,.6)}
          50%{box-shadow:0 0 0 7px rgba(132,180,72,0)}
        }
        .cb-fab.glow{animation:cbGlow 1.9s ease-in-out infinite;border-color:rgba(90,150,255,.6)}
        .cb-panel.glow{animation:cbGlow 1.9s ease-in-out infinite;border-color:rgba(90,150,255,.6)}
        .cb-fab.glow,.cb-panel.glow{animation:cbGlow 1.9s ease-in-out infinite}
        @media(prefers-reduced-motion:reduce){.cb-fab.glow,.cb-panel.glow{animation:none;
          box-shadow:0 0 0 3px rgba(132,180,72,.4)}}

        /* "Start here" tag: flat green De Stijl block above the Genie, pulses,
           gone once started. No chevron. */
        .cb-fab-wrap{position:fixed;right:22px;bottom:calc(var(--footer-h) + 16px);z-index:60;
          display:inline-flex;flex-direction:column;align-items:center}
        .cb-fab-wrap .cb-fab{position:static}
        @keyframes cbPill{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
        .cb-pill{position:absolute;bottom:calc(100% + 10px);left:50%;transform:translateX(-50%);z-index:61;
          background:var(--fs-green);color:#fff;font:800 10px var(--font);
          text-transform:uppercase;letter-spacing:.12em;padding:6px 14px;white-space:nowrap;border-radius:0;
          border:var(--grid-w) solid var(--grid-line);
          animation:cbPill 1.6s ease-in-out infinite}
        .cb-fab-wrap .cb-pill{bottom:calc(100% + 10px)}
        @media(prefers-reduced-motion:reduce){.cb-pill{animation:none}}
      `}</style>
    </>
  );
}

// natural prompt per group
function groupPrompt(step) {
  return `Which ${step.group} to connect?`;
}
