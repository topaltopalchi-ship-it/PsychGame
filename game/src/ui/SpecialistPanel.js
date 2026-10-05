import { SpecialistReport } from "../psychology/SpecialistReport.js";
import { buildTrainingRecommendations } from "../training/TrainingRecommendations.js";
import { createTrainingPlan, addTrainingAssignment } from "../training/TrainingAssignment.js";

export class SpecialistPanel {
  constructor(session) {
    this.session = session;
    this.root = null;
    this.trainingPlan = this.loadTrainingPlan();
  }

  open() {
    if (this.root) return;
    const report = SpecialistReport.build(this.session.getSessionData());
    const recommendations = buildTrainingRecommendations(report);
    const root = document.createElement("div");
    root.id = "pg-specialist-panel";
    Object.assign(root.style, {
      position:"fixed", inset:"0", zIndex:"20000", background:"rgba(4,6,10,.96)",
      color:"#eee", fontFamily:"Tahoma,Arial,sans-serif", direction:"rtl",
      overflow:"auto", padding:"24px", boxSizing:"border-box"
    });

    root.innerHTML = `<div style="max-width:1100px;margin:auto">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px">
        <div><h2 style="margin:0 0 6px">پنل متخصص</h2>
        <div style="opacity:.65;font-size:12px">داده‌های خام و گزارش رفتاری — فقط برای بررسی تخصصی</div></div>
        <div><button id="pg-sp-remote">جلسات آنلاین</button> <button id="pg-sp-export">خروجی JSON</button> <button id="pg-sp-close">بستن</button></div>
      </div>
      <div id="pg-sp-body" style="margin-top:20px"></div>
    </div>`;

    document.body.appendChild(root);
    this.root = root;
    root.querySelector("#pg-sp-close").onclick = () => this.close();
    root.querySelector("#pg-sp-export").onclick = () => this.export(report);
    root.querySelector("#pg-sp-remote").onclick = () => this.loadRemoteSessions();

    const body = root.querySelector("#pg-sp-body");
    body.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px">
        ${this.card("Player", report.playerCode)}
        ${this.card("Session", report.sessionId)}
        ${this.card("رویدادها", report.eventCount)}
        ${this.card("اتاق‌ها", Object.keys(report.rooms).length)}
        ${this.card("مدت جلسه", this.duration(report.sessionDurationMs))}
        ${this.card("تعداد تصمیم‌ها", report.decisionCount)}
        ${this.card("اولین تصمیم", this.duration(report.timeToFirstDecisionMs))}
      </div>

      <h3>پیشنهادهای تمرینی برای بررسی متخصص</h3>
      <div style="background:#0b0e14;border:1px solid #202633;border-radius:10px;padding:14px">
        <div style="opacity:.65;font-size:12px;margin-bottom:10px">
          این موارد فقط از الگوهای رفتاری بازی استخراج شده‌اند و تشخیص پزشکی نیستند.
        </div>
        ${this.trainingRecommendations(recommendations)}
      </div>

      <h3>برنامه تمرینی انتخاب‌شده</h3>
      <div id="pg-training-plan" style="background:#0b0e14;border:1px solid #202633;border-radius:10px;padding:14px">
        ${this.trainingPlanView()}
      </div>

      <h3>نتیجه تمرین تخصصی</h3>
      <div style="background:#0b0e14;border:1px solid #202633;border-radius:10px;padding:14px">
        ${this.trainingResultView(report.trainingResult)}
      </div>
      <h3>مسیر طی‌شده</h3>
      <div style="background:#0b0e14;border:1px solid #202633;border-radius:10px;padding:14px">
        ${this.escape((report.path || []).join(" → ") || "—")}
      </div>
      <h3>اتاق‌ها</h3>${this.rooms(report.rooms)}
      <h3>مدت نگاه به اشیاء</h3><pre style="white-space:pre-wrap;background:#0b0e14;padding:14px;border-radius:10px;max-height:320px;overflow:auto">${this.escape(JSON.stringify(report.lookSummary,null,2))}</pre>
      <h3>تعامل‌های تکرارشده</h3><pre style="white-space:pre-wrap;background:#0b0e14;padding:14px;border-radius:10px;max-height:260px;overflow:auto">${this.escape(JSON.stringify(report.repeatedInteractions,null,2))}</pre>
      <h3>Timeline رفتار</h3><pre style="white-space:pre-wrap;background:#0b0e14;padding:14px;border-radius:10px;max-height:420px;overflow:auto">${this.escape(JSON.stringify(report.timeline,null,2))}</pre>
      <h3>جزئیات اتاق‌های ۰۴ تا ۰۸</h3>
      <pre style="white-space:pre-wrap;background:#0b0e14;padding:14px;border-radius:10px">${this.escape(JSON.stringify(report.roomDetails,null,2))}</pre>
      <h3>انواع رویداد</h3>
      <pre style="white-space:pre-wrap;background:#0b0e14;padding:14px;border-radius:10px">${this.escape(JSON.stringify(report.eventTypes,null,2))}</pre>
      <h3>تحلیل</h3>
      <pre style="white-space:pre-wrap;background:#0b0e14;padding:14px;border-radius:10px">${this.escape(JSON.stringify(report.analysis,null,2))}</pre>`;

    this.bindTrainingButtons();
  }

  trainingResultView(result) {
    if (!result) return `<div style="opacity:.6">هنوز نتیجه نهایی تمرین ثبت نشده است.</div>`;
    const status = result.status === "completed" ? "تکمیل‌شده" : result.status === "exhausted" ? "سقف تلاش‌ها" : String(result.status || "نامشخص");
    const assignments = Array.isArray(result.assignments) ? result.assignments : [];
    return `<div style="margin-bottom:10px"><b>وضعیت:</b> ${this.escape(status)} · <b>اقدامات نهایی:</b> ${Number(result.finalActions || 0)}</div>` +
      (assignments.length ? assignments.map(item => `<div style="padding:9px 0;border-bottom:1px solid #202633">
        <b>${this.escape(item.targetId)}</b> · سطح ${this.escape(String(item.level ?? "—"))}
        <span style="opacity:.7"> · تلاش: ${Number(item.attempts || 0)} · موفق: ${Number(item.successes || 0)} · ناموفق: ${Number(item.failures || 0)}</span>
        <span style="opacity:.7"> · ${item.completed ? "تکمیل" : item.exhausted ? "تمام‌شدن سقف تلاش" : item.aborted ? "متوقف‌شده" : "در حال اجرا"}</span>
      </div>`).join("") : `<div style="opacity:.6">جزئیات هدفی ثبت نشده است.</div>`);
  }

  trainingRecommendations(data) {
    if (!data.recommendations.length) {
      return `<div style="opacity:.65">بر اساس داده فعلی، پیشنهاد تمرینی مشخصی تولید نشده است.</div>`;
    }

    return data.recommendations.map((item) => `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid #202633">
        <div>
          <div style="font-weight:bold">${this.escape(item.label)}</div>
          <div style="opacity:.55;font-size:11px;margin-top:4px">${this.escape(item.targetId)} · نیازمند بررسی متخصص</div>
        </div>
        <button data-training-target="${this.escape(item.targetId)}">انتخاب</button>
      </div>`).join("");
  }

  bindTrainingButtons() {
    this.root?.querySelectorAll("[data-training-target]").forEach((button) => {
      button.onclick = () => {
        const targetId = button.getAttribute("data-training-target");
        if (!targetId) return;

        if (!this.trainingPlan) {
          this.trainingPlan = createTrainingPlan({
            playerCode: this.session.getPlayerCode(),
            sourceSessionId: this.session.getSessionId()
          });
        }

        try {
          this.trainingPlan = addTrainingAssignment(this.trainingPlan, {
            targetId,
            level: 1,
            assignedBy: "specialist"
          });
          this.saveTrainingPlan();
          this.refreshTrainingPlan();
        } catch (error) {
          console.warn("PsychGame training assignment failed", error);
          alert("ذخیره هدف تمرینی ناموفق بود.");
        }
      };
    });
  }

  trainingPlanView() {
    const assignments = this.trainingPlan?.assignments || [];
    if (!assignments.length) {
      return `<div style="opacity:.6">هنوز هدفی توسط متخصص انتخاب نشده است.</div>`;
    }

    return assignments.map((item) => `
      <div style="padding:10px 0;border-bottom:1px solid #202633">
        <b>${this.escape(item.targetId)}</b>
        <span style="opacity:.65"> · سطح ${item.level} · اختصاص‌یافته توسط متخصص</span>
      </div>`).join("");
  }

  refreshTrainingPlan() {
    const block = this.root?.querySelector("#pg-training-plan");
    if (!block) return;
    block.innerHTML = this.trainingPlanView();
  }

  loadTrainingPlan() {
    try {
      const key = `psychgame_training_${this.session.getPlayerCode()}`;
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  saveTrainingPlan() {
    try {
      const key = `psychgame_training_${this.session.getPlayerCode()}`;
      localStorage.setItem(key, JSON.stringify(this.trainingPlan));
    } catch (error) {
      console.warn("PsychGame training plan save failed", error);
    }
  }

  card(label, value) {
    return `<div style="background:#0b0e14;border:1px solid #202633;border-radius:10px;padding:14px">
      <div style="opacity:.55;font-size:11px">${label}</div>
      <div style="margin-top:7px;word-break:break-all">${this.escape(String(value ?? "—"))}</div>
    </div>`;
  }

  rooms(rooms) {
    const entries = Object.entries(rooms);
    if (!entries.length) return `<div style="opacity:.6">هنوز داده اتاقی ثبت نشده است.</div>`;
    return entries.map(([id,r]) => `
      <div style="background:#0b0e14;border:1px solid #202633;border-radius:10px;padding:14px;margin:8px 0">
        <b>${this.escape(id)}</b>
        <div style="margin-top:8px;opacity:.8">
          رویداد: ${r.events} · تعامل: ${r.interactions} · شکست: ${r.failures} ·
          تصمیم: ${r.decisions} · بررسی: ${r.inspections} · تغییر انتخاب: ${r.switches} ·
          تکمیل: ${r.completed} · مدت: ${this.duration(r.durationMs)}
        </div>
        <div style="margin-top:7px;opacity:.65;font-size:12px">
          انتخاب اول: ${this.escape(String(r.firstChoice ?? "—"))} ·
          انتخاب آخر: ${this.escape(String(r.lastChoice ?? "—"))}
        </div>
      </div>`).join("");
  }

  duration(ms) {
    if (!Number.isFinite(ms)) return "—";
    const seconds = Math.round(ms / 1000);
    if (seconds < 60) return `${seconds} ثانیه`;
    return `${Math.floor(seconds / 60)} دقیقه و ${seconds % 60} ثانیه`;
  }

  escape(value) {
    return value.replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  }

  async loadRemoteSessions() {
    const endpoint = String(import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
    if (!endpoint) { alert("VITE_API_URL تنظیم نشده است."); return; }
    const token = prompt("توکن نویسنده را وارد کنید:");
    if (!token) return;
    try {
      const response = await fetch(endpoint + "/api/sessions", { headers: { Authorization: "Bearer " + token } });
      if (!response.ok) throw new Error("HTTP " + response.status);
      const data = await response.json();
      const sessions = Array.isArray(data.sessions) ? data.sessions : [];
      const body = this.root?.querySelector("#pg-sp-body");
      if (!body) return;
      const block = document.createElement("div");
      block.innerHTML = `<h3>جلسات ثبت‌شده روی سرور (${sessions.length})</h3>` +
        `<div style="background:#0b0e14;border:1px solid #202633;border-radius:10px;padding:12px">` +
        (sessions.length ? sessions.map(s => `<div style="padding:10px 0;border-bottom:1px solid #202633"><b>${this.escape(String(s.playerCode || "—"))}</b> · ${this.escape(String(s.sessionId || "—"))}<br><small>رویداد: ${s.eventCount ?? "—"} · تکمیل: ${s.completed ? "بله" : "خیر"} · مسیر: ${this.escape((s.path || []).join(" → "))}</small></div>`).join("") : "هنوز جلسه‌ای روی سرور ثبت نشده است.") +
        `</div>`;
      body.prepend(block);
    } catch (error) {
      alert("دریافت جلسات آنلاین ناموفق بود.");
      console.warn("PsychGame remote sessions failed", error);
    }
  }

  export(report) {
    const blob = new Blob([JSON.stringify(report,null,2)], { type:"application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `psychgame-${report.playerCode || "session"}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  close() { this.root?.remove(); this.root = null; }
}
