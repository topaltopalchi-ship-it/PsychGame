export class SpecialistReport {
  static build(sessionData) {
    const events = Array.isArray(sessionData?.events) ? sessionData.events : [];
    const byType = {};
    const rooms = {};
    const path = [];
    const timeline = [];
    const roomEntries = {};
    const roomExits = {};

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
        if (type === "OBJECT_INTERACTION") room.interactions++;
        if (type === "FAILURE") room.failures++;

        if (type.includes("CHOICE") || type.includes("EXIT_CHECKED")) {
          room.decisions++;
          room.lastChoice = event.choice ?? event.firstChoice ?? event.lastChoice ?? room.lastChoice;
          if (!room.firstChoice && event.firstChoice) room.firstChoice = event.firstChoice;
        }

        if (type.includes("INSPECTED") || type.includes("CHECKED")) room.inspections++;
        room.switches += Number(event.choiceSwitches || 0) + Number(event.switchCount || 0);
      }

      if (timeline.length < 500) {
        timeline.push({
          index: event.eventIndex ?? timeline.length,
          type,
          roomId,
          elapsedMs: Number.isFinite(event.elapsedMs) ? event.elapsedMs : null,
          timestamp: event.timestamp ?? null,
          choice: event.choice ?? null
        });
      }
    }

    for (const roomId of Object.keys(rooms)) {
      const start = roomEntries[roomId];
      const end = roomExits[roomId];
      if (Number.isFinite(start) && Number.isFinite(end) && end >= start) {
        rooms[roomId].durationMs = end - start;
      }
    }

    const decisionEvents = events.filter((event) =>
      String(event?.type || "").includes("CHOICE") ||
      String(event?.type || "").includes("EXIT_CHECKED")
    );

    const roomDurations = Object.fromEntries(
      Object.entries(rooms).map(([id, room]) => [id, room.durationMs])
    );

    const completedRooms = Object.entries(rooms)
      .filter(([, room]) => room.completed > 0)
      .map(([id]) => id);

    const lastEvent = events[events.length - 1];
    const firstDecision = decisionEvents[0];
    const sessionDurationMs = Number.isFinite(lastEvent?.elapsedMs) ? lastEvent.elapsedMs : null;

    return {
      generatedAt: new Date().toISOString(),
      playerCode: sessionData?.playerCode ?? null,
      sessionId: sessionData?.sessionId ?? null,
      sessionStart: sessionData?.sessionStart ?? null,
      eventCount: events.length,
      sessionDurationMs,
      decisionCount: decisionEvents.length,
      timeToFirstDecisionMs: Number.isFinite(firstDecision?.elapsedMs) ? firstDecision.elapsedMs : null,
      completedRooms,
      path,
      roomDurations,
      timeline,
      eventTypes: byType,
      rooms,
      roomDetails: {
        ROOM_04: {
          movementEvents: byType.ROOM_04_MOVEMENT || 0,
          markInspections: byType.ROOM_04_MARK_INSPECTED || 0,
          memoryShifts: byType.ROOM_04_MEMORY_SHIFT || 0,
          loopGlitches: byType.ROOM_04_LOOP_GLITCH || 0
        },
        ROOM_05: {
          mirrorInspections: byType.ROOM_05_MIRROR_INSPECTED || 0,
          reflectionGlitches: byType.ROOM_05_REFLECTION_GLITCH || 0,
          choices: byType.ROOM_05_CHOICE || 0
        },
        ROOM_06: {
          recordingChecks: byType.ROOM_06_RECORDING_CHECKED || 0,
          whisperEvents: byType.ROOM_06_WHISPER_EVENT || 0,
          signalDistortions: byType.ROOM_06_SIGNAL_DISTORTION || 0,
          trustProfiles: byType.ROOM_06_TRUST_PROFILE || 0
        },
        ROOM_07: {
          trustChoices: byType.ROOM_07_TRUST_CHOICE || 0,
          companionPrompts: byType.ROOM_07_COMPANION_PROMPT || 0,
          trustProfiles: byType.ROOM_07_TRUST_PROFILE || 0
        },
        ROOM_08: {
          behavioralProfiles: byType.ROOM_08_BEHAVIORAL_PROFILE || 0,
          coreResponses: byType.ROOM_08_CORE_RESPONSE || 0,
          exitChecks: byType.ROOM_08_EXIT_CHECKED || 0,
          finalSequences: byType.ROOM_08_FINAL_SEQUENCE || 0
        }
      },
      analysis: sessionData?.analysis ?? null
    };
  }
}
