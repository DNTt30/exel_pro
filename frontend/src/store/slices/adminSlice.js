import * as api from '../../services/api';
import { userIsManager, assertCanManageStore, assertCanManageStaff } from '../guards';
import { canPickStore } from '../../lib/authSession';
import { redact, describeDiff, clientMeta, capJson } from '../../utils/appLogs';
import { normalizeStaffingConfig, normalizeStoreDemand } from '../../data/constants';

export const createAdminSlice = (set, get) => ({
  adminLogs: [],
  activityLogs: [],
  auditLogs: [],
  aiConversations: [],
  stores: [],

  loadAdminLogs: async () => {
    if (!userIsManager(get().user)) return [];
    const user = get().user;
    const opts = canPickStore(user) || !user?.dept ? {} : { storeId: user.dept };
    const [activity, audit, ai, legacy] = await Promise.all([
      api.getActivityLogs(opts),
      api.getAuditLogs(opts),
      api.getAiConversations(opts),
      api.getAdminLogs()
    ]);
    set({
      activityLogs: activity,
      auditLogs: audit,
      aiConversations: ai,
      adminLogs: activity.length ? activity.map(a => ({
        id: a.id,
        actorId: a.userId,
        actorName: a.metadata?.actorName || a.userId,
        action: a.action,
        target: a.entityId,
        detail: a.description,
        createdAt: a.createdAt
      })) : legacy
    });
    return activity;
  },

  appendAdminLog: async (action, target = '', detail = '', extra = {}) => {
    try {
      const user = get().user;
      const meta = clientMeta();
      const storeId = extra.storeId || user?.dept || '';
      const description = extra.description || String(detail || '');
      const entityId = extra.entityId || extra.resourceId || String(target || '');
      const entityType = extra.entityType || extra.resourceType || '';
      const activity = {
        storeId,
        userId: extra.userId || user?.id || '',
        action,
        category: extra.category || 'activity',
        entityType,
        entityId,
        description,
        metadata: { actorName: user?.name || extra.userId || '', ...(extra.metadata || {}) },
        ...meta
      };
      const shouldAudit = extra.oldData !== undefined || extra.newData !== undefined;
      const [savedActivity, savedAudit] = await Promise.all([
        api.addActivityLog(activity),
        shouldAudit
          ? api.addAuditLog({
            storeId,
            actorId: extra.userId || user?.id || '',
            action,
            resourceType: extra.resourceType || entityType || 'unknown',
            resourceId: entityId,
            oldData: capJson(redact(extra.oldData ?? null)),
            newData: capJson(redact(extra.newData ?? null)),
            metadata: { description, actorName: user?.name || '' },
            ...meta
          })
          : Promise.resolve(null),
        api.addAdminLog({
          actorId: user?.id || extra.userId || '',
          actorName: user?.name || extra.userId || '',
          action,
          target: entityId,
          detail: description
        }).catch(() => null)
      ]);
      set(state => ({
        activityLogs: savedActivity ? [savedActivity, ...(state.activityLogs || [])].slice(0, 300) : state.activityLogs,
        auditLogs: savedAudit ? [savedAudit, ...(state.auditLogs || [])].slice(0, 300) : state.auditLogs,
        adminLogs: [{
          id: savedActivity?.id || 'local_' + Date.now(),
          actorId: activity.userId,
          actorName: user?.name || activity.userId,
          action,
          target: entityId,
          detail: description,
          createdAt: savedActivity?.createdAt || new Date().toISOString()
        }, ...(state.adminLogs || [])].slice(0, 300)
      }));
    } catch (e) { console.warn('appendAdminLog:', e?.message || e); }
  },

  logAiTurn: async (payload) => {
    const user = get().user;
    const saved = await api.addAiConversation({
      conversationId: payload.conversationId || `ai_${user?.id || 'anon'}`,
      storeId: payload.storeId || user?.dept || '',
      userId: user?.id || '',
      userMessage: payload.userMessage,
      assistantResponse: payload.assistantResponse,
      intent: payload.intent,
      model: payload.model,
      latencyMs: payload.latencyMs,
      contextUsed: capJson(payload.contextUsed),
      error: payload.error || null
    });
    if (saved) set(state => ({ aiConversations: [saved, ...(state.aiConversations || [])].slice(0, 200) }));
    return saved;
  },

  addStore: async (store) => {
    assertCanManageStore(get());
    const payload = {
      ...store,
      staffing: normalizeStaffingConfig(store.staffing),
      demand: normalizeStoreDemand(store.demand)
    };
    await api.addStore(payload);
    set((state) => ({ stores: [...state.stores, payload] }));
    get().appendAdminLog('CREATE_STORE', payload.id, payload.name, {
      resourceType: 'store',
      resourceId: payload.id,
      storeId: payload.id,
      oldData: null,
      newData: { id: payload.id, name: payload.name, region: payload.region },
      description: `Thêm cửa hàng ${payload.id} · ${payload.name}`
    });
  },
  updateStore: async (id, updates) => {
    assertCanManageStaff(get());
    const prev = get().stores.find(s => s.id === id) || { id };
    const payload = { ...updates };
    if (payload.staffing) payload.staffing = normalizeStaffingConfig(payload.staffing);
    if (payload.demand) payload.demand = normalizeStoreDemand(payload.demand);
    await api.updateStore(id, payload);
    set((state) => ({
      stores: state.stores.map(s => s.id === id ? { ...s, ...payload } : s)
    }));
    const next = { ...prev, ...payload };
    get().appendAdminLog('UPDATE_STORE', id, describeDiff(prev, next) || payload.name || id, {
      resourceType: 'store',
      resourceId: id,
      storeId: id,
      oldData: { name: prev.name, region: prev.region, staffing: prev.staffing, demand: prev.demand },
      newData: { name: next.name, region: next.region, staffing: next.staffing, demand: next.demand },
      description: describeDiff(
        { name: prev.name, region: prev.region, staffing: prev.staffing, demand: prev.demand },
        { name: next.name, region: next.region, staffing: next.staffing, demand: next.demand }
      ) || `Sửa cửa hàng ${id}`
    });
  },
  deleteStore: async (id) => {
    assertCanManageStore(get());
    const prev = get().stores.find(s => s.id === id) || { id };
    await api.deleteStore(id);
    set((state) => ({
      stores: state.stores.filter(s => s.id !== id)
    }));
    get().appendAdminLog('DELETE_STORE', id, `Xóa cửa hàng ${prev.name || id}`, {
      resourceType: 'store',
      resourceId: id,
      storeId: id,
      oldData: { id: prev.id, name: prev.name, region: prev.region },
      newData: null,
      description: `Xóa cửa hàng ${id} · ${prev.name || ''}`
    });
  }
});
