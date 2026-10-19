import { db } from './client';

export async function getEmployeeNotifications() {
  const { data, error } = await db().from('employee_notifications')
    .select('id,week_date,kind,title,message,updated_at').order('updated_at', { ascending: false }).limit(50);
  if (error) throw error;
  return (data || []).map(row => ({ id: `${row.id}:${row.updated_at}`, title: row.title, desc: row.message, week: row.week_date }));
}

export async function getReadNotificationIds() {
  const ids = [];
  for (let start = 0; ; start += 500) {
    const { data, error } = await db().from('notification_receipts').select('event_key').order('event_key').range(start, start + 499);
    if (error) throw error;
    ids.push(...(data || []).map(row => row.event_key));
    if (!data || data.length < 500) return ids;
  }
}
export async function markNotificationsRead(ids) {
  const unique = [...new Set(ids)];
  for (let start = 0; start < unique.length; start += 100) {
    const { error } = await db().rpc('mark_notifications_read', { p_keys: unique.slice(start, start + 100) });
    if (error) throw error;
  }
}
