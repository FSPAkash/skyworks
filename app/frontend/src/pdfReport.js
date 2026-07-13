// Quick client-side "download to PDF" for BPC modal content. Opens a print
// window with a clean, branded report and triggers the browser's print-to-PDF.
// No external dependencies - the browser's own PDF export does the work.

const esc = (s) =>
  String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Build the inner HTML for each BPC block kind.
function bodyHtml(kind, data) {
  if (kind === "meaning") {
    return (data.questions || []).map((q) =>
      `<section class="qa"><h3>${esc(q.q)}</h3><p>${esc(q.a)}</p></section>`).join("");
  }
  if (kind === "signal") {
    const p = data.primary || {};
    const ranked = (data.ranked || []).map((r) =>
      `<div class="rank"><div class="rank-h"><b>${esc(r.signal)}</b><span>${esc(r.topic)}</span>
        <em>${esc(r.weight)}</em></div><p>${esc(r.why)}</p></div>`).join("");
    return `${data.subtitle ? `<p class="sub">${esc(data.subtitle)}</p>` : ""}
      <div class="primary"><div class="tag">Top signal</div><h2>${esc(p.signal)}</h2>
        <div class="topic">${esc(p.topic)}</div><p>${esc(p.why)}</p></div>
      <h4>Ranked signals</h4>${ranked}`;
  }
  if (kind === "intel") {
    const isAnno = data.kind === "annotation";
    const items = (data.items || []).map((it) => isAnno
      ? `<div class="item"><div class="item-h"><code>${esc(it.target)}</code>${it.tag ? `<span class="tag2">${esc(it.tag)}</span>` : ""}</div>
          ${it.note ? `<p>${esc(it.note)}</p>` : ""}${it.why ? `<p class="why"><b>Why</b> ${esc(it.why)}</p>` : ""}</div>`
      : `<div class="item"><p>${esc(it.text)}</p>${typeof it.confidence === "number"
          ? `<div class="conf">Confidence ${esc(it.confidence)}%</div>` : ""}</div>`).join("");
    return `${data.note ? `<p class="sub">${esc(data.note)}</p>` : ""}${items}`;
  }
  return "";
}

export function downloadBpcPdf({ kind, data, title, eyebrow, context }) {
  const w = window.open("", "_blank", "width=820,height=1000");
  if (!w) return;
  const today = new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  w.document.write(`<!doctype html><html><head><meta charset="utf8"><title>${esc(title)} - BPC report</title>
  <style>
    @page{size:A4;margin:22mm 18mm}
    *{box-sizing:border-box;margin:0}
    body{font:14px/1.55 "Segoe UI",Arial,sans-serif;color:#20241C;padding:0}
    .hd{border-bottom:2px solid #84B448;padding-bottom:14px;margin-bottom:22px}
    .badge{display:inline-block;font:800 10px/1.4 Arial;letter-spacing:.12em;color:#fff;background:#5B7FB8;padding:3px 9px}
    .eyebrow{font-size:10px;text-transform:uppercase;letter-spacing:.12em;font-weight:800;color:#8A8D82;margin:12px 0 5px}
    h1{font-size:26px;font-weight:800;letter-spacing:-.02em}
    .meta{font-size:11px;color:#8A8D82;margin-top:6px}
    .sub{font-size:13px;color:#53564D;margin:0 0 16px}
    .qa{margin-bottom:16px;padding:14px 16px;background:#F5F5F3;border:1px solid #E6E4DC}
    .qa h3{font-size:14px;font-weight:800;margin-bottom:6px}
    .qa p{font-size:13px;color:#53564D}
    .primary{background:#EDF4E1;border:1px solid #E6E4DC;padding:16px 18px;margin-bottom:16px}
    .primary .tag{font:800 9px Arial;letter-spacing:.1em;text-transform:uppercase;color:#5B7FB8}
    .primary h2{font-size:19px;font-weight:800;margin-top:3px}
    .primary .topic{font-size:11px;text-transform:uppercase;letter-spacing:.05em;font-weight:700;color:#8A8D82;margin-top:2px}
    .primary p{font-size:13px;color:#53564D;margin-top:9px}
    h4{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#8A8D82;margin:20px 0 10px}
    .rank{padding:11px 0;border-bottom:1px solid #E6E4DC}
    .rank-h{display:flex;align-items:baseline;gap:8px}
    .rank-h b{font-size:13px;font-weight:800}
    .rank-h span{font-size:11px;color:#8A8D82}
    .rank-h em{margin-left:auto;font-style:normal;font-weight:800;color:#5B7FB8}
    .rank p{font-size:12px;color:#8A8D82;margin-top:3px}
    .item{padding:12px 14px;background:#F5F5F3;border:1px solid #E6E4DC;margin-bottom:10px}
    .item-h{display:flex;align-items:center;gap:8px;margin-bottom:5px;flex-wrap:wrap}
    .item code{font:800 12px monospace;background:#fff;border:1px solid #E6E4DC;padding:1px 6px}
    .tag2{font:800 9px Arial;letter-spacing:.06em;text-transform:uppercase;color:#fff;background:#84B448;padding:2px 7px}
    .item p{font-size:12.5px;color:#53564D}
    .item .why{margin-top:5px;font-size:11.5px;color:#8A8D82}
    .conf{margin-top:7px;font:800 11px Arial;color:#5B7FB8}
    .ft{margin-top:26px;padding-top:12px;border-top:1px solid #E6E4DC;font-size:10px;color:#8A8D82}
  </style></head><body>
    <div class="hd">
      <span class="badge">BPC</span>
      <div class="eyebrow">${esc(eyebrow || "BPC · Business Process Co-Pilot")}</div>
      <h1>${esc(title)}</h1>
      ${context ? `<div class="meta">${esc(context)} · Generated ${esc(today)}</div>` : `<div class="meta">Generated ${esc(today)}</div>`}
    </div>
    ${bodyHtml(kind, data)}
    <div class="ft">Confidential · BPC for Data · Findability Sciences</div>
  </body></html>`);
  w.document.close();
  w.focus();
  // give the new document a tick to lay out before invoking print
  setTimeout(() => { w.print(); }, 300);
}
