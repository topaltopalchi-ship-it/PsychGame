// Behavioral dimensions used by PsychGame's non-diagnostic behavioral screening layer.
// Scores must be treated as signals/indicators, not clinical diagnoses.
export const BehavioralAssessmentConfig = Object.freeze({
  version: "1.0",
  disclaimer: "Behavioral indicators only; not a clinical diagnosis.",
  dimensions: Object.freeze({
    stress: { label: "استرس", signals: ["reaction_time_change","error_under_pressure","avoidance_after_threat","movement_variability"] },
    anxiety: { label: "اضطراب/نگرانی", signals: ["rechecking","backtracking","uncertainty_delay","threat_monitoring"] },
    excitement: { label: "هیجان‌طلبی", signals: ["risk_choice","rapid_entry","novelty_seeking","warning_ignoring"] },
    hesitation: { label: "تردید", signals: ["decision_latency","choice_switches","rechecking_before_action"] },
    pessimism: { label: "منفی‌نگری", signals: ["negative_outcome_choice","threat_interpretation","failure_expectation"] },
    suspiciousness: { label: "بدبینی/بی‌اعتمادی", signals: ["source_verification","companion_distrust","contradiction_checks"] },
    compulsive_checking: { label: "رفتارهای تکراری/چک‌کردن", signals: ["repeat_interactions","return_after_answer","completion_rechecks"] },
    impulsivity: { label: "تکانشگری", signals: ["very_fast_action","action_without_inspection","risk_before_information"] },
    hyperactivity: { label: "بی‌قراری/فعالیت بالا", signals: ["continuous_movement","rapid_target_switching","unfinished_interactions"] },
    attention: { label: "توجه", signals: ["detail_detection","distraction_resistance","missed_clues"] },
    working_memory: { label: "حافظه کاری", signals: ["delayed_clue_use","route_memory","instruction_retention"] },
    avoidance: { label: "اجتناب", signals: ["threat_avoidance","difficult_option_avoidance","early_exit_attempts"] },
    confidence: { label: "اعتمادبه‌نفس", signals: ["decision_commitment","confirmation_seeking","post_choice_reversal"] },
    persistence: { label: "پشتکار", signals: ["retry_after_failure","time_on_task","recovery_after_error"] },
    emotional_control: { label: "کنترل هیجانی", signals: ["post_shock_behavior","post_failure_behavior","recovery_time"] },
    trust: { label: "اعتماد به دیگران", signals: ["companion_following","information_acceptance","independent_override"] },
    independence: { label: "استقلال", signals: ["companion_rejection","self_directed_search","independent_decision"] },
    threat_sensitivity: { label: "حساسیت به تهدید", signals: ["startle_reaction","threat_monitoring","safe_route_preference"] },
    intolerance_of_uncertainty: { label: "تحمل ابهام", signals: ["delay_under_ambiguity","rechecking","premature_closure"] },
    frustration_tolerance: { label: "تحمل ناکامی", signals: ["retry_rate","behavior_after_failure","rage_quit_like_exit"] },
    novelty_response: { label: "واکنش به تازگی", signals: ["exploration","approach_latency","avoidance_of_unknown"] },
    rule_following: { label: "پایبندی به دستور", signals: ["instruction_following","rule_breaking","shortcut_use"] },
    reward_sensitivity: { label: "حساسیت به پاداش", signals: ["reward_over_safety","delay_discounting","risk_for_reward"] },
    social_dependency: { label: "وابستگی اجتماعی", signals: ["help_seeking","companion_reliance","decision_alignment"] },
    cognitive_flexibility: { label: "انعطاف شناختی", signals: ["strategy_switching","learning_from_feedback","reversal_after_new_evidence"] }
  }),
  rooms: Object.freeze({
    ROOM_01: ["impulsivity","rule_following","reward_sensitivity","frustration_tolerance","attention"],
    ROOM_02: ["risk_taking","hesitation","decision_making","confidence","cognitive_flexibility"],
    ROOM_03: ["intolerance_of_uncertainty","persistence","anxiety","impulsivity","frustration_tolerance"],
    ROOM_04: ["working_memory","attention","confidence","cognitive_flexibility","navigation"],
    ROOM_05: ["compulsive_checking","anxiety","threat_sensitivity","intolerance_of_uncertainty"],
    ROOM_06: ["suspiciousness","pessimism","trust","attention","source_verification"],
    ROOM_07: ["trust","independence","social_dependency","confidence","decision_switching"],
    ROOM_08: ["stress","emotional_control","avoidance","threat_sensitivity","persistence"]
  })
});
