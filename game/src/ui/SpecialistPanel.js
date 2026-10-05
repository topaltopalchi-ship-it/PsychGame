import { SpecialistReport } from "../psychology/SpecialistReport.js";

export class SpecialistPanel {
  constructor(session) {
    this.session = session;
    this.root = null;
  }

  open() {
    if (this.root) return;
    const report = SpecialistReport.build(this.session.getSessionData());
    const root = document.createElement("div");
    root.id = "pg-specialist-panel";
    Object.assign(root.style, { position:"fixed", inset:"0", zIndex:"20000", background:"rgba(4,6,10,.96)", color:"#eee", fontFamily:"Tahoma,Arial,sans-serif", direction:"rtl", overflow:"auto", padding:"24px", boxSizing:"border-box" });
    root.innerHTML = `<div style="max-width:1000px;margin:auto"><div style="display:flex;justify-content:space-between;align-items:center;gap:12px"><div><h2 style="margin:0 0 6px">پنل متخصص</h2><div style="opacity:.65;font-size:12px">داده‌های خام و گزارش رفتاری — فقط برای بررسی تخصصی</div></div><div><button id="pg-sp-export">خروجی JSON</button> <button id="pg-sp-close">بستن</button></div></div><div id="pg-sp-body" style="margin-top:20px"></div></div>`;
    document.body.appendChild(root);
    this.root = root;
    root.querySelector("#pg-sp-close").onclick = () => this.close();
    root.querySelector("#pg-sp-export").onclick = () => this.export(report);
    const body = root.querySelector("#pg-sp-body");
    body.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px">${this.card("Player", report.playerCode)}${this.card("Session", report.sessionId)}${this.card("رویدادها", report.eventCount)}${this.card("اتاق‌ها", Object.keys(report.rooms).length)}</div><h3>اتاق‌ها</h3>${this.rooms(report.rooms)}<h3>انواع رویداد</h3><pre style="white-space:pre-wrap;background:#0b0e14;padding:14px;border-radius:10px">${this.escape(JSON.stringify(report.eventTypes,null,2))}</pre><h3>تحلیل</h3><pre style="white-space:pre-wrap;background:#0b0e14;padding:14px;border-radius:10px">${this.escape(JSON.stringify(report.analysis,null,2))}</pre>`;
  }

  card(label, value) { return `<div style="background:#0b0e14;border:1px solid #202633;border-radius:10px;padding:14px"><div style="opacity:.55;font-size:11px">${label}</div><div style="margin-top:7px;word-break:break-all">${this.escape(String(value ?? "—"))}</div></div>`; }
  rooms(rooms) { const entries = Object.entries(rooms); if (!entries.length) return `<div style="opacity:.6">هنوز داده اتاقی ثبت نشده است.</div>`; return entries.map(([id,r]) => `<div style="background:#0b0e14;border:1px solid #202633;border-radius:10px;padding:14px;margin:8px 0"><b>${this.escape(id)}</b><div style="margin-top:8px;opacity:.8">رویداد: ${r.events} · تعامل: ${r.interactions} · شکست: ${r.failures} · تکمیل: ${r.completions}</div></div>`).join(""); }
  escape(value) { return value.replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c])); }
  export(report) { const blob = new Blob([JSON.stringify(report,null,2)], { type:"application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href=url; a.download=`psychgame-${report.playerCode || "session"}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
  close() { this.root?.remove(); this.root = null; }
}
