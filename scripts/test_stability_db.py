"""Run migration and transaction checks only on an isolated local PostgreSQL.

Requires a disposable server at 127.0.0.1:55439 (never reads .env).
Creates a uniquely named test database; intentionally retains it for inspection.
"""
from pathlib import Path
import os
import subprocess
import uuid
import sys
from concurrent.futures import ThreadPoolExecutor

ROOT = Path(__file__).resolve().parents[1]
PSQL = os.environ.get('STABILITY_PSQL', 'C:/Program Files/PostgreSQL/17/bin/psql.exe')
DB = 'ofc_stability_test_' + uuid.uuid4().hex[:12]
BASE = [PSQL, '-X', '-h', '127.0.0.1', '-p', '55439', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1', '-At']


def sql(source, *, db=DB, error=None):
    result = subprocess.run(BASE + ['-d', db], input=source, text=True,
                            encoding='utf-8', capture_output=True)
    if error:
        assert result.returncode and error in result.stderr, result.stdout + result.stderr
    elif result.returncode:
        raise AssertionError(result.stdout + result.stderr)
    return result.stdout.strip()


def actor(employee, query):
    identity = '00000000-0000-0000-0000-' + employee.zfill(12)
    return f"SET ROLE authenticated; SET request.jwt.claim.sub='{identity}';\n{query}"


sql(f'CREATE DATABASE {DB}', db='postgres')
sql("""
DO $$ BEGIN CREATE ROLE anon NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE authenticated NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE SCHEMA auth;
CREATE TABLE auth.users(id uuid PRIMARY KEY, email text, raw_user_meta_data jsonb DEFAULT '{}');
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid;
$$;
CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT '{}'::jsonb; $$;
GRANT USAGE ON SCHEMA auth TO authenticated, anon;
GRANT EXECUTE ON FUNCTION auth.uid(), auth.jwt() TO authenticated, anon;
""")
if '--legacy' in sys.argv:
    sql((ROOT / 'supabase/migrations/20260919000000_baseline_schema.sql').read_text(encoding='utf-8'))
    # Emulate the actual pre-baseline role table variant, then load the repo's
    # original policies/triggers instead of inventing an upgrade fixture.
    sql('DROP TABLE user_store_roles;')
    for name in ['sql_admin_logs.sql','sql_app_logs.sql','sql_phase1_security.sql']:
        sql((ROOT / 'legacy_sql_scripts' / name).read_text(encoding='utf-8'))
    print('Loaded legacy Phase 1 schema and policies', flush=True)
for migration in sorted((ROOT / 'supabase/migrations').glob('*.sql')):
    sql('BEGIN;\n' + migration.read_text(encoding='utf-8') + '\nCOMMIT;')
    print('MIGRATED', migration.name, flush=True)

sql("""
INSERT INTO stores(id,name) VALUES ('A','A'),('B','B');
INSERT INTO employees(id,name,dept,type,role) VALUES
  ('100000001','SM A','A','SM','SM'), ('100000002','Staff A','A','STFT','STFT'),
  ('100000003','Staff B','B','STFT','STFT'), ('100000004','AM','A,B','OFC','AM'),
  ('100000005','Staff A2','A','STFT','STFT');
INSERT INTO auth.users(id,email) SELECT ('00000000-0000-0000-0000-'||lpad(id,12,'0'))::uuid,id||'@ofc.app' FROM employees;
INSERT INTO auth.users(id,email) VALUES ('00000000-0000-0000-0000-000000000000','admin@ofc.app');
INSERT INTO attendance(emp_id,work_date,actual_hours) VALUES ('100000002','2026-09-21',0),('100000003','2026-09-21',8);
""")
assert sql(actor('100000001', 'SELECT count(*) FROM attendance;')).splitlines()[-1] == '1'
sql(actor('100000001', "INSERT INTO employees(id,name,dept,type,role,job_title) VALUES('100000006','New staff','A','STPT','STPT','STPT');"))
sql(actor('100000001', "UPDATE employees SET type='STFT',role='STFT',job_title='STFT' WHERE id='100000006';"))
sql(actor('100000001', "UPDATE employees SET role='SM' WHERE id='100000006';"),error='AUTHORITY_FIELDS_REQUIRE')
sql(actor('100000001', "UPDATE employees SET role='AM' WHERE id='100000001';"), error='AUTHORITY_FIELDS_REQUIRE')
sql(actor('100000001', "SELECT admin_reset_employee_password_flag('100000003');"), error='PERMISSION_DENIED')
sql(actor('100000002', "SELECT save_employee_schedule('2026-09-21','100000002','{\"T2\":\"6-14\"}',0);"))
sql(actor('100000002', "SELECT save_employee_schedule('2026-09-21','100000002','{}',0);"), error='CONFLICT')
sql(actor('100000002', "SELECT save_employee_schedule('2026-09-21','100000003','{}',0);"), error='row-level security')
sql(actor('100000002', "SELECT save_employee_schedule('2026-09-22','100000002','{}',0);"), error='INVALID_WEEK')
sql(actor('100000002', "SELECT save_employee_schedule('2026-09-21','100000002','{}');"), error='EXPECTED_VERSION_REQUIRED')
print('PASS scoped RLS, authority fields, version conflicts, input checks', flush=True)

# Same expected version from two connections: exactly one success, one conflict.
def simultaneous_write(_):
    try:
        sql(actor('100000002', "SELECT save_employee_schedule('2026-09-21','100000002','{\"T2\":\"6-14\"}',1);"))
        return 'saved'
    except AssertionError as failure:
        assert 'CONFLICT' in str(failure), str(failure)
        return 'conflict'
with ThreadPoolExecutor(max_workers=2) as pool:
    assert sorted(pool.map(simultaneous_write, range(2))) == ['conflict', 'saved']

sql(actor('100000001', """SELECT upsert_schedules_bulk('[
  {"week_date":"2026-09-21","emp_id":"100000002","shifts":{"T2":"off"},"expect_version":2},
  {"week_date":"2026-09-21","emp_id":"100000005","shifts":{},"expect_version":99}
]');"""), error='CONFLICT')
assert sql("SELECT shifts->>'T2' FROM schedules WHERE emp_id='100000002'") == '6-14'
print('PASS concurrent clients and bulk transaction rollback', flush=True)

sql(actor('100000001', "SELECT save_employee_schedule('2026-09-21','100000005','{\"T2\":\"14-22\"}',0);"))
swap_id = '11111111-1111-1111-1111-111111111111'
sql(actor('100000002', f"""INSERT INTO shift_swaps(id,week_date,store,from_emp_id,from_day,from_shift,to_emp_id,to_day,to_shift)
VALUES('{swap_id}','2026-09-21','A','100000002','T2','6-14','100000005','T2','14-22');"""))
sql(actor('100000002', f"UPDATE shift_swaps SET status='approved' WHERE id='{swap_id}';"), error='PERMISSION_DENIED')
sql(actor('100000005', f"UPDATE shift_swaps SET status='pending_manager' WHERE id='{swap_id}';"))

def week_status(user, status):
    return actor(user, f"""INSERT INTO schedule_weeks(store_id,week_date,status) VALUES('A','2026-09-21','{status}')
    ON CONFLICT(store_id,week_date) DO UPDATE SET status=excluded.status;""")

sql(week_status('100000001','pending'))
sql(week_status('100000001','approved'), error='PERMISSION_DENIED')
sql(week_status('100000004','approved'))
sql(actor('100000001', "DELETE FROM schedule_weeks WHERE store_id='A' AND week_date='2026-09-21';"), error='WEEK_LOCKED')
sql(actor('100000001', f"SELECT approve_shift_swap_atomic_v2('{swap_id}',NULL);"), error='WEEK_LOCKED')
assert sql(f"SELECT status FROM shift_swaps WHERE id='{swap_id}'") == 'pending_manager'
assert sql("SELECT shifts->>'T2' FROM schedules WHERE emp_id='100000002'") == '6-14'
sql(week_status('100000004','rejected'))
# Force the second schedule write to fail; the first write and status must roll back.
sql("""CREATE FUNCTION fail_second_write() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN IF NEW.emp_id='100000005' THEN RAISE EXCEPTION 'TEST_SECOND_WRITE_FAILED'; END IF; RETURN NEW; END; $$;
CREATE TRIGGER fail_second_write BEFORE UPDATE ON schedules FOR EACH ROW EXECUTE FUNCTION fail_second_write();""")
sql(actor('100000001', f"SELECT approve_shift_swap_atomic_v2('{swap_id}',NULL);"), error='TEST_SECOND_WRITE_FAILED')
assert sql("SELECT shifts->>'T2' FROM schedules WHERE emp_id='100000002'") == '6-14'
assert sql(f"SELECT status FROM shift_swaps WHERE id='{swap_id}'") == 'pending_manager'
sql('DROP TRIGGER fail_second_write ON schedules;')
sql(actor('100000001', f"SELECT approve_shift_swap_atomic_v2('{swap_id}',NULL);"))
assert sql("SELECT shifts->>'T2' FROM schedules WHERE emp_id='100000002'") == '14-22'
assert sql("SELECT shifts->>'T2' FROM schedules WHERE emp_id='100000005'") == '6-14'
sql(actor('100000001', f"SELECT approve_shift_swap_atomic_v2('{swap_id}',NULL);"))
assert sql("SELECT version FROM schedules WHERE emp_id='100000002'") == '3'
print('PASS week upserts, role checks, atomic swap, rollback, idempotence', flush=True)

# A legacy covering cell also locks removal when its receiving store is approved.
sql(actor('0', "SELECT save_employee_schedule('2026-09-28','100000002','{\"T2\":\"6-14_B\"}',0);"))
sql(actor('0', "INSERT INTO schedule_weeks(store_id,week_date,status) VALUES('B','2026-09-28','pending');"))
sql(actor('0', "SELECT save_employee_schedule('2026-09-28','100000002','{}',1);"), error='WEEK_LOCKED')
sql(actor('100000001', "DELETE FROM attendance WHERE emp_id='100000002' AND work_date='2026-09-21';"))
assert sql("SELECT count(*) FROM attendance WHERE emp_id='100000002'") == '0'
print('PASS legacy covering lock and attendance deletion', flush=True)

feedback_id = '22222222-2222-2222-2222-222222222222'
sql(actor('100000002', f"INSERT INTO feedbacks(id,emp_id,dept,status) VALUES('{feedback_id}','100000002','A','pending');"))
correction = ''''{"week":"2026-10-05","empId":"100000002","day":"T2","shiftCode":"6-14","expect_version":0}'::jsonb'''
resolve_feedback = f"SELECT resolve_feedback_atomic_v2('{feedback_id}','approved','agreed',{correction});"
# SELECT FOR UPDATE also applies UPDATE RLS, hiding the employee's own row.
sql(actor('100000002',resolve_feedback), error='FEEDBACK_NOT_FOUND')
sql("""CREATE FUNCTION fail_feedback_resolution() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'TEST_RESOLUTION_FAILED'; END; $$;
CREATE TRIGGER fail_feedback_resolution BEFORE UPDATE ON feedbacks FOR EACH ROW EXECUTE FUNCTION fail_feedback_resolution();""")
sql(actor('100000001',resolve_feedback), error='TEST_RESOLUTION_FAILED')
assert sql("SELECT count(*) FROM schedules WHERE week_date='2026-10-05'") == '0'
assert sql(f"SELECT status FROM feedbacks WHERE id='{feedback_id}'") == 'pending'
sql('DROP TRIGGER fail_feedback_resolution ON feedbacks;')
sql(actor('100000001',resolve_feedback))
assert sql("SELECT shifts->>'T2' FROM schedules WHERE week_date='2026-10-05'") == '6-14'
assert sql(f"SELECT status FROM feedbacks WHERE id='{feedback_id}'") == 'approved'
sql(actor('100000001',resolve_feedback))
assert sql("SELECT version FROM schedules WHERE week_date='2026-10-05'") == '1'
print('PASS feedback correction transaction, rollback, authorization, idempotence', flush=True)
print('Database retained for inspection:', DB, flush=True)
