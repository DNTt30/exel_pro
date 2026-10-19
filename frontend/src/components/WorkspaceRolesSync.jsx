import { useEffect } from 'react';
import { useStore } from '../store/useStore';

export default function WorkspaceRolesSync() {
  const userId = useStore(s => s.user?.id);
  const epoch = useStore(s => s._sessionEpoch);
  const load = useStore(s => s.loadWorkspaceRoles);
  useEffect(() => {
    if (!userId) return;
    void load();
    const refresh = () => { if (document.visibilityState === 'visible') void load(); };
    document.addEventListener('visibilitychange', refresh);
    return () => document.removeEventListener('visibilitychange', refresh);
  }, [userId, epoch, load]);
  return null;
}
