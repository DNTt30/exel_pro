"""Real PostgreSQL authorization checks. Local disposable :55439 only."""
import json
from concurrent.futures import ThreadPoolExecutor
from test_stability_db import sql, actor, ROOT, DB

migration = (ROOT / 'supabase/migrations/20260928000001_employee_profile.sql').read_text(encoding='utf-8')
sql(migration)  # also verifies re-application and column privileges
sql(actor('100000002', "SELECT update_my_employee_profile('2004-02-29','University','Major','12/2026');"))
assert sql(actor('100000002', "SELECT university FROM get_employee_profiles('100000002')")).splitlines()[-1] == 'University'
assert sql(actor('100000003', "SELECT count(*) FROM get_employee_profiles('100000002')")).splitlines()[-1] == '0'
assert sql(actor('100000001', "SELECT count(*) FROM get_employee_profiles('100000002')")).splitlines()[-1] == '1'
assert sql(actor('100000001', "SELECT count(*) FROM get_employee_profiles('100000003')")).splitlines()[-1] == '0'
assert sql(actor('0', "SELECT count(*) FROM get_employee_profiles('100000003')")).splitlines()[-1] == '1'
assert sql(actor('100000002', 'SELECT count(*) FROM get_employee_profiles()')).splitlines()[-1] == '0'
for role in ['anon', 'authenticated']:
    sql(f'SET ROLE {role}; SELECT dob FROM employees;', error='permission denied')
    sql(f"SET ROLE {role}; SELECT set_verified_recovery_email('00000000-0000-0000-0000-000100000002',null,'bad@example.com');", error='permission denied')
sql(actor('100000002', "SELECT id,name,dept FROM employees LIMIT 1;"))
sql(actor('100000002', "SELECT update_my_employee_profile('2999-01-01',null,null,null);"), error='INVALID_DOB')
sql(actor('100000002', "SELECT update_my_employee_profile(null,repeat('a',161),null,null);"), error='PROFILE_TEXT_TOO_LONG')
sql(actor('100000002', 'SELECT update_my_employee_profile(null,null,null,null);'))
assert sql("SELECT dob IS NULL AND university IS NULL AND major IS NULL AND work_plan_until IS NULL FROM employees WHERE id='100000002'") == 't'
sql(actor('100000004', "UPDATE employees SET recovery_email='bypass@example.com' WHERE id='100000004';"), error='CURRENT_PASSWORD_REQUIRED')

uid = '00000000-0000-0000-0000-000100000002'
def rpc(name, args):
    return json.loads(sql(f'SET ROLE service_role; SELECT {name}({args});').splitlines()[-1])
with ThreadPoolExecutor(max_workers=6) as pool:
    results = list(pool.map(lambda _: rpc('begin_profile_email_change', f"'{uid}'")['code'], range(6)))
assert results.count('OK') == 5 and results.count('RATE_LIMITED') == 1
assert rpc('set_verified_recovery_email', f"'{uid}',null,' New@Example.com '")['code'] == 'OK'
assert sql("SELECT recovery_email FROM employees WHERE id='100000002'") == 'new@example.com'
assert rpc('set_verified_recovery_email', f"'{uid}',null,'attacker@example.com'")['code'] == 'EMAIL_CHANGED'
issued = rpc('issue_password_reset_otp', "'100000002',repeat('a',64)")
assert issued['code'] == 'OK'
assert rpc('set_verified_recovery_email', f"'{uid}','new@example.com','next@example.com'")['code'] == 'OK'
assert sql("SELECT count(*) FROM password_reset_otps WHERE emp_id='100000002'") == '0'
assert sql(f"SELECT status FROM password_reset_otp_requests WHERE id='{issued['id']}'") == 'failed'
assert rpc('issue_password_reset_otp', "'100000002',repeat('a',64)")['code'] == 'OK'
claimed = rpc('claim_password_reset_otp', "'100000002',repeat('a',64)")
assert claimed['code'] == 'OK'
assert rpc('set_verified_recovery_email', f"'{uid}','next@example.com','racing@example.com'")['code'] == 'RESET_IN_PROGRESS'
sql("UPDATE employees SET is_active=false WHERE id='100000002';")
assert rpc('begin_profile_email_change', f"'{uid}'")['code'] == 'PROFILE_NOT_FOUND'
sql(actor('100000002', 'SELECT update_my_employee_profile(null,null,null,null);'), error='PROFILE_NOT_FOUND')
print('PASS private field reads, self-only writes, nullable fields, server-only email, rate limit, OTP invalidation/race, disabled account:', DB)
