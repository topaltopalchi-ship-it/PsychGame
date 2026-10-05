export class SpecialistReport {
  static build(sessionData) {
    const events = Array.isArray(sessionData?.events) ? sessionData.events : [];
    const byType = {};
    const rooms = {};
    const path = [];
    const timeline = [];
    const roomEntries = {};
    const roomExits = {};
    const lookStats = {};
    const interactionStats = {};

    const inferRoomId = (event) => {
      if (event?.roomId) return event.roomId;
      const match = String(event?.type || "").match(/^ROOM_(\d{2})(?:_|$)/);
      return match ? `ROOM_${match[1]}` : null;
    };

    const ensureRoom = (roomId) => {
      if (!rooms[roomId]) {
        rooms[roomId] = {
          events: 0, completed: 0, interactions: 0, failures: 0,
          decisions: 0, inspections: 0, switches: 0,
          firstChoice: null, lastChoice: null, durationMs: null
        };
      }
      return rooms[roomId];
    };

    const ensureLook = (roomId, objectId) => {
      const key = `${roomId || "UNKNOWN"}::${objectId || "UNKNOWN"}`;
      if (!lookStats[key]) {
        lookStats[key] = { roomId, objectId, looks: 0, totalLookMs: 0, maxLookMs: 0, lastLookMs: null };
      }
      return lookStats[key];
    };

    for (const event of events) {
      const type = event?.type || "UNKNOWN";
      byType[type] = (byType[type] || 0) + 1;
      const roomId = inferRoomId(event);

      if (roomId) {
        const room = ensureRoom(roomId);
        room.events++;
        if (type === "ROOM_ENTER") {
          if (!Number.isFinite(roomEntries[roomId])) roomEntries[roomId] = event.elapsedMs ?? null;
          if (!path.includes(roomId)) path.push(roomId);
        }
        if (type === "ROOM_COMPLETED") {
          room.completed++;
          roomExits[roomId] = event.elapsedMs ?? null;
        }
        if (type === "OBJECT_INTERACTION") {
          room.interactions++;
          const key = `${roomId}::${event.objectId || "UNKNOWN"}`;
          if (!interactionStats[key]) interactionStats[key] = { roomId, objectId: event.objectId || null, attempts: 0 };
          interactionStats[key].attempts += 1;
        }
        if (type === "FAILURE") room.failures++;
        if (type.includes("CHOICE") || type.includes("EXIT_CHECKED")) {
          room.decisions++;
          room.lastChoice = event.choice ?? event.path ?? event.firstChoice ?? event.lastChoice ?? room.lastChoice;
          if (!room.firstChoice) room.firstChoice = event.firstChoice ?? event.path ?? event.choice ?? null;
        }
        if (type.includes("INSPECTED") || type.includes("CHECKED")) room.inspections++;
        room.switches += Number(event.choiceSwitches || 0) + Number(event.switchCount || 0);
      }

      if (type === "OBJECT_LOOK_END") {
        const stat = ensureLook(roomId, event.objectId);
        const duration = Number(event.durationMs) || 0;
        stat.looks++;
        stat.totalLookMs += duration;
        stat.maxLookMs = Math.max(stat.maxLookMs, duration);
        stat.lastLookMs = duration;
      }

      if (timeline.length < 500) {
        timeline.push({
          index: event.eventIndex ?? timeline.length,
          type, roomId,
          elapsedMs: Number.isFinite(event.elapsedMs) ? event.elapsedMs : null,
          timestamp: event.timestamp ?? null,
          objectId: event.objectId ?? null,
          choice: event.choice ?? event.path ?? null,
          durationMs: event.durationMs ?? null,
          attempt: event.attempt ?? null
        });
      }
    }

    for (const roomId of Object.keys(rooms)) {
      const start = roomEntries[roomId];
      const end = roomExits[roomId];
      if (Number.isFinite(start) && Number.isFinite(end) && end >= start) rooms[roomId].durationMs = end - start;
    }

    const lookSummary = Object.values(lookStats).map(stat => ({
      ...stat,
      averageLookMs: stat.looks ? Math.round(stat.totalLookMs / stat.looks) : 0
    }));
    const repeatedInteractions = Object.values(interactionStats).filter(stat => stat.attempts > 1).sort((a,b) => b.attempts - a.attempts);
    const decisionEvents = events.filter(event =>
      String(event?.type || "").includes("CHOICE") || String(event?.type || "").includes("EXIT_CHECKED")
    );
    const roomDurations = Object.fromEntries(Object.entries(rooms).map(([id, room]) => [id, room.durationMs]));
    const completedRooms = Object.entries(rooms).filter(([, room]) => room.completed > 0).map(([id]) => id);
    const lastEvent = events[events.length - 1];
    const firstDecision = decisionEvents[0];

    const specialistReportFa = {
      title: "گزارش رفتاری بازی برای متخصص",
      methodology: "این گزارش بر پایه شاخص‌های رفتاری ثبت‌شده در روند بازی تهیه شده است و تشخیص بالینی یا نتیجه‌گیری قطعی درباره وضعیت روان‌شناختی بازیکن نیست.",
      session: {
        playerCode: sessionData?.playerCode ?? null,
        sessionId: sessionData?.sessionId ?? null,
        تعداد_رویدادها: events.length,
        مدت_جلسه_میلی_ثانیه: Number.isFinite(lastEvent?.elapsedMs) ? lastEvent.elapsedMs : null,
        تعداد_تصمیم‌ها: decisionEvents.length,
        زمان_تا_اولین_تصمیم_میلی_ثانیه: Number.isFinite(firstDecision?.elapsedMs) ? firstDecision.elapsedMs : null
      },
      مسیر_اتاق‌ها: path,
      اتاق‌های_تکمیل‌شده: completedRooms,
      خلاصه_اتاق‌ها: {
        ROOM_04: {
          عنوان: "اتاق ۰۴",
          رویدادهای_حرکتی: byType.ROOM_04_MOVEMENT || 0,
          بررسی_نشانه: byType.ROOM_04_MARK_INSPECTED || 0,
          جابه‌جایی_حافظه: byType.ROOM_04_MEMORY_SHIFT || 0,
          اختلال_حلقه: byType.ROOM_04_LOOP_GLITCH || 0
        },
        ROOM_05: {
          عنوان: "اتاق ۰۵",
          بررسی_آینه: byType.ROOM_05_MIRROR_INSPECTED || 0,
          اختلال_بازتاب: byType.ROOM_05_REFLECTION_GLITCH || 0,
          تصمیم: byType.ROOM_05_CHOICE || 0
        },
        ROOM_06: {
          عنوان: "اتاق ۰۶",
          بررسی_ضبط: byType.ROOM_06_RECORDING_CHECKED || 0,
          رویداد_نجوا: byType.ROOM_06_WHISPER_EVENT || 0,
          اعوجاج_سیگنال: byType.ROOM_06_SIGNAL_DISTORTION || 0,
          پروفایل_اعتماد: byType.ROOM_06_TRUST_PROFILE || 0
        },
        ROOM_07: {
          عنوان: "اتاق ۰۷",
          انتخاب_اعتماد: byType.ROOM_07_TRUST_CHOICE || 0,
          درخواست_همراه: byType.ROOM_07_COMPANION_PROMPT || 0,
          پروفایل_اعتماد: byType.ROOM_07_TRUST_PROFILE || 0
        },
        ROOM_08: {
          عنوان: "اتاق ۰۸",
          پروفایل_رفتاری: byType.ROOM_08_BEHAVIORAL_PROFILE || 0,
          زمینه_رفتاری: byType.ROOM_08_BEHAVIOR_CONTEXT || 0,
          پاسخ_هسته: byType.ROOM_08_CORE_RESPONSE || 0,
          بررسی_خروج: byType.ROOM_08_EXIT_CHECKED || 0,
          توالی_پایانی: byType.ROOM_08_FINAL_SEQUENCE || 0
        }
      },
      شاخص‌های_رفتاری: sessionData?.analysis ? {
        اکتشاف: sessionData.analysis.exploration === "HIGH" ? "بالا" : sessionData.analysis.exploration === "MODERATE" ? "متوسط" : sessionData.analysis.exploration === "LOW" ? "پایین" : "مشاهده‌نشده",
        ریسک‌پذیری: sessionData.analysis.riskTaking === "HIGH" ? "بالا" : sessionData.analysis.riskTaking === "MODERATE" ? "متوسط" : sessionData.analysis.riskTaking === "LOW" ? "پایین" : "مشاهده‌نشده",
        پشتکار: sessionData.analysis.persistence === "HIGH" ? "بالا" : sessionData.analysis.persistence === "MODERATE" ? "متوسط" : sessionData.analysis.persistence === "LOW" ? "پایین" : "مشاهده‌نشده",
        تغییر_راهبرد: sessionData.analysis.strategyChange === "OBSERVED" ? "مشاهده شد" : "مشاهده نشد",
        زمان_تصمیم‌گیری: sessionData.analysis.decisionLatency === "SHORT" ? "کوتاه" : sessionData.analysis.decisionLatency === "MODERATE" ? "متوسط" : sessionData.analysis.decisionLatency === "LONG" ? "طولانی" : "مشاهده‌نشد",
        کمک‌خواهی: sessionData.analysis.helpSeeking === "OBSERVED" ? "مشاهده شد" : "مشاهده نشد",
        رفتار_اتاق‌ها: sessionData.analysis.roomBehavior ?? {}
      } : null,
      پروفایل_مرحله_اول: sessionData?.analysis?.phase1Profile ?? null,
      تحلیل_ثبت‌شده: sessionData?.analysis ?? null
    };

    return {
      generatedAt: new Date().toISOString(),
      playerCode: sessionData?.playerCode ?? null,
      sessionId: sessionData?.sessionId ?? null,
      sessionStart: sessionData?.sessionStart ?? null,
      eventCount: events.length,
      sessionDurationMs: Number.isFinite(lastEvent?.elapsedMs) ? lastEvent.elapsedMs : null,
      decisionCount: decisionEvents.length,
      timeToFirstDecisionMs: Number.isFinite(firstDecision?.elapsedMs) ? firstDecision.elapsedMs : null,
      completedRooms,
      path,
      roomDurations,
      lookSummary,
      repeatedInteractions,
      timeline,
      eventTypes: byType,
      rooms,
      trainingResult: sessionData?.trainingResult ?? null,
      trainingProgress: sessionData?.trainingProgress ?? null,
      roomDetails: {
        ROOM_04: { movementEvents: byType.ROOM_04_MOVEMENT || 0, markInspections: byType.ROOM_04_MARK_INSPECTED || 0, memoryShifts: byType.ROOM_04_MEMORY_SHIFT || 0, loopGlitches: byType.ROOM_04_LOOP_GLITCH || 0 },
        ROOM_05: { mirrorInspections: byType.ROOM_05_MIRROR_INSPECTED || 0, reflectionGlitches: byType.ROOM_05_REFLECTION_GLITCH || 0, choices: byType.ROOM_05_CHOICE || 0 },
        ROOM_06: { recordingChecks: byType.ROOM_06_RECORDING_CHECKED || 0, whisperEvents: byType.ROOM_06_WHISPER_EVENT || 0, signalDistortions: byType.ROOM_06_SIGNAL_DISTORTION || 0, trustProfiles: byType.ROOM_06_TRUST_PROFILE || 0 },
        ROOM_07: { trustChoices: byType.ROOM_07_TRUST_CHOICE || 0, companionPrompts: byType.ROOM_07_COMPANION_PROMPT || 0, trustProfiles: byType.ROOM_07_TRUST_PROFILE || 0 },
        ROOM_08: { behavioralProfiles: byType.ROOM_08_BEHAVIORAL_PROFILE || 0, behaviorContexts: byType.ROOM_08_BEHAVIOR_CONTEXT || 0, coreResponses: byType.ROOM_08_CORE_RESPONSE || 0, exitChecks: byType.ROOM_08_EXIT_CHECKED || 0, finalSequences: byType.ROOM_08_FINAL_SEQUENCE || 0 }
      },
      analysis: sessionData?.analysis ?? null
    };
  }
}