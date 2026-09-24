"""Jev authorization/atomicity checks in the isolated stability database only."""
import json
from test_stability_db import sql, actor, DB

swap = '33333333-3333-3333-3333-333333333333'
week = '2026-11-02'
sql(actor('100000001', f"SELECT save_employee_schedule('{week}','100000002','{{\"T2\":\"6-14\"}}',0);"))
sql(actor('100000001', f"SELECT save_employee_schedule('{week}','100000005','{{\"T2\":\"14-22\"}}',0);"))
sql(actor('100000002', f"""INSERT INTO shift_swaps(id,week_date,store,from_emp_id,from_day,from_shift,to_emp_id,to_day,to_shift)
 VALUES('{swap}','{week}','A','100000002','T2','6-14','100000005','T2','14-22');"""))
sql(actor('100000005', f"UPDATE shift_swaps SET status='rejected' WHERE id='{swap}';"))
assert sql(f"SELECT status FROM shift_swaps WHERE id='{swap}'") == 'rejected'
swap = '44444444-4444-4444-4444-444444444444'
sql(actor('100000002', f"""INSERT INTO shift_swaps(id,week_date,store,from_emp_id,from_day,from_shift,to_emp_id,to_day,to_shift)
 VALUES('{swap}','{week}','A','100000002','T2','6-14','100000005','T2','14-22');"""))
sql(actor('100000005', f"UPDATE shift_swaps SET status='pending_manager' WHERE id='{swap}';"))
staff = json.loads(sql("SELECT jsonb_agg(jsonb_build_object('id',id,'type',type,'dept',dept,'max_h',max_h,'is_active',is_active) ORDER BY id) FROM employees WHERE id IN ('100000002','100000005');"))
snapshot = json.dumps({'employees': staff, 'versions': {week: {'100000002': 1, '100000005': 1}}, 'shifts': {week: {'100000002': {'T2': '6-14'}, '100000005': {'T2': '14-22'}}}})
call = f"SELECT jev_approve_swap('{swap}','{snapshot}',0,0.99,0.99,'jev-latest');"
sql(actor('100000005', call), error='permission denied')
sql(actor('100000001', call), error='permission denied')
sql(actor('100000001', "INSERT INTO jev_auto_approval_settings VALUES('A',true,0.95,0.95,'jev-latest',now());"), error='permission denied')
assert sql('SET ROLE service_role;' + call).splitlines()[-1] == 'f'
sql("INSERT INTO jev_auto_approval_settings VALUES('A',true,0.95,0.95,'jev-latest',now());")
assert sql('SET ROLE service_role;' + call.replace(',0,0.99,', ',61,0.99,')).splitlines()[-1] == 'f'
assert sql('SET ROLE service_role;' + call.replace(',0.99,0.99,', ',0.5,0.99,')).splitlines()[-1] == 'f'
sql("UPDATE employees SET max_h=49 WHERE id='100000002';")
assert sql('SET ROLE service_role;' + call).splitlines()[-1] == 'f'
sql("UPDATE employees SET max_h=48 WHERE id='100000002';")
sql(f"UPDATE schedules SET version=2 WHERE week_date='{week}' AND emp_id='100000002';")
assert sql('SET ROLE service_role;' + call).splitlines()[-1] == 'f'
sql(f"UPDATE schedules SET version=1 WHERE week_date='{week}' AND emp_id='100000002';")
sql(f"UPDATE schedules SET shifts='{{\"T2\":\"6-14\",\"T3\":\"22-6\"}}' WHERE week_date='{week}' AND emp_id='100000002';")
assert sql('SET ROLE service_role;' + call).splitlines()[-1] == 'f'
sql(f"UPDATE schedules SET shifts='{{\"T2\":\"6-14\"}}' WHERE week_date='{week}' AND emp_id='100000002';")
sql(actor('100000001', f"INSERT INTO schedule_weeks(store_id,week_date,status) VALUES('A','{week}','pending');"))
sql('SET ROLE service_role;' + call, error='WEEK_LOCKED')
sql(actor('100000004', f"UPDATE schedule_weeks SET status='rejected' WHERE store_id='A' AND week_date='{week}';"))
sql("""CREATE FUNCTION fail_jev_second_write() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN IF NEW.emp_id='100000005' THEN RAISE EXCEPTION 'TEST_SECOND_WRITE'; END IF; RETURN NEW; END; $$;
CREATE TRIGGER fail_jev_second_write BEFORE UPDATE ON schedules FOR EACH ROW EXECUTE FUNCTION fail_jev_second_write();""")
sql('SET ROLE service_role;' + call, error='TEST_SECOND_WRITE')
assert sql(f"SELECT shifts->>'T2' FROM schedules WHERE week_date='{week}' AND emp_id='100000002';") == '6-14'
assert sql(f"SELECT status FROM shift_swaps WHERE id='{swap}'") == 'pending_manager'
sql('DROP TRIGGER fail_jev_second_write ON schedules;')
assert sql('SET ROLE service_role;' + call).splitlines()[-1] == 't'
assert sql('SET ROLE service_role;' + call).splitlines()[-1] == 'f'
assert sql(f"SELECT shifts->>'T2' FROM schedules WHERE week_date='{week}' AND emp_id='100000002';") == '14-22'
assert sql("SELECT count(*) FROM jev_decisions WHERE task='shift_swap_commit';") == '1'
print('PASS service-only auto-approval, calibration gate, snapshot changes, lock, rollback, exactly-once audit', flush=True)

shelf = '55555555-5555-5555-5555-555555555555'
sql(actor('100000001', f"INSERT INTO store_shelves(id,store_id,code,assignee_id) VALUES('{shelf}','A','TEST','100000002');"))
item = json.dumps([{'product_name': 'Test', 'qty': 5, 'expiry_date': '2026-09-24', 'expiry_time': '10:00', 'average_sales_per_hour': 1, 'triage_policy': {'canDiscount': True, 'discountWindowHours': 2}}])
save = f"SELECT count(*) FROM replace_shelf_items_atomic('{shelf}','A','{item}','100000002');"
assert sql(actor('100000002', save)).splitlines()[-1] == '1'
assert sql(f"SELECT expiry_time::text FROM shelf_items WHERE shelf_id='{shelf}';") == '10:00:00'
sql(actor('100000002', save.replace('10:00', '99:00')), error='out of range')
assert sql(f"SELECT count(*) FROM shelf_items WHERE shelf_id='{shelf}';") == '1'
sql(actor('100000003', save), error='SHELF_NOT_FOUND')
assert sql(actor('100000002', save.replace(item, '[]'))).splitlines()[-1] == '0'
assert sql(f"SELECT count(*) FROM shelf_items WHERE shelf_id='{shelf}';") == '0'
print('PASS staff shelf save, hour expiry persistence, invalid input rollback, foreign store denial, empty replace', DB, flush=True)
