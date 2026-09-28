"""Run with --bundle --production-shape; uses only disposable localhost PostgreSQL."""
from test_stability_db import sql, actor, ROOT, DB
from build_db_catchup import build, OUTPUT
import sys

assert OUTPUT.read_text(encoding='utf-8') == build(), 'Stale generated SQL'
if '--production-shape' in sys.argv:
    assert sql("SELECT version||':'||(shifts->>'T2')||':'||(shifts->>'T3')||':'||(shifts->>'T4') FROM schedules WHERE emp_id='900000001'") == '7:6-14:off:'
    assert sql("SELECT status FROM schedule_weeks WHERE store_id='LEGACY'") == 'approved'
    assert sql("SELECT emp_name FROM feedbacks WHERE emp_id='900000001'") == 'Legacy staff'
    print('PASS pre-upgrade schedule, week state and feedback name backfill', flush=True)
assert sql('SELECT count(*) FROM login_lookup_v2(\'100000002\')') == '1'
sql(actor('100000002', 'SELECT ensure_app_profile_v2(); SELECT mark_my_password_changed();'))
assert sql(actor('100000002', 'SELECT emp_id FROM get_credential_state()')).splitlines()[-1] == '100000002'
sql(actor('100000001', """
INSERT INTO store_shelves(id,store_id,code,due_date)
VALUES('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','A','fixture','2026-10-01');
SELECT count(*) FROM replace_shelf_items_atomic('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','A',
'[{"product_name":"Fixture","sku":"SKU1","qty":1,"expiry_date":"2026-10-01","expiry_date_2":"2026-10-02"}]','100000001');
"""))
assert sql("SELECT sku FROM shelf_items WHERE shelf_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'") == 'SKU1'
assert sql("SELECT name=emp_name FROM feedbacks LIMIT 1") == 't'
# The old published client and new client can both write names during rollout.
sql(actor('100000002', """INSERT INTO feedbacks(emp_id,name,dept,date,shift,hours)
VALUES('100000002','Legacy name','A','2026-10-01','6-14',8);"""))
assert sql("SELECT emp_name FROM feedbacks WHERE name='Legacy name'") == 'Legacy name'

# Populate an unused OTP challenge and snapshot all rows touched by the bundle.
sql("""INSERT INTO password_reset_otp_requests(id,emp_id) VALUES('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','fixture');
INSERT INTO password_reset_otps(id,emp_id,otp_code) VALUES('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','fixture',repeat('a',64));""")
tables = ['employees','schedules','schedule_weeks','feedbacks','store_shelves','shelf_items',
          'app_profiles','password_reset_otps','password_reset_otp_requests']
def snapshot():
    return {table: sql(f'SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text),\'[]\') FROM {table} t') for table in tables}
before = snapshot()
sql(OUTPUT.read_text(encoding='utf-8'))
assert snapshot() == before, 'Rerun changed existing rows'
sql((ROOT / 'docs/sql_database_catchup_checks.sql').read_text(encoding='utf-8'))
print('PASS lookup, credential RPC, legacy/new feedback names, shelf replacement, rerun preserves rows', flush=True)

# A late failure must roll back the entire copy/paste, including earlier DDL.
broken = OUTPUT.read_text(encoding='utf-8').replace(
    'COMMIT;', "CREATE TABLE public.catchup_rollback_probe(id integer);\nSELECT 1/0;\nCOMMIT;")
sql(broken, error='division by zero')
assert sql("SELECT to_regclass('public.catchup_rollback_probe') IS NULL") == 't'
assert snapshot() == before
print('PASS transaction rollback; retained local database:', DB)
