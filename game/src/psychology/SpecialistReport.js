export class SpecialistReport {
  static build(sessionData) {
    const events = Array.isArray(sessionData?.events) ? sessionData.events : [];
    const byType = {};
    const rooms = {};

    const ensureRoom = (roomId) => {
      if (!rooms[roomId]) {
        rooms[roomId] = {
          events: 0,
          completed: 0,
          interactions: 0,
          failures: 0,
          decisions: 0,
          inspections: 0,
          switches: 0,
          firstChoice: null,
          lastChoice: null
        };
      }
      return rooms[roomId];
    };

    for (const event of events) {
      byType[event.type] = (byType[event.type] || 0) + 1;
      const roomId = event.roomId;
      if (!roomId) continue;

      const room = ensureRoom(roomId);
      room.events++;

      if (event.type === "ROOM_COMPLETED") room.completed++;
      if (event.type === "OBJECT_INTERACTION") room.interactions++;
      if (event.type === "FAILURE") room.failures++;

      if (event.type.includes("CHOICE") || event.type.includes("EXIT_CHECKED")) {
        room.decisions++;
        room.lastChoice = event.choice ?? event.firstChoice ?? event.lastChoice ?? room.lastChoice;
        if (!room.firstChoice && event.firstChoice) room.firstChoice = event.firstChoice;
      }

      if (event.type.includes("INSPECTED") || event.type.includes("CHECKED")) {
        room.inspections++;
      }

      room.switches += Number(event.choiceSwitches || 0) + Number(event.switchCount || 0);
    }

    return {
      generatedAt: new Date().toISOString(),
      playerCode: sessionData?.playerCode ?? null,
      sessionId: sessionData?.sessionId ?? null,
      sessionStart: sessionData?.sessionStart ?? null,
      eventCount: events.length,
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
