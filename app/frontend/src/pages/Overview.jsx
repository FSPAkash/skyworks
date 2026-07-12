import { useConfig } from "../config.jsx";
import { FS_LOGO } from "../fslogo.js";
import DeliveryTimeline from "../components/DeliveryTimeline.jsx";

// Overview = the project delivery Gantt. Deliverables sit on week-spanned bars;
// delivered bars open the artifact, past-due-and-undelivered show as delayed.
export default function Overview() {
  const { config } = useConfig();
  const { client, deliverables, phases } = config;
  const weeks = client.activeWeeks || 0;
  const currentWeek = client.currentWeek || 0;
  const scheduled = weeks > 0;

  const phaseOf = (id) => phases.find((p) => p.id === id);
  const delivered = deliverables.filter((d) => d.status === "delivered").length;
  const delayed = scheduled
    ? deliverables.filter((d) => {
        const due = phaseOf(d.phase)?.weekEnd ?? 0;
        return d.status !== "delivered" && currentWeek > 0 && due > 0 && currentWeek >= due;
      }).length
    : 0;

  return (
    <div className="ov">
      <div className="ov-hero">
        <h1 className="page ov-h1">{client.engagement}</h1>
        <p className="lede ov-lede">
          {scheduled
            ? `Delivery timeline — week ${currentWeek} of ${weeks}. ${delivered} of ${deliverables.length} delivered${delayed ? `, ${delayed} delayed` : ""}.`
            : "Timeline appears once the engagement is scheduled."}
        </p>
      </div>

      <div className="ov-tl-card">
        {scheduled ? (
          <DeliveryTimeline />
        ) : (
          <div className="ov-tl-empty">No schedule yet. Set up the engagement to see the delivery timeline.</div>
        )}
      </div>

      <div className="footer-note">
        <span>Confidential</span> · <img src={FS_LOGO} alt="FS" /> BPC for Data
      </div>

      <style>{`
        @keyframes ovRise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        @media(prefers-reduced-motion:reduce){.ov *{animation:none!important}}
        .ov{animation:ovRise .45s ease both}
        .ov-hero{padding:22px 24px 18px;margin-bottom:18px;background:var(--paper);
          border:1px solid var(--hair);box-shadow:var(--halo)}
        .ov-h1{margin:0 0 6px}
        .ov-lede{font-size:14px;max-width:70ch;color:var(--ink-2)}
        .ov-tl-card{background:var(--paper);border:1px solid var(--hair);box-shadow:var(--soft);
          padding:18px 20px;margin-bottom:20px}
        .ov-tl-empty{font-size:13px;color:var(--ink-3);padding:6px 0}
      `}</style>
    </div>
  );
}
