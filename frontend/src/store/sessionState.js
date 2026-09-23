export function emptySessionData() {
  return {
    employees: [], stores: [], schedule: {}, scheduleWeeks: {}, attendance: {},
    feedbacks: [], shiftSwaps: [], shelves: [], shelfItems: [],
    adminLogs: [], activityLogs: [], auditLogs: [], aiConversations: [],
    authWarning: null, syncStatus: 'idle', lastSyncedAt: null,
    isInitializing: false, _bootstrapping: false, _pendingScheduleWrites: false,
    _scheduleRevision: 0, _realtimeChannel: null, _cleanupRealtimeTimers: null,
    realtimeStatus: 'disconnected'
  };
}
