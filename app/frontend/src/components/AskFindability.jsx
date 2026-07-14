import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useConfig } from "../config.jsx";
import { GENIE_LOGO } from "../genielogo.js";

// Ask Findability: a full-height, right-side Gen-AI assistant on the Presentation
// page. Answers go *beyond* what the deliverables show - the underlying data the
// study drew on, methodology, and judgement calls - using canned mock Q&A tailored
// per profile (Skyworks vs the generic DEMO). Blue translucent glass, FS mark.

// Skyworks-specific knowledge: grounded in the ODS assessment but reaching past
// the delivered artifacts into how the data was read and why.
const SKYWORKS_QA = [
  {
    q: "Which datasets carry the real analytical value?",
    a: "Value concentrates in four estates - Skyworks_ODS, Skyworks_ODS_Archive, LIB_ECC_RTP and Skyworks_WH - which together hold over 99% of the 28.5B rows. The heaviest tables are demand-planning facts (sd.FactVersions, 1.09B rows) and the SAP document-status tables (sap.JCDS / sap.JEST). Those are the first candidates to conform and classify as Gold.",
  },
  {
    q: "What's the dormant / deprecation picture beneath the numbers?",
    a: "558 tables are completely empty (schema, no rows) and 2,891 of 5,108 programmable objects haven't been touched since before 2024. These are low-risk deprecation candidates - they carry no downstream reads - but they weren't deleted in this engagement; they're surfaced in the transition backlog for Skyworks to action.",
  },
  {
    q: "Where does the data-quality risk concentrate?",
    a: "In loose constraints. 78% of columns (128,696 of 164,543) are nullable, so key integrity can't be assumed across most of the estate. The risk clusters outside the four core estates - the demand-planning and SAP fact tables are well-constrained, but the dormant tail is where nullability is highest. That's why nothing has been promoted to Gold until lineage (D3) confirms actual downstream use.",
  },
  {
    q: "Which upstream systems does the ODS depend on most?",
    a: "SAP ECC (LIB_ECC_RTP) is the dominant upstream - its JCDS/JEST status tables feed order and document flows into the ODS, and their join integrity gates every downstream mart. Beyond SAP, the assessment tracks nine reference systems (Kinaxis, PLM, EDI, PROMIS, CRM and the warehouse among them); the ones with the deepest downstream consumption are prioritized first in the lineage map.",
  },
];

// Generic DEMO knowledge: same shape, describing a template assessment.
const GENERIC_QA = [
  {
    q: "Which datasets carry the real analytical value?",
    a: "Value is judged by usage and reach, not size. Downstream consumption depth - how many certified consumers depend on a dataset - predicts Gold candidacy better than row count. The estates holding the bulk of the rows and the highest-traffic fact tables are the first candidates to conform and classify; connect sources in Infrastructure to populate the real figures for this project.",
  },
  {
    q: "What's the dormant / deprecation picture beneath the numbers?",
    a: "Most estates carry a dormant tail - empty tables that hold schema but no data, and programmable objects untouched for long periods. These have no downstream reads, so they're low-risk deprecation candidates. The assessment surfaces them in the transition backlog rather than deleting anything, leaving the client to action them.",
  },
  {
    q: "Where does the data-quality risk concentrate?",
    a: "In loose constraints. High nullability lowers confidence in key integrity, so datasets with many loosely-constrained columns can't be assumed clean. The risk usually sits away from the well-maintained core fact tables and clusters in the dormant tail - which is exactly why nothing is promoted to Gold until lineage confirms real downstream use.",
  },
  {
    q: "Which upstream systems does the estate depend on most?",
    a: "The heaviest dependencies are the transactional systems of record - typically ERP and the core databases - whose keys feed every downstream mart. Their join integrity gates the whole lineage, so they're resolved first. The assessment tracks each reference system and prioritizes the ones with the deepest downstream consumption.",
  },
];

export default function AskFindability() {
  const { config } = useConfig();
  const isSky = config?.brand === "skyworks";
  const clientName = config?.client?.name || "your data";
  const qa = isSky ? SKYWORKS_QA : GENERIC_QA;

  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([]);
  const [typing, setTyping] = useState(false);
  const bodyRef = useRef(null);

  // greet on first open
  useEffect(() => {
    if (open && msgs.length === 0) {
      setMsgs([{ from: "bot", text: `Hi - I'm Findability, the assistant for the ${clientName} assessment. Ask me about the data behind the study: what it ran on, how value and quality were judged, and the calls that sit under the deliverables.` }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [msgs, typing]);

  // lock the page body scroll while the panel is open, so only the chat log
  // scrolls (avoids a second scrollbar from the page behind the scrim)
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const ask = (item) => {
    if (typing) return;
    setMsgs((m) => [...m, { from: "user", text: item.q }]);
    setTyping(true);
    setTimeout(() => {
      setMsgs((m) => [...m, { from: "bot", text: item.a }]);
      setTyping(false);
    }, 650);
  };

  // questions not yet asked, so the suggestion chips shrink as you go
  const asked = new Set(msgs.filter((m) => m.from === "user").map((m) => m.text));
  const remaining = qa.filter((x) => !asked.has(x.q));

  return (
    <>
      <button className="af-fab" onClick={() => setOpen(true)}>
        <span className="af-fab-ic"><img src={GENIE_LOGO} alt="Findability" /></span>
        <span className="af-fab-txt"><b>Ask Findability</b><i>Questions about the study data</i></span>
      </button>

      {open && createPortal(
        <div className="af-scrim" onClick={() => setOpen(false)}>
          <div className="af-panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="af-head">
              <span className="af-head-ic"><img src={GENIE_LOGO} alt="Findability" /></span>
              <div className="af-head-txt">
                <div className="af-title">Ask Findability</div>
                <div className="af-sub">{clientName} · data behind the study</div>
              </div>
              <button className="af-x" onClick={() => setOpen(false)} aria-label="Close">✕</button>
            </div>

            <div className="af-body" ref={bodyRef}>
              {msgs.map((m, i) => (
                <div key={i} className={"af-msg " + m.from}>
                  {m.from === "bot" && <span className="af-msg-ic"><img src={GENIE_LOGO} alt="" /></span>}
                  <div className="af-bubble">{m.text}</div>
                </div>
              ))}
              {typing && (
                <div className="af-msg bot">
                  <span className="af-msg-ic"><img src={GENIE_LOGO} alt="" /></span>
                  <div className="af-bubble af-typing"><span /><span /><span /></div>
                </div>
              )}
            </div>

            <div className="af-suggest">
              {remaining.length > 0 ? (
                <>
                  <div className="af-suggest-lbl">Suggested questions</div>
                  <div className="af-chips">
                    {remaining.map((x) => (
                      <button key={x.q} className="af-chip" onClick={() => ask(x)} disabled={typing}>{x.q}</button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="af-suggest-lbl">That's everything I can share on the study data here. For raw extracts, contact your Findability delivery lead.</div>
              )}
            </div>
          </div>

          <style>{`
            .af-scrim{position:fixed;inset:0;z-index:210;display:flex;justify-content:flex-end;overflow:hidden;
              background:rgba(24,40,70,.28);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);
              animation:afFade .2s ease both}
            @keyframes afFade{from{opacity:0}to{opacity:1}}
            .af-panel{width:min(440px,100vw);height:100vh;height:100dvh;display:flex;flex-direction:column;overflow:hidden;
              background:linear-gradient(180deg,rgba(70,120,200,.34),rgba(44,90,168,.30));
              backdrop-filter:blur(26px) saturate(1.6);-webkit-backdrop-filter:blur(26px) saturate(1.6);
              border-left:1px solid rgba(255,255,255,.35);box-shadow:-18px 0 50px -20px rgba(20,40,80,.5);
              animation:afSlide .28s cubic-bezier(.2,.7,.3,1) both}
            @keyframes afSlide{from{transform:translateX(30px);opacity:.4}to{transform:none;opacity:1}}
            .af-head{flex:0 0 auto;display:flex;align-items:center;gap:12px;padding:16px 18px;
              border-bottom:1px solid rgba(255,255,255,.3);text-shadow:0 1px 2px rgba(20,40,80,.35)}
            .af-head-ic{width:34px;height:34px;flex:0 0 auto;border:1.5px solid rgba(255,255,255,.6);
              background:#fff;display:flex;align-items:center;justify-content:center;overflow:hidden}
            .af-head-ic img{width:100%;height:100%;object-fit:contain}
            .af-title{font-size:15px;font-weight:800;color:#fff}
            .af-sub{font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:rgba(255,255,255,.82)}
            .af-x{margin-left:auto;flex:0 0 auto;width:30px;height:30px;border:1px solid rgba(255,255,255,.55);
              background:rgba(255,255,255,.28);color:#fff;cursor:pointer;font-size:13px}
            .af-x:hover{background:rgba(255,255,255,.45)}
            .af-body{flex:1 1 auto;min-height:0;overflow-y:auto;padding:18px;display:flex;flex-direction:column;gap:14px}
            .af-msg{display:flex;gap:9px;max-width:92%}
            .af-msg.bot{align-self:flex-start}
            .af-msg.user{align-self:flex-end;flex-direction:row-reverse}
            .af-msg-ic{width:26px;height:26px;flex:0 0 auto;border:1.5px solid rgba(255,255,255,.6);
              background:#fff;display:flex;align-items:center;justify-content:center;overflow:hidden;margin-top:2px}
            .af-msg-ic img{width:100%;height:100%;object-fit:contain}
            .af-bubble{padding:11px 13px;font-size:12.5px;line-height:1.55}
            .af-msg.bot .af-bubble{background:rgba(255,255,255,.9);color:var(--ink);
              border:1px solid rgba(255,255,255,.7)}
            .af-msg.user .af-bubble{background:rgba(20,50,100,.55);color:#fff;font-weight:600;
              border:1px solid rgba(255,255,255,.35)}
            .af-typing{display:flex;gap:5px;align-items:center}
            .af-typing span{width:6px;height:6px;border-radius:50%;background:var(--ds-blue);
              animation:afBlink 1.2s infinite both}
            .af-typing span:nth-child(2){animation-delay:.18s}
            .af-typing span:nth-child(3){animation-delay:.36s}
            @keyframes afBlink{0%,60%,100%{opacity:.25}30%{opacity:1}}
            .af-suggest{flex:0 0 auto;max-height:42vh;overflow-y:auto;border-top:1px solid rgba(255,255,255,.3);
              padding:14px 18px 18px;background:rgba(255,255,255,.08)}
            .af-suggest-lbl{font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;
              color:rgba(255,255,255,.85);margin-bottom:10px;line-height:1.5}
            .af-chips{display:flex;flex-direction:column;gap:8px}
            .af-chip{text-align:left;background:rgba(255,255,255,.9);border:1px solid rgba(255,255,255,.7);
              color:var(--ink);font:600 12px var(--font);padding:10px 12px;cursor:pointer;line-height:1.4;transition:background .12s}
            .af-chip:hover:not(:disabled){background:#fff}
            .af-chip:disabled{opacity:.55;cursor:default}
            @media(prefers-reduced-motion:reduce){.af-scrim,.af-panel,.af-typing span{animation:none}}
          `}</style>
        </div>,
        document.body
      )}

      <style>{`
        .af-fab{display:inline-flex;align-items:center;gap:11px;margin:8px 0 22px;padding:10px 16px 10px 11px;
          border:1px solid rgba(44,90,168,.4);cursor:pointer;text-align:left;
          background:linear-gradient(135deg,rgba(70,120,200,.16),rgba(44,90,168,.10));
          box-shadow:var(--soft);transition:box-shadow .14s,transform .1s}
        .af-fab:hover{box-shadow:var(--lift);transform:translateY(-1px)}
        .af-fab-ic{width:34px;height:34px;flex:0 0 auto;border:1.5px solid var(--grid-line);
          background:#fff;display:flex;align-items:center;justify-content:center;overflow:hidden}
        .af-fab-ic img{width:100%;height:100%;object-fit:contain}
        .af-fab-txt{display:flex;flex-direction:column}
        .af-fab-txt b{font-size:13px;font-weight:800;color:var(--ds-blue)}
        .af-fab-txt i{font-size:10.5px;font-style:normal;font-weight:600;color:var(--ink-3)}
      `}</style>
    </>
  );
}
