"""Local PostgreSQL checks. No project secrets or remote database access."""
import os
import json
os.environ.setdefault('STABILITY_PG_PORT', '55442')
os.environ.setdefault('PGCLIENTENCODING', 'UTF8')
from test_operational_hardening import sql, actor, ROOT, DB, save

migration = (ROOT / 'supabase/migrations/20261017000001_practical_workflows.sql').read_text(encoding='utf-8')
sql(migration)
sql(migration)
scope_migration = (ROOT / 'supabase/migrations/20261019000001_copilot_activity_scope.sql').read_text(encoding='utf-8')
sql(scope_migration)
sql(scope_migration)
admin, sm, staff, other = '0', '100000001', '100000002', '100000003'
week = '2099-01-05'
def value(who, query):
    return sql(actor(who, query)).splitlines()[-1]
def config(who=staff, store='A'):
    return json.loads(value(who, f"SELECT get_registration_deadline('{store}','{week}');"))
def update(cfg, snapshot, who=sm, all_weeks=False, error=None):
    query = f"SELECT save_registration_deadline('A','{week}','{json.dumps(cfg)}',{str(all_weeks).lower()},{snapshot['defaultRevision']},{snapshot['weekRevision']});"
    if error:
        return sql(actor(who, query), error=error)
    return json.loads(value(who, query))

snapshot = config()
assert snapshot['config']['time'] == '18:00'
sql(actor(other, f"SELECT get_registration_deadline('A','{week}');"), error='DEADLINE_FORBIDDEN')
update({'isForceClosed': True}, snapshot, who=staff, error='DEADLINE_FORBIDDEN')
closed = update({'isForceClosed': True}, snapshot)
assert config()['config']['isForceClosed'] is True
update({'isForceOpen': True}, snapshot, error='DEADLINE_CONFLICT')
registered = {'T2': {'shift': '6-14', 'registered': True, 'confirmed': False}}
sql(actor(staff, save(staff, week, registered)), error='REGISTRATION_CLOSED')
sql(actor(staff, f"INSERT INTO schedules(emp_id,week_date,shifts) VALUES('{staff}','{week}','{json.dumps(registered)}');"), error='REGISTRATION_CLOSED')
opened = update({'isForceOpen': True}, closed)
sql(actor(staff, save(staff, week, registered)))
closed = update({'isForceClosed': True}, opened)
sql(actor(staff, f"UPDATE schedules SET shifts='{{}}' WHERE emp_id='{staff}' AND week_date='{week}';"), error='REGISTRATION_CLOSED')
sql(actor(staff, f"DELETE FROM schedules WHERE emp_id='{staff}' AND week_date='{week}';"), error='REGISTRATION_CLOSED')
sql(actor(sm, save(staff, week, {'T2': '6-14'}, 1)))
common = update({'dayKey': 'T4', 'time': '20:00'}, closed, all_weeks=True)
assert common['weekRevision'] == 0 and common['defaultRevision'] == 1
assert config()['config']['dayKey'] == 'T4'
update({'customDeadline': '2099-01-02T18:00:00+07:00'}, common, all_weeks=True, error='INVALID_DEADLINE')
update({'isForceOpen': True, 'isForceClosed': True}, common, error='INVALID_DEADLINE')
sql(actor(staff, save(staff, '2000-01-03', registered)), error='REGISTRATION_CLOSED')
assert int(sql("SELECT count(*) FROM admin_logs WHERE action='registration.deadline_saved'")) == 4
print('PASS shared deadlines, revisions, server clock expiry, raw/checked writes, manager scope and audit', flush=True)

value(staff, "SELECT mark_notifications_read(ARRAY['event:1','event:1']);")
assert value(staff, 'SELECT count(*) FROM notification_receipts;') == '1'
assert value(other, 'SELECT count(*) FROM notification_receipts;') == '0'
assert value(staff, "SELECT count(*) FROM notification_receipts WHERE event_key='event:2';") == '0'
sql(actor(staff, "INSERT INTO notification_receipts VALUES('100000003','forge',now());"), error='permission denied')
sql('SET ROLE anon; SELECT * FROM notification_receipts;', error='permission denied')
sql(actor(staff, 'SELECT mark_notifications_read(ARRAY[NULL]::text[]);'), error='INVALID_NOTIFICATION_KEYS')
print('PASS receipts private, persistent, idempotent and event-version specific', flush=True)

def chat(who, store, user=None):
    return actor(who, f"INSERT INTO ai_conversations(conversation_id,store_id,user_id,user_message) VALUES('test','{store}','{user or who}','test question');")
sql(chat(staff, 'A'))
sql(chat(other, 'B'))
assert value(admin, 'SELECT current_emp_id();') == 'admin'
sql(chat(admin, 'ALL', 'admin'))
sql(chat(admin, 'A,B', 'admin'))
sql(chat(admin, 'ALL', '000000000'), error='row-level security')
assert value(sm, 'SELECT count(*) FROM ai_conversations;') == '1'
assert value(staff, 'SELECT count(*) FROM ai_conversations;') == '1'
assert value(admin, 'SELECT count(*) FROM ai_conversations;') == '4'
sql(chat(staff, 'B'), error='row-level security')
sql(chat(staff, 'A', other), error='row-level security')
sql('SET ROLE anon; SELECT * FROM ai_conversations;', error='permission denied')
sql(actor(sm, "DELETE FROM ai_conversations;"), error='permission denied')
print('PASS conversation privacy, store scopes, no forged actors, no anonymous history access', flush=True)
sql(chat(admin, 'B, A', 'admin'))
assert value(admin, "SELECT count(*) FROM ai_conversation_activity WHERE store_ids && ARRAY['A'];") == '3'
assert value(admin, "SELECT count(*) FROM ai_conversation_activity WHERE store_ids && ARRAY['B','A'];") == '4'
assert value(sm, "SELECT count(*) FROM ai_conversation_activity WHERE store_ids && ARRAY['A'];") == '1', 'mixed store rows must still require all permissions'
assert value(staff, 'SELECT count(*) FROM ai_conversation_activity;') == '1'
sql('SET ROLE anon; SELECT * FROM ai_conversation_activity;', error='permission denied')
sql(actor(sm, 'DELETE FROM ai_conversation_activity;'), error='permission denied')
print('PASS normalized activity store arrays, exact scoped counts, unchanged RLS and read-only view', flush=True)
print('PRACTICAL_WORKFLOWS_OK', DB, flush=True)
