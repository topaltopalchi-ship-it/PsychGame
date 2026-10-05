export class SpecialistReport {
  static build(sessionData) {
    const events = Array.isArray(sessionData?.events) ? sessionData.events : [];
    const byType = {};
    const rooms = {};

    for (const event of events) {
      byType[event.type] = (byType[event.type] || 0) + 1;
      const roomId = event.roomId;
      if (roomId) {
        rooms[roomId] ||= { events: 0, failures: 0, interactions: 0, completions: 0 };
        rooms[roomId].events++;
        if (event.type === "FAILURE") rooms[roomId].failures++;
        if (event.type === "OBJECT_INTERACTION") rooms[roomId].interactions++;
        if (event.type === "ROOM_COMPLETED") rooms[roomId].completions++;
      }
    }

    return {
      generatedAt: new Date().toISOString(),
      playerCode: sessionData?.playerCode ?? null,
      sessionId: sessionData?.sessionId ?? null,
      sessionStart: sessionData?.sessionStart ?? null,
      eventCount: events.length,
      eventTypes: byType,
      rooms,
      analysis: sessionData?.analysis ?? null
    };
  }
}
