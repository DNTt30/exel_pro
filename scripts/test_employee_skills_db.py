"""Skill column/permissions and unchanged private profiles; isolated localhost only."""
from test_stability_db import sql, actor, ROOT, DB

migration = (ROOT / 'supabase/migrations/20260928000002_employee_skills.sql').read_text(encoding='utf-8')
sql(migration)
assert sql("SELECT skills = '{}'::text[] FROM employees WHERE id='100000002'") == 't'
sql(actor('100000001', "UPDATE employees SET skills=ARRAY['NIGHT_READY'] WHERE id='100000002';"))
assert sql(actor('100000002', "SELECT skills FROM employees WHERE id='100000002'")).splitlines()[-1] == '{NIGHT_READY}'
# A regular employee cannot certify themselves; an SM cannot edit another store.
sql(actor('100000002', "UPDATE employees SET skills='{}' WHERE id='100000002';"))
assert sql("SELECT skills FROM employees WHERE id='100000002'") == '{NIGHT_READY}'
sql(actor('100000001', "UPDATE employees SET skills=ARRAY['NIGHT_READY'] WHERE id='100000003';"))
assert sql("SELECT skills FROM employees WHERE id='100000003'") == '{}'
sql("SET ROLE anon; SELECT skills FROM employees;", error='permission denied')
sql(actor('100000001', 'SELECT dob FROM employees;'), error='permission denied')
sql(actor('100000004', "UPDATE employees SET skills=ARRAY['NIGHT_READY'] WHERE id='100000003';"))
assert sql("SELECT skills FROM employees WHERE id='100000003'") == '{NIGHT_READY}'
print('PASS skill defaults, idempotence, manager scope, employee self-certification denied, private profiles preserved:', DB)
