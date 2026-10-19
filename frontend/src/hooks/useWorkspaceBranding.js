import { useStore } from '../store/useStore';
import { DEFAULT_BRANDING } from '../utils/workspaceBranding';

export function useWorkspaceBranding() {
  return useStore(s => s.workspaceBranding) || DEFAULT_BRANDING;
}
