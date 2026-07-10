import { useConfig } from "../config.jsx";

// I-CUP stepper: one rung per layer, current one filled.
export default function Stepper({ activeKey }) {
  const { config } = useConfig();
  const layers = config.layers;
  const activeIdx = layers.findIndex((l) => l.key === activeKey);

  return (
    <div style={{ display: "inline-flex", alignItems: "center" }}>
      {layers.map((l, i) => {
        const done = i < activeIdx;
        const on = i === activeIdx;
        const cls = "st-rung" + (done ? " done" : "") + (on ? " on" : "");
        return (
          <span key={l.key} style={{ display: "inline-flex", alignItems: "center" }}>
            <span className={cls} title={l.name}>{l.id}</span>
            {i < layers.length - 1 && <span className="st-ln" />}
          </span>
        );
      })}
      <style>{`
        .st-rung{width:28px;height:28px;border:1px solid var(--line);background:#fff;
          color:var(--ink-4);font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center}
        .st-rung.done{background:var(--green-tint);color:var(--green-2);border-color:var(--green-soft)}
        .st-rung.on{background:var(--fs-green);border-color:var(--fs-green);color:#fff;box-shadow:var(--halo-soft)}
        .st-rung.on.bpc{background:var(--green-2);border-color:var(--green-2)}
        .st-ln{width:16px;height:2px;background:var(--line-strong)}
      `}</style>
    </div>
  );
}
