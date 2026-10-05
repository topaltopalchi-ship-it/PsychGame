// Converts observed gameplay into specialist-review training suggestions.
// These are behavioral domains, not diagnoses. The specialist retains final control.

const RECOMMENDATION_RULES = [
  { id: "WAIT_TOLERANCE", label: "تحمل تأخیر", evidence: ({ analysis = {} }) => analysis.decisionLatency?.level === "SHORT" },
  { id: "RESPONSE_INHIBITION", label: "مهار پاسخ فوری", evidence: ({ analysis = {} }) => analysis.riskTaking?.level === "HIGH" || analysis.decisionLatency?.level === "SHORT" },
  { id: "ATTENTION_SUSTAIN", label: "تداوم توجه", evidence: ({ analysis = {}, lookSummary = {} }) => analysis.exploration?.level === "LOW" || Number(lookSummary?.totalLookMs || 0) < 3000 },
  { id: "DECISION_COMMITMENT", label: "ثبات تصمیم", evidence: ({ roomDetails = {} }) => Object.values(roomDetails).some(room => Number(room?.choiceSwitches || 0) > 0) },
  { id: "UNCERTAINTY_TOLERANCE", label: "تحمل ابهام", evidence: ({ analysis = {} }) => analysis.helpSeeking?.level === "OBSERVED" },
  { id: "REPETITION_REDUCTION", label: "کاهش رفتار تکراری", evidence: ({ repeatedInteractions = {} }) => Object.values(repeatedInteractions).some(value => Number(value || 0) >= 3) },
  { id: "GRADUAL_APPROACH", label: "رویارویی تدریجی", evidence: ({ analysis = {} }) => analysis.persistence?.level === "LOW" },
  { id: "EMOTIONAL_PAUSE", label: "مکث پیش از واکنش", evidence: ({ analysis = {} }) => analysis.riskTaking?.level === "MODERATE" || analysis.riskTaking?.level === "HIGH" }
];

export function buildTrainingRecommendations(report = {}) {
  const profile = report.phase1Profile || {};
  const observed = profile.observed || {};
  const room01 = observed.room01 || {};
  const room02 = observed.room02 || {};
  const room03 = observed.room03 || {};

  const evidence = {
    RESPONSE_INHIBITION: room01.firstDecisionReactionTimeMs != null && room01.firstDecisionReactionTimeMs < 2000,
    WAIT_TOLERANCE: room03.waitingChecks >= 2 || (room03.firstWaitingReactionTimeMs != null && room03.firstWaitingReactionTimeMs < 2000),
    DECISION_COMMITMENT: room02.pathSwitches > 0,
    ATTENTION_SUSTAIN: room01.objectInteractions < 3 && room03.waitingChecks < 2,
    REPETITION_REDUCTION: room01.retriesAfterFailure >= 2 || room02.pathChoices > 2,
    EMOTIONAL_PAUSE: room01.redButtonPresses >= 2 || (room01.firstDecisionReactionTimeMs != null && room01.firstDecisionReactionTimeMs < 2000),
    UNCERTAINTY_TOLERANCE: room02.pathChoices === 0 || room02.uniquePaths > 1,
    GRADUAL_APPROACH: Boolean(report.rooms?.ROOM_04?.events || report.rooms?.ROOM_05?.events || report.rooms?.ROOM_06?.events)
  };

  const recommendations = RECOMMENDATION_RULES
    .filter(rule => Boolean(evidence[rule.id]) || (() => { try { return Boolean(rule.evidence(report)); } catch { return false; } })())
    .map(rule => {
      const evidenceCount = [
        Boolean(evidence[rule.id]),
        Boolean(report.analysis),
        Boolean(report.phase1Profile),
        Boolean(report.rooms && Object.keys(report.rooms).length >= 4)
      ].filter(Boolean).length;
      const suggestedLevel = evidenceCount >= 4 ? 3 : evidenceCount >= 2 ? 2 : 1;
      return {
        targetId: rule.id,
        label: rule.label,
        source: "rooms_01_08_observation",
        status: "SPECIALIST_REVIEW_REQUIRED",
        suggestedLevel,
        levelBasis: "initial non-clinical difficulty suggestion from observed gameplay only",
        evidence: {
          roomsObserved: Object.keys(report.rooms || {}).filter(roomId => report.rooms[roomId]),
          basis: "observable gameplay behavior; specialist review required"
        }
      };
    });

  return {
    version: 3,
    generatedAt: new Date().toISOString(),
    playerCode: report.playerCode || null,
    sourceSessionId: report.sessionId || profile.sessionId || null,
    basis: "Rooms 01-08 behavioral observations",
    recommendations
  };
}

export function getRecommendationRules() {
  return RECOMMENDATION_RULES.map(({ id, label }) => ({ id, label }));
}
