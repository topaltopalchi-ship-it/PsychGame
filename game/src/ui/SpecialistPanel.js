import { SpecialistReport } from "../psychology/SpecialistReport.js";
import { createTrainingPlan, addTrainingAssignment, setTrainingAssignmentLevel } from "../training/TrainingAssignment.js";
import { TRAINING_TARGETS } from "../training/TrainingTargets.js";

export class SpecialistPanel {
  constructor(session) { this.session=session; this.root=null; this.trainingPlan=this.session.getTrainingPlan(); this.pendingAssignments=[]; }

  open() {
    if(this.root)return;
    SpecialistReport.build(this.session.getSessionData());
    const recommendations=this.session.getTrainingRecommendations();
    const root=document.createElement("div"); root.id="pg-specialist-panel";
    Object.assign(root.style,{position:"fixed",inset:"0",zIndex:"20000",background:"rgba(4,6,10,.96)",color:"#eee",fontFamily:"Tahoma,Arial,sans-serif",direction:"rtl",overflow:"auto",padding:"24px",boxSizing:"border-box"});
    root.innerHTML=`<div style="max-width:1100px;margin:auto"><h2>پنل متخصص</h2><div id="pg-sp-body"></div></div>`;
    document.body.appendChild(root); this.root=root;
    const body=root.querySelector("#pg-sp-body");
    body.innerHTML=`<h3>پیشنهادهای تمرینی برای بررسی متخصص</h3><div>${this.trainingRecommendations(recommendations)}</div><h3>برنامه تمرینی انتخاب‌شده</h3><div id="pg-training-plan">${this.trainingPlanView()}</div><div style="margin-top:18px"><button id="pg-approve-training" ${this.pendingAssignments.length?"":"disabled"}>تأیید برنامه تمرینی</button></div>`;
    this.bindTrainingButtons(); this.bindTrainingLevelSelectors(); this.bindApproveButton();
  }

  trainingRecommendations(data){
    if(!data.recommendations.length)return `<div style="opacity:.65">بر اساس داده فعلی، پیشنهاد تمرینی مشخصی تولید نشده است.</div>`;
    return data.recommendations.map(item=>`<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid #202633"><div><div style="font-weight:bold">${this.escape(item.label)}</div><div style="opacity:.55;font-size:11px;margin-top:4px">${this.escape(item.targetId)} · سطح پیشنهادی ${this.escape(String(item.suggestedLevel??1))} · نیازمند بررسی متخصص</div></div><button data-training-target="${this.escape(item.targetId)}" data-training-suggested-level="${this.escape(String(item.suggestedLevel??1))}">انتخاب برای برنامه</button></div>`).join("");
  }

  bindTrainingButtons(){this.root?.querySelectorAll("[data-training-target]").forEach(button=>{button.onclick=()=>{const targetId=button.getAttribute("data-training-target");const suggestedLevel=Number(button.getAttribute("data-training-suggested-level"));if(!targetId)return;if(this.pendingAssignments.some(i=>i.targetId===targetId)||this.trainingPlan?.assignments?.some(i=>i.targetId===targetId))return;try{const temp=this.trainingPlan||createTrainingPlan({playerCode:this.session.getPlayerCode(),sourceSessionId:this.session.getSessionId()});const next=addTrainingAssignment(temp,{targetId,level:Number.isFinite(suggestedLevel)?suggestedLevel:1,assignedBy:"specialist"});const added=next.assignments.find(i=>i.targetId===targetId);if(added)this.pendingAssignments.push(added);this.refreshTrainingPlan();}catch(error){console.warn("PsychGame pending training assignment failed",error);alert("افزودن هدف تمرینی ناموفق بود.");}};});}

  bindTrainingLevelSelectors(){this.root?.querySelectorAll("[data-training-level]").forEach(select=>{select.onchange=()=>{const targetId=select.getAttribute("data-training-level");const level=Number(select.value);if(!targetId||!Number.isFinite(level))return;if(this.pendingAssignments.some(i=>i.targetId===targetId)){this.pendingAssignments=this.pendingAssignments.map(i=>i.targetId===targetId?{...i,level,levelChangedBy:"specialist",levelChangedAt:new Date().toISOString()}:i);}else{this.trainingPlan=setTrainingAssignmentLevel(this.trainingPlan,targetId,level);this.saveTrainingPlan();}this.refreshTrainingPlan();};});}

  bindApproveButton(){const button=this.root?.querySelector("#pg-approve-training");if(!button)return;button.onclick=()=>{if(!this.pendingAssignments.length)return;if(!this.trainingPlan)this.trainingPlan=createTrainingPlan({playerCode:this.session.getPlayerCode(),sourceSessionId:this.session.getSessionId()});for(const assignment of this.pendingAssignments)this.trainingPlan=addTrainingAssignment(this.trainingPlan,{...assignment,assignedBy:"specialist"});this.trainingPlan={...this.trainingPlan,status:"APPROVED",approvedAt:new Date().toISOString(),approvedBy:"specialist",auditLog:[...(this.trainingPlan.auditLog||[]),{action:"APPROVE_PLAN",by:"specialist",at:new Date().toISOString()}]};this.pendingAssignments=[];this.saveTrainingPlan();this.refreshTrainingPlan();alert("برنامه تمرینی تأیید شد.");};}

  trainingPlanView(){const assignments=[...(this.trainingPlan?.assignments||[]),...this.pendingAssignments];if(!assignments.length)return `<div style="opacity:.6">هنوز هدفی توسط متخصص انتخاب نشده است.</div>`;return assignments.map(item=>`<div style="padding:10px 0;border-bottom:1px solid #202633"><b>${this.escape(item.targetId)}</b><span style="opacity:.65"> · ${this.pendingAssignments.some(p=>p.targetId===item.targetId)?"در انتظار تأیید":(this.trainingPlan?.status==="APPROVED"?"تأییدشده توسط متخصص":"ذخیره‌شده")}</span><select data-training-level="${this.escape(item.targetId)}" style="margin-right:10px">${Array.from({length:TRAINING_TARGETS[item.targetId]?.progression?.length||1},(_,i)=>{const level=i+1;return `<option value="${level}" ${level===Number(item.level)?"selected":""}>سطح ${level}</option>`}).join("")}</select></div>`).join("");}

  refreshTrainingPlan(){const block=this.root?.querySelector("#pg-training-plan");if(!block)return;block.innerHTML=this.trainingPlanView();this.bindTrainingLevelSelectors();const button=this.root?.querySelector("#pg-approve-training");if(button)button.disabled=!this.pendingAssignments.length;}
  saveTrainingPlan(){this.session.saveTrainingPlan(this.trainingPlan);}
  escape(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));}
}
