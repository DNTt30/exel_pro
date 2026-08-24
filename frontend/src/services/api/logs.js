import { db } from './client';

export async function getAdminLogs() {
  try {
    const { data, error } = await db().from('admin_logs').select('*').order('created_at', { ascending: false }).limit(300);
    if (error) {
      console.error('Lỗi lấy nhật ký quản lý:', error);
      return [];
    }
    return (data || []).map(row => ({
      id: row.id,
      actorId: row.actor_id,
      actorName: row.actor_name,
      action: row.action,
      target: row.target || '',
      detail: row.detail || '',
      createdAt: row.created_at
    }));
  } catch (err) {
    console.error('Lỗi lấy nhật ký quản lý:', err);
    return [];
  }
}

export async function addAdminLog(entry) {
  const { data, error } = await db().from('admin_logs').insert([{
    actor_id: entry.actorId,
    actor_name: entry.actorName,
    action: entry.action,
    target: entry.target || '',
    detail: entry.detail || ''
  }]).select().single();
  if (error) throw error;
  return {
    id: data.id,
    actorId: data.actor_id,
    actorName: data.actor_name,
    action: data.action,
    target: data.target || '',
    detail: data.detail || '',
    createdAt: data.created_at
  };
}

function mapActivityLog(row) {
  if (!row) return null;
  return {
    id: row.id,
    storeId: row.store_id || '',
    userId: row.user_id || '',
    action: row.action,
    category: row.category || 'activity',
    entityType: row.entity_type || '',
    entityId: row.entity_id || '',
    description: row.description || '',
    ipAddress: row.ip_address || '',
    userAgent: row.user_agent || '',
    metadata: row.metadata || null,
    createdAt: row.created_at
  };
}

function mapAuditLog(row) {
  if (!row) return null;
  return {
    id: row.id,
    storeId: row.store_id || '',
    actorId: row.actor_id || '',
    action: row.action,
    resourceType: row.resource_type || '',
    resourceId: row.resource_id || '',
    oldData: row.old_data || null,
    newData: row.new_data || null,
    metadata: row.metadata || null,
    ipAddress: row.ip_address || '',
    userAgent: row.user_agent || '',
    createdAt: row.created_at
  };
}

function mapAiConversation(row) {
  if (!row) return null;
  return {
    id: row.id,
    conversationId: row.conversation_id,
    storeId: row.store_id || '',
    userId: row.user_id || '',
    userMessage: row.user_message || '',
    assistantResponse: row.assistant_response || '',
    intent: row.intent || '',
    model: row.model || '',
    tokensUsed: row.tokens_used,
    latencyMs: row.latency_ms,
    contextUsed: row.context_used || null,
    error: row.error || '',
    createdAt: row.created_at
  };
}

export async function addActivityLog(entry) {
  try {
    const { data, error } = await db().from('activity_logs').insert([{
      store_id: entry.storeId || null,
      user_id: entry.userId || null,
      action: entry.action,
      category: entry.category || 'activity',
      entity_type: entry.entityType || null,
      entity_id: entry.entityId || null,
      description: entry.description || null,
      ip_address: entry.ipAddress || null,
      user_agent: entry.userAgent || null,
      metadata: entry.metadata || null
    }]).select().single();
    if (error) {
      if (/does not exist|schema cache|relation/i.test(error.message || '')) return null;
      console.warn('activity_logs:', error.message);
      return null;
    }
    return mapActivityLog(data);
  } catch {
    return null;
  }
}

export async function addAuditLog(entry) {
  try {
    const { data, error } = await db().from('audit_logs').insert([{
      store_id: entry.storeId || null,
      actor_id: entry.actorId || null,
      action: entry.action,
      resource_type: entry.resourceType,
      resource_id: entry.resourceId || null,
      old_data: entry.oldData ?? null,
      new_data: entry.newData ?? null,
      metadata: entry.metadata || null,
      ip_address: entry.ipAddress || null,
      user_agent: entry.userAgent || null
    }]).select().single();
    if (error) {
      if (/does not exist|schema cache|relation/i.test(error.message || '')) return null;
      console.warn('audit_logs:', error.message);
      return null;
    }
    return mapAuditLog(data);
  } catch {
    return null;
  }
}

export async function addAiConversation(entry) {
  try {
    const { data, error } = await db().from('ai_conversations').insert([{
      conversation_id: entry.conversationId,
      store_id: entry.storeId || null,
      user_id: entry.userId || null,
      user_message: entry.userMessage || null,
      assistant_response: entry.assistantResponse || null,
      intent: entry.intent || null,
      model: entry.model || null,
      tokens_used: entry.tokensUsed ?? null,
      latency_ms: entry.latencyMs ?? null,
      context_used: entry.contextUsed || null,
      error: entry.error || null
    }]).select().single();
    if (error) {
      if (/does not exist|schema cache|relation/i.test(error.message || '')) return null;
      console.warn('ai_conversations:', error.message);
      return null;
    }
    return mapAiConversation(data);
  } catch {
    return null;
  }
}

export async function getActivityLogs(opts = {}) {
  try {
    let q = db().from('activity_logs').select('*').order('created_at', { ascending: false }).limit(opts.limit || 300);
    if (opts.storeId) q = q.eq('store_id', opts.storeId);
    if (opts.category) q = q.eq('category', opts.category);
    const { data, error } = await q;
    if (error) return [];
    return (data || []).map(mapActivityLog);
  } catch {
    return [];
  }
}

export async function getAuditLogs(opts = {}) {
  try {
    let q = db().from('audit_logs').select('*').order('created_at', { ascending: false }).limit(opts.limit || 300);
    if (opts.storeId) q = q.eq('store_id', opts.storeId);
    const { data, error } = await q;
    if (error) return [];
    return (data || []).map(mapAuditLog);
  } catch {
    return [];
  }
}

export async function getAiConversations(opts = {}) {
  try {
    let q = db().from('ai_conversations').select('*').order('created_at', { ascending: false }).limit(opts.limit || 200);
    if (opts.storeId) q = q.eq('store_id', opts.storeId);
    if (opts.userId) q = q.eq('user_id', opts.userId);
    const { data, error } = await q;
    if (error) return [];
    return (data || []).map(mapAiConversation);
  } catch {
    return [];
  }
}

