import { canConfigureWorkspace } from '../../utils/workspaceBranding';

export const createScheduleOverrideSlice = (set, get) => {
  let resolvePending;
  return {
    scheduleOverrideRequest: null,
    requestScheduleOverride: (error) => {
      if (!canConfigureWorkspace(get().user)) return Promise.resolve(null);
      if (resolvePending) resolvePending(null);
      return new Promise(resolve => {
        resolvePending = resolve;
        set({ scheduleOverrideRequest: { violations: error.violations || [], epoch: get()._sessionEpoch } });
      });
    },
    finishScheduleOverride: reason => {
      const request = get().scheduleOverrideRequest;
      const valid = request && request.epoch === get()._sessionEpoch && canConfigureWorkspace(get().user);
      const resolve = resolvePending; resolvePending = null;
      set({ scheduleOverrideRequest: null });
      resolve?.(valid ? reason : null);
    },
  };
};
