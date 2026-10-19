"""Local-only integration, including the existing baseline tests. Never reads .env.
STABILITY_PG_PORT=55442 python scripts/test_operational_hardening.py
"""
import sys
import json
from concurrent.futures import ThreadPoolExecutor

sys.argv.append('--bundle')
from test_stability_db import sql, actor, ROOT, DB

# Apply the actual profile privacy migration BEFORE adding workspace_role_id.
# Otherwise broad baseline grants hide missing SELECT on newly added columns.
sql((ROOT / 'supabase/migrations/20260928000001_employee_profile.sql').read_text(encoding='utf-8'))
sql((ROOT / 'supabase/migrations/20260928000002_employee_skills.sql').read_text(encoding='utf-8'))
for name in ['20261012000000_workspace_branding.sql', '20261012000001_workspace_roles.sql']:
    sql((ROOT / 'supabase/migrations' / name).read_text(encoding='utf-8'))
sql(actor('0', 'SELECT id,workspace_role_id FROM employees LIMIT 1;'), error='permission denied')
sql((ROOT / 'supabase/migrations/20261014000000_workspace_role_read_grant.sql').read_text(encoding='utf-8'))
sql(actor('0', 'SELECT id,workspace_role_id FROM employees LIMIT 1;'))
sql(actor('100000002', 'SELECT id,workspace_role_id FROM employees LIMIT 1;'))
sql(actor('100000002', 'SELECT dob FROM employees LIMIT 1;'), error='permission denied')
assert sql("SELECT has_column_privilege('anon','employees','workspace_role_id','SELECT')") == 'f'
print('PASS column grants after profile privacy migration; private fields and anonymous access remain denied', flush=True)
migration = ROOT / 'supabase/migrations/20261012000002_operational_hardening.sql'
sql(migration.read_text(encoding='utf-8'))
sql(migration.read_text(encoding='utf-8'))

night_migration = ROOT / 'supabase/migrations/20261014000001_schedule_rest_and_nights.sql'
sql(night_migration.read_text(encoding='utf-8'))
sql(night_migration.read_text(encoding='utf-8'))

def save(employee, week, shifts, version=0, reason=None):
    literal = json.dumps(shifts).replace("'", "''")
    reason_sql = 'NULL' if reason is None else "'" + reason.replace("'", "''") + "'"
    return f"SELECT save_employee_schedule_checked('{week}','{employee}','{literal}',{version},{reason_sql});"

admin = '000000000'
sm = '100000001'
staff = '100000002'
other = '100000003'
sql(actor(admin, f"UPDATE employees SET type='STPT',role='STPT',max_h=23 WHERE id='{staff}';"))
week = '2027-01-04'
sql(actor(sm, save(staff, week, {'T2': '6-14'})))
before = sql('SELECT count(*) FROM server_audit_events')
sql(actor(sm, save(staff, week, {'T2': '6-14/10-18'}, 1)), error='SCHEDULE_OVERLAP')
assert sql('SELECT count(*) FROM server_audit_events') == before, 'failed writes leave audit rows'
bad_rest = {'T2': '14-22', 'T3': '6-14'}
sql(actor(sm, save(staff, week, bad_rest, 1)), error='SCHEDULE_RULES')
sql(actor(admin, save(staff, week, bad_rest, 1)), error='SCHEDULE_RULES')
sql(actor(sm, save(staff, week, bad_rest, 1, 'Test reason long enough')), error='OVERRIDE_NOT_ALLOWED')
sql(actor(admin, save(staff, week, bad_rest, 1, 'short')), error='OVERRIDE_NOT_ALLOWED')
sql(actor(admin, save(staff, week, bad_rest, 1, 'Urgent local test coverage')))
assert sql("SELECT count(*) FROM server_audit_events WHERE action='schedule.override'") == '1'
sql(actor(admin, save(staff, week, {'T2': '6-14', 'T3': '6-14', 'T4': '6-14'}, 2)), error='SCHEDULE_RULES')
sql(actor(sm, f"UPDATE schedules SET shifts='{{\"T2\":\"6-14\",\"T3\":\"6-14\",\"T4\":\"6-14\"}}' WHERE emp_id='{staff}' AND week_date='{week}';"), error='SCHEDULE_RULES')
assert sql(f"SELECT version FROM schedules WHERE emp_id='{staff}' AND week_date='{week}'") == '2'
sql(actor(sm, save(other, week, {'T2': '6-14'})), error='PERMISSION_DENIED')
sql(actor(sm, save(staff, week, {'BadDay': '6-14'}, 2)), error='INVALID_DAY')
sql(actor(sm, save(staff, week, {'T2': ['6-14', '14-22']}, 2)), error='INVALID_SHIFT_CELL')
for invalid in [{'shift': '6-14', 'confirmed': 'false'}, {'shift': '6-14', 'registered': None}, {'shift': '6-14', 'status': 3}]:
    sql(actor(sm, save(staff, week, {'T2': invalid}, 2)), error='INVALID_SHIFT_CELL')
# Bulk writes must roll back every employee, including audit and notifications.
bulk_week = '2027-04-05'
rows = json.dumps([
    {'week_date': bulk_week, 'emp_id': '100000005', 'shifts': {'T2': '6-14'}, 'expect_version': 0},
    {'week_date': bulk_week, 'emp_id': staff, 'shifts': bad_rest, 'expect_version': 0},
])
sql(actor(sm, f"SELECT * FROM upsert_schedules_bulk_checked('{rows}');"), error='SCHEDULE_RULES')
assert sql(f"SELECT count(*) FROM schedules WHERE week_date='{bulk_week}'") == '0'
assert sql(f"SELECT count(*) FROM employee_notifications WHERE week_date='{bulk_week}'") == '0'
print('PASS server rules, explicit Admin override, no SM bypass, atomic audit/rollback', flush=True)

# Availability is distinct from confirmed work, and blank is distinct from OFF.
available = {d: {'shift': '6-14', 'confirmed': False, 'registered': True} for d in ['T2','T3','T4','T5','T6','T7','CN']}
sql(actor(staff, save(staff, '2027-01-11', available)))
sql(actor(sm, save(staff, '2027-01-18', {'T2': '', 'T3': 'off', 'T4': 'HC'})))
assert sql(f"SELECT shifts->>'T2'||':'||(shifts->>'T3') FROM schedules WHERE emp_id='{staff}' AND week_date='2027-01-18'") == ':off'
sql(actor(sm, save(staff, '2027-01-25', {'CN': '22-6'})))
sql(actor(sm, save(staff, '2027-02-01', {'T2': '6-14'})), error='SCHEDULE_RULES')
print('PASS availability, HC, blank/OFF and previous-week rest', flush=True)

# New policy applies to raw writes, checked writes and either boundary week.
sql(actor(admin, f"UPDATE employees SET type='STFT',role='STFT',max_h=48 WHERE id='{staff}';"))
night_week = '2027-07-05'
three = {'T2': '22-6', 'T3': '22-6', 'T4': '22-6'}
four = {**three, 'T5': '22-6'}
sql(actor(sm, save(staff, night_week, three)))
sql(actor(sm, save(staff, night_week, four, 1)), error='CONSECUTIVE_NIGHTS')
sql(actor(sm, f"UPDATE schedules SET shifts='{json.dumps(four)}' WHERE emp_id='{staff}' AND week_date='{night_week}';"), error='CONSECUTIVE_NIGHTS')
sql(actor(admin, save(staff, night_week, four, 1, 'Emergency night coverage with review')))
assert sql("SELECT metadata->'violations' @> '[{\"code\":\"CONSECUTIVE_NIGHTS\",\"limit\":3}]'::jsonb FROM server_audit_events WHERE action='schedule.override' ORDER BY created_at DESC LIMIT 1") == 't'
sql(actor(sm, save(staff, '2027-08-02', {'T6': '22-6', 'T7': '22-6', 'CN': '22-6'})))
sql(actor(sm, save(staff, '2027-08-09', {'T2': '22-6'})), error='CONSECUTIVE_NIGHTS')
sql(actor(sm, save(staff, '2027-09-13', {'T2': '22-6', 'T3': '22-6'})))
sql(actor(sm, save(staff, '2027-09-06', {'T7': '22-6', 'CN': '22-6'})), error='CONSECUTIVE_NIGHTS')
sql(actor(sm, save(staff, '2027-10-04', {'T2': '14-22', 'T3': '9-17'})), error='INSUFFICIENT_REST')
sql(actor(sm, save(staff, '2027-10-04', {'T2': '14-22', 'T3': '10-18'})))
sql(actor(sm, save(staff, '2027-10-11', {d: '6-10' for d in ['T2','T3','T4','T5','T6','T7','CN']})), error='MAX_WORK_DAYS')
sql(actor(admin, f"UPDATE employees SET type='STPT',role='STPT',max_h=23 WHERE id='{staff}';"))
print('PASS 12-hour boundary, three-night limit, adjacent weeks, direct writes and audited Admin exception', flush=True)

# Audit data comes from server identity; clients cannot forge/delete it.
sql(actor(sm, f"INSERT INTO attendance(emp_id,work_date,actual_hours,updated_by) VALUES('{staff}','2027-01-04',8,'forged-admin');"))
assert sql("SELECT actor_id FROM server_audit_events WHERE resource_type='attendance' ORDER BY created_at DESC LIMIT 1") == sm
sql(actor(sm, f"INSERT INTO attendance(emp_id,work_date,actual_hours) VALUES('{staff}','2027-01-05',25);"), error='INVALID_ATTENDANCE')
sql(actor(sm, "INSERT INTO server_audit_events(actor_id,action,resource_type,resource_id) VALUES('admin','forged','x','x');"), error='permission denied')
sql(actor(admin, 'DELETE FROM server_audit_events;'), error='permission denied')
assert sql(actor(staff, "SELECT count(*) FROM get_attendance_audited('2027-01-01','2027-01-31') WHERE emp_id<>'100000002';")).splitlines()[-1] == '0'
assert sql(actor(sm, "SELECT count(*) FROM get_attendance_audited('2026-09-01','2027-01-31') WHERE emp_id='100000003';")).splitlines()[-1] == '0'
assert int(sql("SELECT count(*) FROM server_audit_events WHERE action='payroll.data_read'")) == 2
assert sql(actor(other, 'SELECT count(*) FROM employee_notifications')).splitlines()[-1] == '0'
assert int(sql(actor(staff, 'SELECT count(*) FROM employee_notifications')).splitlines()[-1]) > 0
print('PASS audit authenticity, input bounds, payroll read scope and private notifications', flush=True)

locked_week = '2027-05-03'
sql(actor(sm, save(staff, locked_week, {'T2': '6-14'})))
sql(actor(sm, f"INSERT INTO schedule_weeks(store_id,week_date,status) VALUES('A','{locked_week}','pending');"))
sql(actor(sm, f"UPDATE schedule_weeks SET status='approved' WHERE store_id='A' AND week_date='{locked_week}';"), error='PERMISSION_DENIED')
sql(actor(admin, f"UPDATE schedule_weeks SET status='approved' WHERE store_id='A' AND week_date='{locked_week}';"))
sql(actor(admin, save(staff, locked_week, bad_rest, 1, 'An override cannot unlock a week')), error='WEEK_LOCKED')
assert sql(actor(staff, f"SELECT count(*) FROM employee_notifications WHERE week_date='{locked_week}' AND kind='schedule_approved';")).splitlines()[-1] == '1'
assert sql(actor(other, f"SELECT count(*) FROM employee_notifications WHERE week_date='{locked_week}';")).splitlines()[-1] == '0'
print('PASS approval scope, locked-week protection and approval notifications', flush=True)

def concurrent(query):
    try:
        sql(actor(sm, query))
        return 'saved'
    except AssertionError as error:
        assert 'SCHEDULE_RULES' in str(error), str(error)
        return 'blocked'

with ThreadPoolExecutor(max_workers=2) as pool:
    outcomes = list(pool.map(concurrent, [save(staff, '2027-03-01', {'CN': '22-6'}), save(staff, '2027-03-08', {'T2': '6-14'})]))
assert sorted(outcomes) == ['blocked', 'saved'], outcomes
print('PASS concurrent adjacent-week writes serialize; exactly one invalid pair blocked', flush=True)
print('OPERATIONAL_HARDENING_OK', DB, flush=True)
