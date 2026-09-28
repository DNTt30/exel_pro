"""Runs only in the disposable local cluster (:55439); never reads .env."""
import json
from concurrent.futures import ThreadPoolExecutor
from test_stability_db import sql, actor, DB, ROOT

sql((ROOT / 'docs/sql_password_reset_otps.sql').read_text(encoding='utf-8'))
assert (ROOT / 'docs/sql_password_reset_otps.sql').read_bytes() == (ROOT / 'supabase/migrations/20260927000000_password_reset_otps.sql').read_bytes()
good, bad = 'a' * 64, 'b' * 64
def rpc(name, args):
    return json.loads(sql(f"SET ROLE service_role; SELECT {name}({args});").splitlines()[-1])
def issue(emp='100000002'):
    return rpc('issue_password_reset_otp', f"'{emp}','{good}'")
def claim(emp='100000002', digest=good):
    return rpc('claim_password_reset_otp', f"'{emp}','{digest}'")
def finish(otp_id, success=True):
    return rpc('finish_password_reset_otp', f"'{otp_id}',{str(success).lower()}")

for role in ['anon','authenticated']:
    sql(f'SET ROLE {role}; SELECT * FROM password_reset_otps;', error='permission denied')
    sql(f"SET ROLE {role}; SELECT issue_password_reset_otp('100000002','{good}');", error='permission denied')
    sql(f"SET ROLE {role}; SELECT claim_password_reset_otp('100000002','{good}');", error='permission denied')
assert issue()['code'] == 'RECOVERY_EMAIL_MISSING'
# Staff write can be rejected silently by RLS; it must never persist.
sql(actor('100000002', "UPDATE employees SET recovery_email='attacker@gmail.com' WHERE id='100000002';"))
assert sql("SELECT coalesce(recovery_email,'empty') FROM employees WHERE id='100000002'") == 'empty'
sql(actor('100000001', "UPDATE employees SET recovery_email='Staff@Gmail.com' WHERE id='100000002';"))
assert sql("SELECT recovery_email FROM employees WHERE id='100000002'") == 'staff@gmail.com'
sql(actor('100000001', "UPDATE employees SET recovery_email='attacker@gmail.com' WHERE id='100000001';"), error='RECOVERY_EMAIL_REQUIRES_MANAGER')
sql("UPDATE employees SET recovery_email=id||'@gmail.com' WHERE id IN ('100000003','100000005');")

# Concurrent requests: exactly three accepted, one throttled; newest OTP only.
with ThreadPoolExecutor(max_workers=4) as pool:
    codes = [row['code'] for row in pool.map(lambda _: issue(), range(4))]
assert sorted(codes) == ['OK','OK','OK','RATE_LIMITED'], codes
assert sql("SELECT count(*) FROM password_reset_otps WHERE emp_id='100000002'") == '1'
with ThreadPoolExecutor(max_workers=5) as pool:
    codes = [row['code'] for row in pool.map(lambda _: claim(digest=bad), range(5))]
assert codes.count('OTP_INVALID') == 4 and codes.count('OTP_LOCKED') == 1, codes
assert claim()['code'] == 'OTP_LOCKED'

issued = issue('100000003')
with ThreadPoolExecutor(max_workers=2) as pool:
    results = list(pool.map(lambda _: claim('100000003'), range(2)))
assert sorted(r['code'] for r in results) == ['OK','OTP_USED']
assert issue('100000003')['code'] == 'RESET_IN_PROGRESS'
assert finish(issued['id'])['code'] == 'OK'
assert finish(issued['id'])['code'] == 'OK'
assert sql("SELECT count(*) FROM admin_logs WHERE action='PASSWORD_RESET_OTP' AND actor_id='100000003'") == '1'
assert sql("SELECT password_changed_at IS NOT NULL FROM employees WHERE id='100000003'") == 't'
assert sql("SELECT count(*) FROM password_reset_otps WHERE emp_id='100000003'") == '0'
assert sql("SELECT count(*) FROM password_reset_otp_requests WHERE emp_id='100000003'") == '1'
assert claim('100000003')['code'] == 'OTP_INVALID'
issue('100000003'); issue('100000003')
assert issue('100000003')['code'] == 'RATE_LIMITED'

issued = issue('100000005')
sql("UPDATE password_reset_otps SET expires_at=now() WHERE emp_id='100000005'")
assert claim('100000005')['code'] == 'OTP_EXPIRED'
issue('100000005')
sql("UPDATE employees SET recovery_email='changed@gmail.com' WHERE id='100000005'")
assert claim('100000005')['code'] == 'OTP_EXPIRED'
sql("UPDATE employees SET is_active=false WHERE id='100000005'")
assert issue('100000005')['code'] == 'EMPLOYEE_INACTIVE'
assert issue('999999999')['code'] == 'EMPLOYEE_NOT_FOUND'
assert issue('admin')['code'] == 'OK'
admin_claim = claim('admin')
assert admin_claim['code'] == 'OK'
assert finish(admin_claim['id'])['code'] == 'OK'
print('PASS OTP RLS, email authorization, concurrent rate/attempt limits, single use, expiry, changed email, admin, atomic completion audit', DB)
