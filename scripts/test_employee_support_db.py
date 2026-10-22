"""Disposable local PostgreSQL tests. No .env, production connection or visible windows."""
import os
import subprocess
from pathlib import Path
import json
import sys

ROOT = Path(__file__).resolve().parents[1]
BIN = Path('C:/Program Files/PostgreSQL/17/bin')
DATA = ROOT / 'artifacts/pg-employee-support-20261022'
os.environ['STABILITY_PG_PORT'] = '55448'
os.environ['PGCLIENTENCODING'] = 'UTF8'

def run(args):
    # postgres inherits pipe handles on Windows; use a file so pg_ctl can return.
    output = ROOT / 'artifacts/employee-support-pg-command.log'
    with output.open('w', encoding='utf-8') as log:
        result = subprocess.run([str(x) for x in args], stdout=log, stderr=log,
                                creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0), timeout=90)
    if result.returncode:
        raise RuntimeError(output.read_text(encoding='utf-8', errors='replace'))
    return output.read_text(encoding='utf-8', errors='replace')

if not (DATA / 'PG_VERSION').exists():
    run([BIN / 'initdb.exe', '-D', DATA, '-U', 'postgres', '-A', 'trust', '--no-locale', '-E', 'UTF8'])
if '--existing' not in sys.argv:
    run([BIN / 'pg_ctl.exe', '-D', DATA, '-l', DATA / 'test.log', '-o', '-h 127.0.0.1 -p 55448', '-w', 'start'])
try:
    from test_operational_hardening import sql, actor, DB
    sql((ROOT / 'supabase/migrations/20261022000002_employee_support.sql').read_text(encoding='utf-8'))
    sm, staff, other = '100000001', '100000002', '100000003'
    def value(who, query):
        return sql(actor(who, query)).splitlines()[-1]
    def obj(who, query):
        return json.loads(value(who, query))
    sql('SET ROLE anon; SELECT * FROM employee_help_requests;', error='permission denied')
    sql("SET ROLE anon; SELECT save_my_onboarding('profile_viewed',true);", error='permission denied')
    sql(actor(staff, "INSERT INTO employee_onboarding(emp_id) VALUES('100000003');"), error='permission denied')
    assert obj(staff, "SELECT save_my_onboarding('profile_viewed',true);")['steps'] == {'profile_viewed': True}
    obj(staff, "SELECT save_my_onboarding('profile_understood',true);")
    sql(actor(staff, "SELECT save_my_onboarding('fake_step',true);"), error='INVALID_STEP')
    roster = obj(staff, 'SELECT employee_start_roster();')
    assert [row['id'] for row in roster] == [staff]
    sql(actor(staff, f"SELECT assign_employee_mentor('{staff}','{sm}');"), error='HELP_FORBIDDEN')
    sql(actor(sm, f"SELECT assign_employee_mentor('{other}','{sm}');"), error='HELP_FORBIDDEN')
    sql(actor(sm, f"SELECT assign_employee_mentor('{staff}','{other}');"), error='MENTOR_OUT_OF_STORE')
    sql(actor(sm, f"SELECT assign_employee_mentor('{staff}','{sm}');"))
    assert obj(staff, 'SELECT employee_start_roster();')[0]['mentorId'] == sm
    key = '00000000-0000-0000-0000-000000000001'
    create = f"SELECT create_employee_help('{key}','A','handbook','How to find the approved recipe?','Selected excerpt only');"
    sql(actor(other, create), error='HELP_FORBIDDEN')
    row = obj(staff, create)
    assert obj(staff, create)['id'] == row['id']
    assert value(staff, 'SELECT count(*) FROM employee_help_requests;') == '1'
    assert value(other, 'SELECT count(*) FROM employee_help_requests;') == '0'
    assert value(other, 'SELECT count(*) FROM employee_help_events;') == '0'
    def act(who, revision, action, reply=''):
        return actor(who, f"SELECT act_employee_help('{row['id']}',{revision},'{action}','{reply}');")
    sql(act(staff, 1, 'answer', 'Unauthorized answer'), error='HELP_FORBIDDEN')
    sql(act(other, 1, 'start'), error='HELP_FORBIDDEN')
    sql(act(staff, 1, 'resolve'), error='HELP_INVALID_TRANSITION')
    sql(act(sm, 1, 'start'))
    sql(act(sm, 1, 'answer', 'Stale answer'), error='HELP_CONFLICT')
    sql(act(sm, 2, 'answer', 'Go to the approved handbook'))
    sql(act(sm, 3, 'resolve'), error='HELP_FORBIDDEN')
    sql(act(staff, 3, 'resolve'))
    sql(act(sm, 4, 'answer', 'Cannot overwrite resolved'), error='HELP_INVALID_TRANSITION')
    sql(act(staff, 4, 'reopen'))
    assert value(staff, 'SELECT status FROM employee_help_requests;') == 'new'
    assert value(staff, 'SELECT count(*) FROM employee_help_events;') == '5'
    sql(actor(staff, "UPDATE employee_help_requests SET status='resolved';"), error='permission denied')
    sql(actor(sm, "DELETE FROM employee_help_events;"), error='permission denied')
    sql(actor(staff, "SELECT save_employee_answer_feedback('answer1','B','unclear');"), error='HELP_FORBIDDEN')
    sql(actor(staff, "SELECT save_employee_answer_feedback('answer1','A','unclear');"))
    sql(actor(staff, "SELECT save_employee_answer_feedback('answer1','A','understood');"))
    assert value(sm, 'SELECT count(*) FROM employee_answer_feedback;') == '1'
    assert value(other, 'SELECT count(*) FROM employee_answer_feedback;') == '0'
    assert value(sm, 'SELECT count(*) FROM employee_onboarding_events;') == '3'
    print('EMPLOYEE_SUPPORT_DB_OK: real RLS, roles, store scope, idempotency, lifecycle, conflict, immutable audit, self-report; ' + DB, flush=True)
finally:
    run([BIN / 'pg_ctl.exe', '-D', DATA, '-m', 'fast', '-w', 'stop'])
