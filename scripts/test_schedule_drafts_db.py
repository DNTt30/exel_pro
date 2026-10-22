"""Local PostgreSQL integration using the actual auth/RLS and schedule migrations.

Requires a disposable server on 127.0.0.1 (STABILITY_PG_PORT, default 55439).
Creates a unique database through the existing harness. Never reads .env.
"""
import json
import os
from concurrent.futures import ThreadPoolExecutor
os.environ.setdefault('PGCLIENTENCODING', 'UTF8')
from test_operational_hardening import sql, actor, ROOT, DB

sql((ROOT / 'supabase/migrations/20261020000000_schedule_drafts.sql').read_text(encoding='utf-8'))
sm, staff, other = '100000001', '100000002', '100000003'
week = '2099-01-05'
payload = {'schedule': {staff: {'T2': '6-14'}}, 'sourceSchedule': {staff: {'T2': {'shift': '6-14', 'registered': True, 'confirmed': False}}}, 'constraints': {'maxShiftsPerEmployee': 6}}
literal = json.dumps(payload).replace("'", "''")
def save(revision=0, store='A', date=week, body=literal):
    return f"SELECT save_schedule_draft('{store}','{date}','{body}',{revision});"
def value(who, query):
    return sql(actor(who, query)).splitlines()[-1]

before = sql("SELECT md5(coalesce(jsonb_agg(to_jsonb(s) ORDER BY emp_id,week_date)::text,'')) FROM schedules s;")
weeks_before = sql("SELECT md5(coalesce(jsonb_agg(to_jsonb(w) ORDER BY store_id,week_date)::text,'')) FROM schedule_weeks w;")
sql('SET ROLE anon; SELECT * FROM schedule_drafts;', error='permission denied')
sql('SET ROLE anon; ' + save(), error='permission denied')
sql(actor(staff, save()), error='DRAFT_FORBIDDEN')
sql(actor(other, save()), error='DRAFT_FORBIDDEN')
sql(actor(sm, save(store='B')), error='DRAFT_FORBIDDEN')
assert json.loads(value(sm, save()))['revision'] == 1
assert value(sm, 'SELECT count(*) FROM schedule_drafts;') == '1'
assert value(staff, 'SELECT count(*) FROM schedule_drafts;') == '0'
assert value(other, 'SELECT count(*) FROM schedule_drafts;') == '0'
sql(actor(sm, 'UPDATE schedule_drafts SET revision=100;'), error='permission denied')
sql(actor(sm, 'DELETE FROM schedule_drafts;'), error='permission denied')
sql(actor(sm, save()), error='DRAFT_CONFLICT')
assert json.loads(value(sm, save(1)))['revision'] == 2
sql(actor(sm, save(2, body='{}')), error='INVALID_DRAFT')
sql(actor(sm, save(date='2099-01-06')), error='check constraint')
bad = {**payload, 'schedule': {other: {'T2': '6-14'}}}
sql(actor(sm, save(2, body=json.dumps(bad))), error='DRAFT_EMPLOYEE_OUT_OF_SCOPE')
bad_source = {**payload, 'sourceSchedule': {other: {'T2': '6-14'}}}
sql(actor(sm, save(2, body=json.dumps(bad_source))), error='DRAFT_EMPLOYEE_OUT_OF_SCOPE')

def concurrent(_):
    try:
        value(sm, save(2))
        return 'saved'
    except AssertionError as error:
        assert 'DRAFT_CONFLICT' in str(error)
        return 'conflict'
with ThreadPoolExecutor(max_workers=2) as pool:
    assert sorted(pool.map(concurrent, range(2))) == ['conflict', 'saved']
assert value(sm, 'SELECT revision FROM schedule_drafts;') == '3'
assert value(sm, 'SELECT count(*) FROM schedule_drafts;') == '1'
assert before == sql("SELECT md5(coalesce(jsonb_agg(to_jsonb(s) ORDER BY emp_id,week_date)::text,'')) FROM schedules s;")
assert weeks_before == sql("SELECT md5(coalesce(jsonb_agg(to_jsonb(w) ORDER BY store_id,week_date)::text,'')) FROM schedule_weeks w;")
print('SCHEDULE_DRAFTS_OK: auth/RLS, scope, CAS concurrency, one record, unchanged schedules/week status', DB, flush=True)
