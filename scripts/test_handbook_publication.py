"""Real PostgreSQL policy/transaction checks on a disposable LOCAL database only.
Requires local PostgreSQL on 55442; never reads project credentials or .env.
Storage tables emulate Supabase's schema; file API/signing is tested separately.
"""
import json
import os
import sys
from concurrent.futures import ThreadPoolExecutor

os.environ.setdefault('STABILITY_PG_PORT', '55442')
sys.argv.append('--bundle')
from test_stability_db import sql, actor, ROOT, DB

sql("""
CREATE SCHEMA storage;
CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
CREATE TABLE storage.objects(id uuid DEFAULT gen_random_uuid(),bucket_id text,name text);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
GRANT USAGE ON SCHEMA storage TO authenticated,anon;
GRANT ALL ON storage.objects TO authenticated,anon;
-- A legacy wide-open storage policy must not expose this new private bucket.
CREATE POLICY legacy_open ON storage.objects FOR ALL USING(true) WITH CHECK(true);
CREATE TABLE handbook_entries(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),category text NOT NULL DEFAULT 'general',title text NOT NULL,
 content text NOT NULL,source_doc text,created_by text,created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now(),is_active boolean DEFAULT true);
ALTER TABLE handbook_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_full_access ON handbook_entries FOR ALL USING(true);
GRANT ALL ON handbook_entries TO anon,authenticated;
INSERT INTO handbook_entries(title,content) VALUES('Legacy draft','Must be reviewed before publication');
""")
migration = (ROOT / 'supabase/migrations/20261017000000_handbook_publication.sql').read_text(encoding='utf-8')
sql(migration)
sql(migration)
admin, sm, staff, other = '0', '100000001', '100000002', '100000003'

def value(who, query):
    return sql(actor(who, query)).splitlines()[-1]

def submit(who=sm, title='Tea recipe', content='Size L: 250ml tea.', store='A', entry=None, revision=None,
           operation='upsert', confirmed=True, images=None, reason='Outdated recipe', error=None):
    payload = json.dumps(dict(title=title,content=content,category='recipe',store_id=store,images=images or [],reason=reason))
    query = "SELECT submit_handbook_change('%s',%s,%s,'%s',%s);" % (
        payload.replace("'", "''"), "'%s'" % entry if entry else 'NULL', str(revision) if revision else 'NULL',operation,str(confirmed).lower())
    if error:
        return sql(actor(who,query),error=error)
    return json.loads(value(who,query))

def review(change, approve=True, who=admin, confirmed=True, note='', error=None):
    query = "SELECT review_handbook_change('%s',%s,%s,'%s');" % (change,str(approve).lower(),str(confirmed).lower(),note.replace("'", "''"))
    if error:
        return sql(actor(who,query),error=error)
    return json.loads(value(who,query))

assert value(staff,'SELECT count(*) FROM handbook_entries;')=='0'
assert sql('SELECT count(*) FROM handbook_changes;')=='1', 'idempotent legacy quarantine'
sql('SET ROLE anon; SELECT * FROM handbook_entries;',error='permission denied')
sql(actor(staff,"UPDATE handbook_entries SET content='bypass';"),error='permission denied')
submit(who=staff,error='HANDBOOK_FORBIDDEN')
submit(store='B',error='HANDBOOK_FORBIDDEN')
submit(confirmed=False,error='HANDBOOK_CONFIRM_REQUIRED')
submit(content='x'*4001,error='HANDBOOK_INVALID')
change=submit()
assert value(staff,'SELECT count(*) FROM handbook_changes;')=='0'
review(change['id'],who=sm,error='HANDBOOK_ADMIN_REQUIRED')
review(change['id'],confirmed=False,error='HANDBOOK_CONFIRM_REQUIRED')
approved=review(change['id'])
entry=approved['entry_id']
assert value(staff,f"SELECT content FROM handbook_entries WHERE id='{entry}';")=='Size L: 250ml tea.'
assert value(other,f"SELECT count(*) FROM handbook_entries WHERE id='{entry}';")=='0'
review(change['id'],error='HANDBOOK_CONFLICT')
edit=submit(entry=entry,revision=1,content='Size L: 220ml tea.')
submit(entry=entry,revision=1,error='duplicate key')
assert value(staff,f"SELECT content FROM handbook_entries WHERE id='{entry}';")=='Size L: 250ml tea.'
review(edit['id'],False,note='bad',error='HANDBOOK_REASON_REQUIRED')
review(edit['id'],False,note='Check quantity again')
assert value(staff,f"SELECT revision FROM handbook_entries WHERE id='{entry}';")=='1'
edit=submit(entry=entry,revision=1,content='Size L: 230ml tea.')
review(edit['id'])
assert value(staff,f"SELECT revision FROM handbook_entries WHERE id='{entry}';")=='2'
submit(entry=entry,revision=1,error='HANDBOOK_CONFLICT')
print('PASS private legacy drafts, scoped read/write, confirmation, Admin-only review, rejection and revision conflicts',flush=True)

change=submit(store=None,title='Global policy')
review(change['id'])
assert value(other,"SELECT count(*) FROM handbook_entries WHERE title='Global policy';")=='1'
path='00000000-0000-0000-0000-000100000001/11111111-1111-4111-8111-111111111111.png'
submit(images=[path],error='HANDBOOK_INVALID_IMAGES')
sql(actor(staff,f"INSERT INTO storage.objects(bucket_id,name) VALUES('handbook-images','{path}');"),error='row-level security')
sql(actor(sm,f"INSERT INTO storage.objects(bucket_id,name) VALUES('handbook-images','{path}');"))
image_change=submit(title='Recipe with image',images=[path])
assert value(staff,f"SELECT count(*) FROM storage.objects WHERE name='{path}';")=='0'
image_doc=review(image_change['id'])['entry_id']
assert value(staff,f"SELECT count(*) FROM storage.objects WHERE name='{path}';")=='1'
assert value(other,f"SELECT count(*) FROM storage.objects WHERE name='{path}';")=='0'
assert sql(f"SET ROLE anon; SELECT count(*) FROM storage.objects WHERE name='{path}';").splitlines()[-1]=='0'
sql(actor(sm,f"DELETE FROM storage.objects WHERE name='{path}';"))
assert sql(f"SELECT count(*) FROM storage.objects WHERE name='{path}';")=='1'
archive=submit(entry=image_doc,revision=1,operation='archive')
assert value(staff,f"SELECT count(*) FROM handbook_entries WHERE id='{image_doc}';")=='1'

def parallel_review(_):
    try:
        review(archive['id'])
        return 'ok'
    except AssertionError as e:
        assert 'HANDBOOK_CONFLICT' in str(e)
        return 'conflict'
with ThreadPoolExecutor(max_workers=2) as pool:
    assert sorted(pool.map(parallel_review,[0,1]))==['conflict','ok']
assert value(staff,f"SELECT count(*) FROM handbook_entries WHERE id='{image_doc}';")=='0'
assert value(staff,f"SELECT count(*) FROM storage.objects WHERE name='{path}';")=='0'
assert sql(f"SELECT is_active FROM handbook_entries WHERE id='{image_doc}';")=='f'
knowledge=json.loads(value(staff,'SELECT get_handbook_knowledge();'))
tombstone=next(e for e in knowledge if e['id']==image_doc)
assert tombstone['content']=='' and tombstone['is_active'] is False and tombstone['images']==[]
assert image_doc not in [e['id'] for e in json.loads(value(other,'SELECT get_handbook_knowledge();'))]
assert 'Legacy draft' not in [e['title'] for e in knowledge]
assert sql(f"SELECT count(*) FROM admin_logs WHERE action='handbook.approved' AND target='{archive['id']}';")=='1'
sql(migration)
assert value(staff,f"SELECT count(*) FROM handbook_entries WHERE id='{image_doc}';")=='0'
print('PASS global/store scope, private images despite legacy open policy, reviewed soft archive, concurrency and atomic audit',flush=True)
print('LOCAL_DATABASE', DB)
