import { useConfig } from "../config.jsx";

const stgCss = `
  /* heading row: the stage title on the left, the ownership callout tucked to
     the top-right so it's informative but out of the way */
  .page-hd{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;flex-wrap:wrap;margin-bottom:18px}
  .page-hd .page{margin-bottom:0}
  .stg{display:flex;flex-wrap:wrap;align-items:stretch;margin:2px 0 0;
    border:1px solid var(--hair);background:var(--paper);width:fit-content;max-width:100%}
  .stg-cell{display:flex;flex-direction:column;gap:1px;padding:6px 12px;min-width:0}
  .stg-cell + .stg-cell{border-left:1px solid var(--hair)}
  .stg-lbl{font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:var(--ink-4)}
  .stg-val{font-size:11px;font-weight:700;color:var(--ink-3)}
`;

// Small callout shown at every stage of the flow. The engagement only READS the
// client's data - it is never copied or moved - so at every stage the client
// owns the data and it stays in the client's own environment. On Infrastructure
// the split is shown: client owns internal systems, provider owns external feeds.
export default function StageOwner({ variant }) {
  const { config } = useConfig();
  // client.dataOwner lets a profile name the owner explicitly (e.g. "Skyworks
  // Inc"); otherwise fall back to the client name.
  const client = config?.client?.dataOwner || config?.client?.name || "the client";
  const provider = config?.product?.provider || "FS";
  // On Infrastructure the sources split by origin: the client owns internal
  // systems; external feeds are the provider's third-party connections. Every
  // other stage is client-owned (the engagement only reads).
  if (variant === "infra") {
    return (
      <div className="stg">
        <span className="stg-cell">
          <span className="stg-lbl">Internal data</span>
          <span className="stg-val">{client} · read-only</span>
        </span>
        <span className="stg-cell">
          <span className="stg-lbl">External data</span>
          <span className="stg-val">{provider} · third-party feeds</span>
        </span>
        <style>{stgCss}</style>
      </div>
    );
  }
  return (
    <div className="stg">
      <span className="stg-cell">
        <span className="stg-lbl">Data owner</span>
        <span className="stg-val">{client}</span>
      </span>
      <span className="stg-cell">
        <span className="stg-lbl">Where it lives</span>
        <span className="stg-val">{client} environment · read-only</span>
      </span>
      <style>{stgCss}</style>
    </div>
  );
}
