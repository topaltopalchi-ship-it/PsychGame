// Future Phase 2 foundation.
// Converts Phase 1 gameplay indicators into specialist review suggestions.
// Suggestions are behavioral domains only and are never presented as diagnoses.

const RECOMMENDATION_RULES = [
  {
    id: "WAIT_TOLERANCE",
    label: "تحمل تأخیر",
    evidence: ({ analysis = {} }) =>
      analysis.decisionLatency?.level === "SHORT"
  },
  {
    id: "RESPONSE_INHIBITION",
    label: "مهار پاسخ فوری",
    evidence: ({ analysis = {} }) =>
      analysis.riskTaking?.level === "HIGH" ||
      analysis.decisionLatency?.level === "SHORT"
  },
  {
    id: "ATTENTION_SUSTAIN",
    label: "تداوم توجه",
    evidence: ({ analysis = {}, lookSummary = {} }) =>
      analysis.exploration?.level === "LOW" ||
      Number(lookSummary?.totalLookMs || 0) < 3000
  },
  {
    id: "DECISION_COMMITMENT",
    label: "ثبات تصمیم",
    evidence: ({ roomDetails = {} }) =>
      Object.values(roomDetails).some(
        (room) => Number(room?.choiceSwitches || 0) > 0
      )
  },
  {
    id: "UNCERTAINTY_TOLERANCE",
    label: "تحمل ابهام",
    evidence: ({ analysis = {} }) =>
      analysis.helpSeeking?.level === "OBSERVED"
  },
  {
    id: "REPETITION_REDUCTION",
    label: "کاهش رفتار تکراری",
    evidence: ({ repeatedInteractions = {} }) =>
      Object.values(repeatedInteractions).some(
        (value) => Number(value || 0) >= 3
      )
  },
  {
    id: "GRADUAL_APPROACH",
    label: "رویارویی تدریجی",
    evidence: ({ analysis = {} }) =>
      analysis.persistence?.level === "LOW"
  },
  {
    id: "EMOTIONAL_PAUSE",
    label: "مکث پیش از واکنش",
    evidence: ({ analysis = {} }) =>
      analysis.riskTaking?.level === "MODERATE" ||
      analysis.riskTaking?.level === "HIGH"
  }
];

export function buildTrainingRecommendations(report = {}) {
  const recommendations = RECOMMENDATION_RULES
    .filter((rule) => {
      try {
        return Boolean(rule.evidence(report));
      } catch {
        return false;
      }
    })
    .map((rule) => ({
      targetId: rule.id,
      label: rule.label,
      source: "gameplay_observation",
      status: "SPECIALIST_REVIEW_REQUIRED"
    }));

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    playerCode: report.playerCode || null,
    sourceSessionId: report.sessionId || null,
    recommendations
  };
}

export function getRecommendationRules() {
  return RECOMMENDATION_RULES.map(({ id, label }) => ({ id, label }));
}
