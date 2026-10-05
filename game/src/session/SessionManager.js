import { BehaviorTracker } from "../psychology/BehaviorTracker.js";
import { BehaviorAnalyzer } from "../psychology/BehaviorAnalyzer.js";
import { SpecialistReport } from "../psychology/SpecialistReport.js";
import { SessionUploader } from "./SessionUploader.js";
import { buildTrainingRecommendations } from "../training/TrainingRecommendations.js";

export class SessionManager {
  constructor() {
    this.tracker = new BehaviorTracker();
    this.tracker.setEnabled(true);
    this.analyzer = new BehaviorAnalyzer();
    this.playerCode = this.generatePlayerCode();
    this.sessionStart = new Date().toISOString();
    this.playerConsent = true;
    this.storageKey = `psychgame_${this.playerCode}`;
    this.uploader = new SessionUploader({ endpoint: import.meta.env.VITE_API_URL || "", token: import.meta.env.VITE_AUTHOR_TOKEN || "" });
    this.lastRemoteUpload = 0;
    this.completedUploadStarted = false;
    this.tracker.onEvent = () => this.saveSession();
    window.addEventListener("pagehide", () => this.saveSession());
    window.addEventListener("psychgame-training-phase-completed", () => this.saveSession({ completed: true }));
    window.addEventListener("psychgame-training-room-complete", (event) => {
      if (event?.detail?.trainingResult) this.saveSession({ completed: true });
    });
  }

  generatePlayerCode() {
    const key = "psychgame_player_code_v1";
    try {
      const existing = localStorage.getItem(key);
      if (existing) return existing;
      const code = `PLAYER-${Math.floor(10000 + Math.random() * 90000)}`;
      localStorage.setItem(key, code);
      return code;
    } catch (_) {
      return `PLAYER-${Math.floor(10000 + Math.random() * 90000)}`;
    }
  }

  setConsent(value = true) {
    this.playerConsent = true;
    this.tracker.setEnabled(true);
    this.saveSession();
  }

  hasConsent() { return this.playerConsent; }
  getConsentPromise() { return Promise.resolve(this.playerConsent); }
  getPlayerCode() { return this.playerCode; }
  getSessionId() { return this.tracker.getSessionId(); }
  getTracker() { return this.tracker; }

  getAnalysis() {
    this.analyzer = new BehaviorAnalyzer(this.tracker.getEvents());
    return this.analyzer.getReport();
  }

  getPhase1Profile() {
    return this.analyzer.buildPhase1Profile();
  }

  getTrainingRecommendations() {
    const analysis = this.getAnalysis();
    const phase1Profile = this.getPhase1Profile();
    const report = SpecialistReport.build({
      playerCode: this.playerCode,
      sessionId: this.getSessionId(),
      sessionStart: this.sessionStart,
      events: this.tracker.getEvents(),
      analysis,
      phase1Profile
    });
    return buildTrainingRecommendations({
      ...report,
      playerCode: this.playerCode,
      sessionId: this.getSessionId(),
      phase1Profile
    });
  }

  getTrainingResult() {
    try {
      const raw = localStorage.getItem(`psychgame_training_results_${this.playerCode}`);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  getTrainingProgress() {
    try {
      const runtimeKey = `psychgame_training_runtime_${this.playerCode}`;
      const recoveryKey = `psychgame_training_recovery_${this.playerCode}`;
      const raw = sessionStorage.getItem(runtimeKey) || localStorage.getItem(recoveryKey);
      if (!raw) return null;
      const runtime = JSON.parse(raw);
      return {
        sessionId: runtime?.sessionId ?? null,
        startedAt: runtime?.startedAt ?? null,
        roomId: runtime?.roomId ?? null,
        assignments: Array.isArray(runtime?.assignments)
          ? runtime.assignments.map(item => ({
              targetId: item.targetId,
              level: item.level,
              attempts: item.attempts || 0,
              successes: item.successes || 0,
              failures: item.failures || 0,
              completed: Boolean(item.completed),
              exhausted: Boolean(item.exhausted),
              aborted: Boolean(item.aborted)
            }))
          : []
      };
    } catch (_) {
      return null;
    }
  }

  getTrainingConsistency() {
    const result = this.getTrainingResult();
    const progress = this.getTrainingProgress();
    if (!result) return { status: "running", consistent: true, mismatches: [] };
    if (!progress) return { status: "missing_runtime", consistent: false, mismatches: ["runtime"] };
    const mismatches = [];
    if (result.trainingSessionId && progress.sessionId !== result.trainingSessionId) mismatches.push("sessionId");
    const resultAssignments = Array.isArray(result.assignments) ? result.assignments : [];
    const runtimeAssignments = Array.isArray(progress.assignments) ? progress.assignments : [];
    const fields = ["targetId","level","attempts","successes","failures","completed","exhausted","aborted"];
    if (resultAssignments.length !== runtimeAssignments.length) mismatches.push("assignmentCount");
    const runtimeByTarget = new Map(runtimeAssignments.map(item => [item.targetId, item]));
    for (const expected of resultAssignments) {
      const actual = runtimeByTarget.get(expected.targetId);
      if (!actual) { mismatches.push(`assignment:${expected.targetId}`); continue; }
      for (const field of fields) {
        if (actual[field] !== expected[field]) { mismatches.push(`assignment:${expected.targetId}:${field}`); break; }
      }
    }
    return {
      status: result.status || "completed",
      consistent: mismatches.length === 0,
      mismatches
    };
  }

  getSessionData() {
    return {
      playerCode: this.playerCode,
      sessionId: this.getSessionId(),
      sessionStart: this.sessionStart,
      consent: this.playerConsent,
      events: this.tracker.getEvents(),
      analysis: this.getAnalysis(),
      phase1Profile: this.getPhase1Profile(),
      trainingRecommendations: this.getTrainingRecommendations(),
      trainingResult: this.getTrainingResult(),
      trainingProgress: this.getTrainingProgress(),
      trainingConsistency: this.getTrainingConsistency()
    };
  }

  getReport() { return SpecialistReport.build(this.getSessionData()); }

  saveSession({ completed = false } = {}) {
    try {
      const data = this.getSessionData();
      localStorage.setItem(this.storageKey, JSON.stringify(data));

      const now = Date.now();
      if (completed) {
        if (this.completedUploadStarted) return;
        this.completedUploadStarted = true;
        this.lastRemoteUpload = now;
        this.uploader.upload(this.getReport(), { completed: true });
        return;
      }

      if (now - this.lastRemoteUpload > 15000) {
        this.lastRemoteUpload = now;
        this.uploader.upload(this.getReport(), { completed: false });
      }
    } catch (error) {
      console.warn("PsychGame session save failed", error);
    }
  }
  resetTrainingUploadState() {
    this.completedUploadStarted = false;
    this.lastRemoteUpload = 0;
  }

  uploadCompletedSession() {
    if (this.completedUploadStarted) return Promise.resolve({ skipped: true, reason: "already-started" });
    this.completedUploadStarted = true;
    return this.uploader.upload(this.getReport(), { completed: true });
  }
  exportSession() { return JSON.stringify(this.getReport(), null, 2); }
}
