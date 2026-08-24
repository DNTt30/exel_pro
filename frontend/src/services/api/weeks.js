import { db } from './client';

function mapScheduleWeek(row) {
  if (!row) return null;
  return {
    id: row.id,
    storeId: row.store_id,
    weekDate: row.week_date,
    status: row.status || 'draft',
    submittedBy: row.submitted_by || '',
    submittedAt: row.submitted_at || '',
    reviewedBy: row.reviewed_by || '',
    reviewedAt: row.reviewed_at || '',
    reviewNote: row.review_note || ''
  };
}

export async function getScheduleWeeks() {
  try {
    const { data, error } = await db().from('schedule_weeks').select('*').order('week_date', { ascending: false }).limit(250);
    if (error) {
      if (/does not exist|schema cache|relation/i.test(error.message || '')) return [];
      console.error('Lỗi lấy trạng thái tuần:', error);
      return [];
    }
    return (data || []).map(mapScheduleWeek);
  } catch {
    return [];
  }
}

export async function upsertScheduleWeek(row) {
  const payload = {
    store_id: row.storeId,
    week_date: row.weekDate,
    status: row.status || 'draft',
    submitted_by: row.submittedBy || null,
    submitted_at: row.submittedAt || null,
    reviewed_by: row.reviewedBy || null,
    reviewed_at: row.reviewedAt || null,
    review_note: row.reviewNote || null
  };
  const { data, error } = await db()
    .from('schedule_weeks')
    .upsert(payload, { onConflict: 'store_id,week_date' })
    .select()
    .single();
  if (error) throw error;
  return mapScheduleWeek(data);
}


