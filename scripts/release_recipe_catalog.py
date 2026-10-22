"""Release structured recipe fields and one pending coffee proposal; never approves content."""
import argparse
import json
import sys
from datetime import datetime, timezone

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--apply',action='store_true')
args=parser.parse_args()
# Reuse credential-safe administration helpers without executing their mutation flags.
sys.argv=[sys.argv[0]]
from release_schedule_bot import sql,owner_sql,run,ROOT,bin_dir
exists=sql("SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='handbook_entries' AND column_name='recipe_spec');")=='t'
seeded=sql("SELECT EXISTS(SELECT 1 FROM handbook_catalog_imports WHERE source_key='recipe.coffee-base-user-example-v1');")=='t'
def snapshot():
    return sql("SELECT md5(coalesce(jsonb_agg(jsonb_build_array(id,title,content,revision,is_active,published_at) ORDER BY id)::text,'')) FROM handbook_entries WHERE published_at IS NOT NULL;")
before=snapshot()
if args.apply:
    stamp=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    backup=ROOT/'artifacts/release'/f'pre-recipe-schema-{stamp}.sql'
    backup.parent.mkdir(parents=True,exist_ok=True)
    run([str(bin_dir/'pg_dump.exe'),'--schema-only','--schema=public','--no-owner','--file',str(backup)])
    names=[]
    if not exists:names.append('20261022000000_handbook_recipe_spec.sql')
    if not seeded:names.append('20261022000001_coffee_recipe_proposal.sql')
    parts=['\n'.join(line for line in (ROOT/'supabase/migrations'/name).read_text(encoding='utf-8').splitlines() if line.strip() not in ('BEGIN;','COMMIT;')) for name in names]
    if parts: owner_sql("BEGIN; SET LOCAL lock_timeout='10s'; SET LOCAL statement_timeout='60s';\n"+'\n'.join(parts)+"\nNOTIFY pgrst,'reload schema'; COMMIT;")
    assert sql("SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='handbook_entries' AND column_name='recipe_spec');")=='t'
    assert before==snapshot(),'Published content changed unexpectedly'
    print('RECIPE_MIGRATIONS_OK',len(names),'published content unchanged',flush=True)
status=sql("SELECT json_build_object('imported',count(*),'outcome',min(i.outcome)) FROM handbook_catalog_imports i WHERE source_key='recipe.coffee-base-user-example-v1';")
print('COFFEE_PROPOSAL',status,flush=True)
