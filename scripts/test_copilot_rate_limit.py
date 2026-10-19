"""Isolated local PostgreSQL test. Never reads .env or contacts production."""
import json
import os
import subprocess
import uuid
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor

ROOT = Path(__file__).resolve().parents[1]
DB = 'copilot_rate_' + uuid.uuid4().hex[:12]
BASE = [os.environ.get('STABILITY_PSQL', 'C:/Program Files/PostgreSQL/17/bin/psql.exe'), '-X', '-h', '127.0.0.1', '-p', os.environ.get('STABILITY_PG_PORT', '55442'), '-U', 'postgres', '-At', '-v', 'ON_ERROR_STOP=1']
def sql(query, db=DB, error=None):
    result = subprocess.run(BASE + ['-d', db], input=query, text=True, encoding='utf-8', capture_output=True)
    if error:
        assert result.returncode and error in result.stderr, result.stderr
    else:
        assert result.returncode == 0, result.stderr
    return result.stdout.strip().splitlines()[-1] if result.stdout.strip() else ''

sql(f'CREATE DATABASE {DB}', db='postgres')
for role in ['anon', 'authenticated', 'service_role']:
    sql(f'DO $$ BEGIN CREATE ROLE {role} NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;')
migration = (ROOT / 'supabase/migrations/20261019000000_copilot_rate_limit.sql').read_text(encoding='utf-8')
sql(migration)
sql(migration)
def consume(emp='100000001'):
    return json.loads(sql(f"SET ROLE service_role; SELECT consume_copilot_request('{emp}');"))

with ThreadPoolExecutor(max_workers=12) as pool:
    results = list(pool.map(lambda _: consume(), range(12)))
assert sum(row['allowed'] for row in results) == 1, results
assert all(1 <= row['retryAfter'] <= 3 for row in results if not row['allowed'])
assert consume('100000002')['allowed'], 'independent accounts must not block each other'
assert consume('admin')['allowed']
sql("UPDATE copilot_request_limits SET accepted_at=ARRAY[clock_timestamp()-interval '4 seconds'] WHERE employee_id='100000001';")
assert consume()['allowed'], 'cooldown expires'
sql("UPDATE copilot_request_limits SET accepted_at=ARRAY(SELECT clock_timestamp()-s*interval '4 seconds' FROM generate_series(1,10) s) WHERE employee_id='100000001';")
denied = consume()
assert not denied['allowed'] and 1 <= denied['retryAfter'] <= 20, denied
sql("UPDATE copilot_request_limits SET accepted_at=ARRAY[clock_timestamp()-interval '61 seconds'] WHERE employee_id='100000001';")
assert consume()['allowed'], 'rolling window expires'
assert sql("SELECT cardinality(accepted_at) FROM copilot_request_limits WHERE employee_id='100000001'") == '1'
for role in ['anon', 'authenticated']:
    sql(f"SET ROLE {role}; SELECT consume_copilot_request('admin');", error='permission denied')
    sql(f'SET ROLE {role}; SELECT * FROM copilot_request_limits;', error='permission denied')
    sql(f'SET ROLE {role}; DELETE FROM copilot_request_limits;', error='permission denied')
sql("SET ROLE service_role; SELECT consume_copilot_request('');", error='INVALID_COPILOT_IDENTITY')
print('COPILOT_RATE_LIMIT_OK: concurrent workers, account isolation, cooldown, rolling window, replay migration and private grants')
print('LOCAL_TEST_DATABASE', DB)
