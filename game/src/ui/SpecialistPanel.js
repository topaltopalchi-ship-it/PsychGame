import { SpecialistReport } from "../psychology/SpecialistReport.js";
import { createTrainingPlan, addTrainingAssignment, setTrainingAssignmentLevel } from "../training/TrainingAssignment.js";
import { TRAINING_TARGETS } from "../training/TrainingTargets.js";

export class SpecialistPanel {
  constructor(session) {
    this.session = session;
    this.root = null;
    this.trainingPlan = this.session.getTrainingPlan();
    this.pendingAssignments = [];
    this.report = null;
  }

  open() {
    if (this.root) return;

    const sessionData = this.session.getSessionData();
    this.report = SpecialistReport.build(sessionData);
    const recommendations = this.session.getTrainingRecommendations();

    const root = document.createElement("div");
    root.id = "pg-specialist-panel";
    Object.assign(root.style, {
      position: "fixed",
      inset: "0",
      zIndex: "20000",
      background: "#070a10",
      color: "#eef2f7",
      fontFamily: "Tahoma, Arial, sans-serif",
      direction: "rtl",
      overflow: "auto",
      padding: "18px",
      boxSizing: "border-box"
    });

    root.innerHTML = `
      <div style="max-width:1180px;margin:auto">
        <header style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:18px">
          <div>
            <div style="font-size:12px;opacity:.55">PsychGame</div>
            <h2 style="margin:4px 0">پنل متخصص</h2>
            <div style="font-size:12px;opacity:.65">گزارش توصیفی جلسه و برنامه تمرینی</div>
          </div>
          <button id="pg-specialist-close" style="padding:10px 16px">بستن</button>
        </header>

        <div id="pg-specialist-body"></div>
      </div>
    `;

    document.body.appendChild(root);
    this.root = root;

    root.querySelector("#pg-specialist-close").onclick = () => this.close();

    const body = root.querySelector("#pg-specialist-body");
    body.innerHTML = this.renderDashboard(recommendations);
    this.bindTrainingButtons();
    this.bindTrainingLevelSelectors();
    this.bindApproveButton();
  }

  close() {
    if (this.root) this.root.remove();
    this.root = null;
    this.pendingAssignments = [];
  }

  renderDashboard(recommendations) {
    const r = this.report || {};
    const analysis = r.analysis || {};
    const quality = r.dataQuality || {};
    const completed = Array.isArray(r.completedRooms) ? r.completedRooms.length : 0;
    const duration = this.formatDuration(r.sessionDurationMs);
    const firstDecision = this.formatDuration(r.timeToFirstDecisionMs);

    return `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin-bottom:16px">
        ${this.statCard("کد بازیکن", r.playerCode || "—")}
        ${this.statCard("رویدادها", r.eventCount ?? 0)}
        ${this.statCard("اتاق‌های تکمیل‌شده", completed + " / 8")}
        ${this.statCard("مدت جلسه", duration)}
        ${this.statCard("تعداد تصمیم‌ها", r.decisionCount ?? 0)}
        ${this.statCard("اولین تصمیم", firstDecision)}
      </div>

      <section style="margin-bottom:16px">
        ${this.sectionTitle("شاخص‌های رفتاری")}
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px">
          ${this.metricCard("اکتشاف", analysis.exploration)}
          ${this.metricCard("ریسک‌پذیری", analysis.riskTaking)}
          ${this.metricCard("پشتکار", analysis.persistence)}
          ${this.metricCard("تغییر راهبرد", analysis.strategyChange)}
          ${this.metricCard("زمان تصمیم‌گیری", analysis.decisionLatency)}
          ${this.metricCard("کمک‌خواهی", analysis.helpSeeking)}
        </div>
      </section>

      <section style="margin-bottom:16px">
        ${this.sectionTitle("مسیر و وضعیت اتاق‌ها")}
        <div style="padding:14px;background:#101620;border:1px solid #202a38;border-radius:10px">
          <div style="margin-bottom:10px">مسیر ثبت‌شده: <b>${this.escape((r.path || []).join(" ← ") || "ثبت نشده")}</b></div>
          <div style="display:flex;flex-wrap:wrap;gap:7px">
            ${Array.from({length:8},(_,i)=>{
              const id=`ROOM_${String(i+1).padStart(2,"0")}`;
              const done=(r.completedRooms||[]).includes(id);
              return `<span style="padding:6px 9px;border-radius:7px;background:${done ? "#173d2c" : "#242b36"};font-size:12px">${id} · ${done ? "تکمیل" : "ثبت‌نشده/ناقص"}</span>`;
            }).join("")}
          </div>
        </div>
      </section>

      <section style="margin-bottom:16px">
        ${this.sectionTitle("برداشت توصیفی متخصص")}
        <div style="padding:14px;background:#101620;border:1px solid #202a38;border-radius:10px">
          ${(r.specialistReportFa?.برداشت_متخصص || ["داده کافی برای برداشت توصیفی وجود ندارد."]).map(x=>`<div style="margin:7px 0">• ${this.escape(x)}</div>`).join("")}
          <div style="margin-top:12px;font-size:11px;opacity:.55">${this.escape(r.specialistReportFa?.methodology || "این گزارش تشخیص بالینی نیست.")}</div>
        </div>
      </section>

      <section style="margin-bottom:16px">
        ${this.sectionTitle("کیفیت داده")}
        <div style="padding:14px;background:#101620;border:1px solid #202a38;border-radius:10px">
          <div>اتاق‌های مشاهده‌شده: <b>${(quality.observedRooms || []).join(", ") || "—"}</b></div>
          <div style="margin-top:6px">اتاق‌های ثبت‌نشده: <b>${(quality.missingRooms || []).join(", ") || "هیچ‌کدام"}</b></div>
          <div style="margin-top:6px;opacity:.7">${this.escape(quality.note || "")}</div>
        </div>
      </section>

      <section style="margin-bottom:16px">
        ${this.sectionTitle("پیشنهادهای تمرینی برای بررسی متخصص")}
        <div>${this.trainingRecommendations(recommendations)}</div>
      </section>

      <section>
        ${this.sectionTitle("برنامه تمرینی انتخاب‌شده")}
        <div id="pg-training-plan">${this.trainingPlanView()}</div>
        <div style="margin-top:14px;display:flex;gap:10px;align-items:center">
          <button id="pg-approve-training" ${this.pendingAssignments.length ? "" : "disabled"}>تأیید برنامه تمرینی</button>
          <span style="font-size:11px;opacity:.55">تأیید نهایی با متخصص است.</span>
        </div>
      </section>
    `;
  }

  sectionTitle(title) {
    return `<h3 style="margin:0 0 9px;font-size:16px">${this.escape(title)}</h3>`;
  }

  statCard(label, value) {
    return `<div style="padding:12px;background:#101620;border:1px solid #202a38;border-radius:10px"><div style="font-size:11px;opacity:.55">${this.escape(label)}</div><div style="font-size:18px;font-weight:bold;margin-top:5px">${this.escape(String(value))}</div></div>`;
  }

  metricCard(label, value) {
    return this.statCard(label, this.translateValue(value));
  }

  trainingRecommendations(data) {
    if (!data?.recommendations?.length) {
      return `<div style="padding:14px;background:#101620;border-radius:10px;opacity:.65">بر اساس داده فعلی، پیشنهاد تمرینی مشخصی تولید نشده است.</div>`;
    }

    return data.recommendations.map(item => `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid #202633">
        <div>
          <div style="font-weight:bold">${this.escape(item.label)}</div>
          <div style="opacity:.55;font-size:11px;margin-top:4px">
            ${this.escape(item.targetId)} · سطح پیشنهادی ${this.escape(String(item.suggestedLevel ?? 1))} · نیازمند بررسی متخصص
          </div>
        </div>
        <button data-training-target="${this.escape(item.targetId)}" data-training-suggested-level="${this.escape(String(item.suggestedLevel ?? 1))}">انتخاب</button>
      </div>
    `).join("");
  }

  bindTrainingButtons() {
    this.root?.querySelectorAll("[data-training-target]").forEach(button => {
      button.onclick = () => {
        const targetId = button.getAttribute("data-training-target");
        const suggestedLevel = Number(button.getAttribute("data-training-suggested-level"));
        if (!targetId) return;
        if (this.pendingAssignments.some(i => i.targetId === targetId) || this.trainingPlan?.assignments?.some(i => i.targetId === targetId)) return;

        try {
          const temp = this.trainingPlan || createTrainingPlan({
            playerCode: this.session.getPlayerCode(),
            sourceSessionId: this.session.getSessionId()
          });
          const next = addTrainingAssignment(temp, {
            targetId,
            level: Number.isFinite(suggestedLevel) ? suggestedLevel : 1,
            assignedBy: "specialist"
          });
          const added = next.assignments.find(i => i.targetId === targetId);
          if (added) this.pendingAssignments.push(added);
          this.refreshTrainingPlan();
        } catch (error) {
          console.warn("PsychGame pending training assignment failed", error);
          alert("افزودن هدف تمرینی ناموفق بود.");
        }
      };
    });
  }

  bindTrainingLevelSelectors() {
    this.root?.querySelectorAll("[data-training-level]").forEach(select => {
      select.onchange = () => {
        const targetId = select.getAttribute("data-training-level");
        const level = Number(select.value);
        if (!targetId || !Number.isFinite(level)) return;

        if (this.pendingAssignments.some(i => i.targetId === targetId)) {
          this.pendingAssignments = this.pendingAssignments.map(i =>
            i.targetId === targetId
              ? { ...i, level, levelChangedBy: "specialist", levelChangedAt: new Date().toISOString() }
              : i
          );
        } else {
          this.trainingPlan = setTrainingAssignmentLevel(this.trainingPlan, targetId, level);
          this.saveTrainingPlan();
        }
        this.refreshTrainingPlan();
      };
    });
  }

  bindApproveButton() {
    const button = this.root?.querySelector("#pg-approve-training");
    if (!button) return;

    button.onclick = () => {
      if (!this.pendingAssignments.length) return;

      if (!this.trainingPlan) {
        this.trainingPlan = createTrainingPlan({
          playerCode: this.session.getPlayerCode(),
          sourceSessionId: this.session.getSessionId()
        });
      }

      for (const assignment of this.pendingAssignments) {
        this.trainingPlan = addTrainingAssignment(this.trainingPlan, {
          ...assignment,
          assignedBy: "specialist"
        });
      }

      this.trainingPlan = {
        ...this.trainingPlan,
        status: "APPROVED",
        approvedAt: new Date().toISOString(),
        approvedBy: "specialist",
        auditLog: [
          ...(this.trainingPlan.auditLog || []),
          { action: "APPROVE_PLAN", by: "specialist", at: new Date().toISOString() }
        ]
      };

      this.pendingAssignments = [];
      this.saveTrainingPlan();
      this.refreshTrainingPlan();
      alert("برنامه تمرینی تأیید شد.");
    };
  }

  trainingPlanView() {
    const assignments = [...(this.trainingPlan?.assignments || []), ...this.pendingAssignments];

    if (!assignments.length) {
      return `<div style="padding:14px;background:#101620;border-radius:10px;opacity:.6">هنوز هدفی توسط متخصص انتخاب نشده است.</div>`;
    }

    return assignments.map(item => `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid #202633">
        <div>
          <b>${this.escape(item.targetId)}</b>
          <span style="opacity:.65;margin-right:8px">
            · ${this.pendingAssignments.some(p => p.targetId === item.targetId) ? "در انتظار تأیید" : (this.trainingPlan?.status === "APPROVED" ? "تأییدشده توسط متخصص" : "ذخیره‌شده")}
          </span>
        </div>
        <select data-training-level="${this.escape(item.targetId)}">
          ${Array.from({length:TRAINING_TARGETS[item.targetId]?.progression?.length || 1},(_,i)=>{
            const level=i+1;
            return `<option value="${level}" ${level===Number(item.level)?"selected":""}>سطح ${level}</option>`;
          }).join("")}
        </select>
      </div>
    `).join("");
  }

  refreshTrainingPlan() {
    const block = this.root?.querySelector("#pg-training-plan");
    if (!block) return;
    block.innerHTML = this.trainingPlanView();
    this.bindTrainingLevelSelectors();

    const button = this.root?.querySelector("#pg-approve-training");
    if (button) button.disabled = !this.pendingAssignments.length;
  }

  saveTrainingPlan() {
    this.session.saveTrainingPlan(this.trainingPlan);
  }

  formatDuration(ms) {
    if (!Number.isFinite(ms)) return "—";
    const seconds = Math.max(0, Math.round(ms / 1000));
    if (seconds < 60) return `${seconds} ثانیه`;
    const minutes = Math.floor(seconds / 60);
    const rest = seconds % 60;
    return `${minutes} دقیقه ${rest ? rest + " ثانیه" : ""}`.trim();
  }

  translateValue(value) {
    const map = {
      HIGH: "بالا",
      MODERATE: "متوسط",
      LOW: "پایین",
      OBSERVED: "مشاهده شد",
      NOT_OBSERVED: "مشاهده نشد",
      SHORT: "کوتاه",
      LONG: "طولانی"
    };
    return map[value] || (value == null || value === "" ? "مشاهده‌نشده" : String(value));
  }

  escape(value) {
    return String(value ?? "").replace(/[&<>"']/g, c => ({
      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      "\"":"&quot;",
      "'":"&#39;"
    }[c]));
  }
}
