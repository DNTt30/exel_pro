"""Run only against the disposable local cluster used by test_schedule_drafts_db."""
import json
from test_schedule_drafts_db import sql,actor as staff_actor,ROOT,DB,save,staff,before,weeks_before

# PostgreSQL roles are cluster-wide; each disposable database gets fresh grants.
sql('DO $$ BEGIN CREATE ROLE authenticator NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;')
migration=(ROOT/'supabase/migrations/20261021000000_schedule_bot_scope.sql').read_text(encoding='utf-8')
sql(migration.replace('CREATE ROLE schedule_bot NOLOGIN NOINHERIT;', 'DO $$ BEGIN CREATE ROLE schedule_bot NOLOGIN NOINHERIT; EXCEPTION WHEN duplicate_object THEN NULL; END $$;'))
sql((ROOT/'supabase/migrations/20261021000001_schedule_bot_week_types.sql').read_text(encoding='utf-8'))
def actor(employee,query): return staff_actor(employee,query).replace('SET ROLE authenticated;', 'SET ROLE schedule_bot;')
bot='900000001'
uid='00000000-0000-0000-0000-000900000001'
sql(f"INSERT INTO auth.users(id,email) VALUES('{uid}','schedule-bot-test@agents.invalid'); INSERT INTO schedule_bot_scopes(user_id,store_id) VALUES('{uid}','A');")
def value(query): return sql(actor(bot,query)).splitlines()[-1]
assert sql(staff_actor(bot,'SELECT current_emp_id() IS NULL;')).splitlines()[-1]=='t'
context=json.loads(value("SELECT get_schedule_bot_context('A','2099-01-05');"))
assert context['employees'] and all(e['dept']=='A' for e in context['employees'])
assert all(set(e)<=set(['id','name','dept','type','role','maxH','skills','isActive']) for e in context['employees'])
sql(actor(bot,"SELECT get_schedule_bot_context('B','2099-01-05');"),error='BOT_SCOPE_FORBIDDEN')
sql(actor(bot,"SELECT get_schedule_bot_context('A','2099-01-06');"),error='INVALID_WEEK')
assert json.loads(value(save(3)))['revision']==4
sql(actor(bot,save(0,store='B')),error='DRAFT_FORBIDDEN')
for table in ['employees','schedules','schedule_weeks','attendance']:
    sql(actor(bot,f'SELECT count(*) FROM {table};'),error='permission denied')
sql(actor(bot,f"SELECT save_employee_schedule_checked('2099-01-05','{staff}','{{}}',0,NULL);"),error='permission denied')
sql(actor(bot,"INSERT INTO schedule_weeks(store_id,week_date,status) VALUES('A','2099-01-05','approved');"),error='permission denied')
assert sql("SELECT pg_has_role('schedule_bot','authenticated','MEMBER');")=='f'
assert value('SELECT count(*) FROM schedule_drafts;')=='1'
sql(actor(bot,'SELECT * FROM schedule_bot_scopes;'),error='permission denied')
sql(f"UPDATE schedule_bot_scopes SET enabled=false WHERE user_id='{uid}';")
sql(actor(bot,save(4)),error='DRAFT_FORBIDDEN')
sql(actor(bot,"SELECT get_schedule_bot_context('A','2099-01-05');"),error='BOT_SCOPE_FORBIDDEN')
assert before==sql("SELECT md5(coalesce(jsonb_agg(to_jsonb(s) ORDER BY emp_id,week_date)::text,'')) FROM schedules s;")
assert weeks_before==sql("SELECT md5(coalesce(jsonb_agg(to_jsonb(w) ORDER BY store_id,week_date)::text,'')) FROM schedule_weeks w;")
print('SCHEDULE_BOT_OK scoped reads/drafts, no official writes, no personal columns, revocation',DB)
