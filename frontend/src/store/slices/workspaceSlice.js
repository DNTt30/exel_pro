import * as api from '../../services/api';
import { DEFAULT_BRANDING, canConfigureWorkspace } from '../../utils/workspaceBranding';

export const createWorkspaceSlice = (set, get) => {
  let pendingLoad = null, generation = 0;
  return {
    workspaceBranding: { ...DEFAULT_BRANDING }, brandingStatus: 'idle', brandingError: '', brandingSaving: false,
    loadWorkspaceBranding: () => {
      if (pendingLoad) return pendingLoad;
      if (get().brandingSaving) return Promise.resolve();
      const current = ++generation;
      set({ brandingStatus: 'loading', brandingError: '' });
      pendingLoad = (async () => {
        try {
          const branding = await api.getWorkspaceBranding();
          if (current === generation) set({ workspaceBranding: branding, brandingStatus: 'ready' });
        } catch (error) {
          if (current === generation) set({ brandingStatus: 'error', brandingError: error.message });
        } finally { pendingLoad = null; }
      })();
      return pendingLoad;
    },
    updateWorkspaceBranding: async (draft, revision) => {
      if (!canConfigureWorkspace(get().user)) throw new Error('Chỉ Admin đơn vị được thay đổi cài đặt.');
      if (get().brandingSaving) throw new Error('Cài đặt đang được lưu.');
      if (get().brandingStatus !== 'ready') throw new Error('Hãy tải cài đặt hiện tại trước khi lưu.');
      const current = ++generation;
      set({ brandingSaving: true });
      try {
        const branding = await api.saveWorkspaceBranding(draft, revision);
        // This slice contains public identity only, safe across logout in this deployment.
        if (current === generation) set({ workspaceBranding: branding, brandingStatus: 'ready', brandingError: '' });
        return branding;
      } finally { set({ brandingSaving: false }); }
    },
  };
};
