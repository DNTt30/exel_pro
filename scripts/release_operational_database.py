"""Apply the reviewed October release migrations to the configured project.

Read-only by default. --apply backs up public schema then applies release files
atomically through the authenticated Supabase CLI (schema owner privileges).
Credentials stay in subprocess environment and are never printed.
"""
import json
import argparse
import os
from pathlib import Path
import subprocess
from datetime import datetime, timezone
from urllib.parse import unquote, urlparse

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--apply', action='store_true')
mode = parser.add_mutually_exclusive_group()
mode.add_argument('--schedule-policy-only', action='store_true')
mode.add_argument('--handbook-catalog', action='store_true')
mode.add_argument('--copilot-rate-limit', action='store_true')
mode.add_argument('--copilot-activity', action='store_true')
args = parser.parse_args()
PROJECT = 'plitfdjzuealjxbylwxy'
entries = {}
for line in (ROOT / '.env').read_text(encoding='utf-8-sig').splitlines():
    if '=' in line and not line.lstrip().startswith('#'):
        key, value = line.split('=', 1)
        entries[key.strip()] = value.strip().strip('"').strip("'")
url = urlparse(entries['DIRECT_URL'])
if PROJECT not in f'{url.hostname}/{url.username}':
    raise SystemExit('Refusing unexpected database project.')
env = os.environ.copy()
env.update(PGHOST=url.hostname, PGPORT=str(url.port or 5432),
           PGUSER=unquote(url.username or ''), PGPASSWORD=unquote(url.password or ''),
           PGDATABASE=url.path.lstrip('/'), PGSSLMODE='require', PGCONNECT_TIMEOUT='15',
           PGCLIENTENCODING='UTF8')
bin_dir = Path('C:/Program Files/PostgreSQL/17/bin')


def run(args, source=None):
    result = subprocess.run(args, input=source, env=env, capture_output=True,
                            text=True, encoding='utf-8')
    if result.returncode:
        # Do not echo connection strings, SQL contexts, or record values.
        errors = [line for line in result.stderr.splitlines() if 'ERROR:' in line]
        safe = errors[0] if errors else 'Connection or database command failed.'
        for secret in [env['PGPASSWORD'], entries['DIRECT_URL']]:
            if secret:
                safe = safe.replace(secret, '[redacted]')
        raise SystemExit(safe)
    return result.stdout.strip()


psql = [str(bin_dir / 'psql.exe'), '-X', '-At', '-v', 'ON_ERROR_STOP=1']
check = """SELECT json_build_object(
 'night_guard',position('CONSECUTIVE_NIGHTS' in pg_get_functiondef(to_regprocedure('public.check_schedule_rules()')))>0,
 'rest_12h',position('12 hours' in pg_get_functiondef(to_regprocedure('public.check_schedule_rules()')))>0,
 'branding',to_regclass('public.workspace_branding') IS NOT NULL,
 'role_column_read',CASE WHEN EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid='public.employees'::regclass AND attname='workspace_role_id' AND NOT attisdropped) THEN has_column_privilege('authenticated','public.employees','workspace_role_id','SELECT') ELSE false END,
 'roles',to_regprocedure('public.assign_workspace_role(text,uuid,jsonb)') IS NOT NULL,
 'checked_schedule',to_regprocedure('public.save_employee_schedule_checked(text,text,jsonb,integer,text)') IS NOT NULL,
 'checked_bulk',to_regprocedure('public.upsert_schedules_bulk_checked(jsonb,text)') IS NOT NULL,
 'audited_attendance',to_regprocedure('public.get_attendance_audited(date,date)') IS NOT NULL,
 'notifications',to_regclass('public.employee_notifications') IS NOT NULL,
 'audit',to_regclass('public.server_audit_events') IS NOT NULL,
 'managed_stores',to_regprocedure('public.my_managed_stores()') IS NOT NULL,
 'copilot_key',to_regprocedure('public.copilot_get_api_key()') IS NOT NULL);"""
before = json.loads(run(psql, check))
print('BEFORE', json.dumps(before), flush=True)

catalog_check = """SELECT json_build_object(
 'publication',to_regprocedure('public.review_handbook_change(uuid,boolean,boolean,text)') IS NOT NULL,
 'knowledge',to_regprocedure('public.get_handbook_knowledge()') IS NOT NULL,
 'aliases',EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='handbook_entries' AND column_name='aliases'),
 'imports',to_regclass('public.handbook_catalog_imports') IS NOT NULL,
 'deadlines',to_regprocedure('public.get_registration_deadline(text,text)') IS NOT NULL,
 'receipts',to_regprocedure('public.mark_notifications_read(text[])') IS NOT NULL);"""

def catalog_status():
    status = json.loads(run(psql, catalog_check))
    print('CATALOG_SCHEMA', json.dumps(status), flush=True)
    if status['imports']:
        counts = run(psql, """SELECT json_build_object(
          'catalog_sources',(SELECT count(*) FROM public.handbook_catalog_imports),
          'pending_imports',(SELECT count(*) FROM public.handbook_changes WHERE submitted_by='catalog-import' AND status='pending'),
          'published',(SELECT count(*) FROM public.handbook_entries WHERE is_active AND published_at IS NOT NULL));""")
        print('CATALOG_COUNTS', counts, flush=True)
    return status

if args.handbook_catalog:
    catalog_status()
if not args.apply:
    raise SystemExit(0)
if args.handbook_catalog and not all(before.values()):
    raise SystemExit('Missing foundation migrations; refusing handbook release.')
stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
backup = ROOT / 'artifacts' / 'release' / f'public-schema-before-{stamp}.sql'
backup.parent.mkdir(parents=True, exist_ok=True)
run([str(bin_dir / 'pg_dump.exe'), '--schema-only', '--schema=public',
     '--no-owner', '--file', str(backup)])
print('SCHEMA_BACKUP', backup.relative_to(ROOT).as_posix(), flush=True)
names = ['20261012000000_workspace_branding.sql', '20261012000001_workspace_roles.sql',
         '20261012000002_operational_hardening.sql', '20261014000000_workspace_role_read_grant.sql', '20261014000001_schedule_rest_and_nights.sql']
if args.schedule_policy_only:
    names = ['20261014000001_schedule_rest_and_nights.sql']
if args.copilot_rate_limit:
    names = ['20261019000000_copilot_rate_limit.sql']
if args.copilot_activity:
    names = ['20261019000001_copilot_activity_scope.sql']
if args.handbook_catalog:
    names = ['20261017000000_handbook_publication.sql', '20261017000001_practical_workflows.sql',
             '20261018000000_handbook_catalog.sql', '20261018000001_handbook_catalog_seed.sql']
    # Prisma may read public content but cannot access storage. Use the same
    # authenticated schema-owner CLI as the migration for this read-only backup.
    storage_query = backup.parent / f'handbook-storage-backup-{stamp}.sql'
    storage_query.write_text("""SELECT json_build_object(
      'bucket',(SELECT coalesce(json_agg(b),'[]'::json) FROM storage.buckets b WHERE id='handbook-images'),
      'policies',(SELECT coalesce(json_agg(p),'[]'::json) FROM pg_policies p WHERE schemaname='storage' AND tablename='objects')
    ) AS storage_backup;""", encoding='utf-8')
    storage_backup = backup.parent / f'handbook-storage-before-{stamp}.json'
    storage_backup.write_text(run(['npx.cmd', '--yes', 'supabase', 'db', 'query', '--project-ref', PROJECT,
        '--linked', '--file', str(storage_query)]), encoding='utf-8')
    print('STORAGE_BACKUP', storage_backup.relative_to(ROOT).as_posix(), flush=True)
    # Preserve existing content/reviews before import; no credentials or records
    # are printed. Backups remain under ignored artifacts/.
    tables = []
    for table in ['handbook_entries', 'handbook_changes', 'handbook_catalog_imports', 'registration_deadlines']:
        if run(psql, f"SELECT to_regclass('public.{table}') IS NOT NULL;") == 't':
            tables.extend(['--table', f'public.{table}'])
    if tables:
        data_backup = backup.parent / f'handbook-data-before-{stamp}.sql'
        run([str(bin_dir / 'pg_dump.exe'), '--data-only', '--no-owner', *tables, '--file', str(data_backup)])
        print('CONTENT_BACKUP', data_backup.relative_to(ROOT).as_posix(), flush=True)
parts = []
for name in names:
    lines = (ROOT / 'supabase/migrations' / name).read_text(encoding='utf-8').splitlines()
    parts.append('\n'.join(line for line in lines if line.strip() not in ('BEGIN;', 'COMMIT;')))
bundle = backup.parent / f'operational-release-{stamp}.sql'
bundle.write_text("BEGIN; SET LOCAL lock_timeout='10s'; SET LOCAL statement_timeout='60s';\n"
    + '\n'.join(parts) + "\nNOTIFY pgrst, 'reload schema';\nCOMMIT;", encoding='utf-8')
run(['npx.cmd', '--yes', 'supabase', 'db', 'query', '--project-ref', PROJECT,
     '--linked', '--file', str(bundle)])
after = json.loads(run(psql, check))
print('AFTER', json.dumps(after), flush=True)
if not all(after.values()):
    raise SystemExit('Release prerequisite check incomplete; inspect before publishing frontend.')
if args.handbook_catalog and not all(catalog_status().values()):
    raise SystemExit('Handbook release check incomplete; do not publish frontend.')
if args.copilot_rate_limit:
    guard = json.loads(run(psql, """SELECT json_build_object(
      'function',to_regprocedure('public.consume_copilot_request(text)') IS NOT NULL,
      'rls',(SELECT relrowsecurity FROM pg_class WHERE oid='public.copilot_request_limits'::regclass),
      'private',NOT has_table_privilege('authenticated','public.copilot_request_limits','SELECT'),
      'no_client_rpc',NOT has_function_privilege('authenticated','public.consume_copilot_request(text)','EXECUTE'),
      'service_rpc',has_function_privilege('service_role','public.consume_copilot_request(text)','EXECUTE'));"""))
    print('COPILOT_RATE_LIMIT', json.dumps(guard), flush=True)
    if not all(guard.values()):
        raise SystemExit('Copilot rate limit check failed; do not publish Edge Function.')
print('RELEASE_DATABASE_OK', flush=True)
