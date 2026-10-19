"""Real local DB: import once, Admin approval, scoped reading, edit/rename/archive."""
import json
import os
os.environ['PGCLIENTENCODING'] = 'UTF8'
from test_handbook_publication import sql,actor,ROOT,DB,value,submit,review,admin,sm,staff,other

schema=(ROOT/'supabase/migrations/20261018000000_handbook_catalog.sql').read_text(encoding='utf-8')
seed=(ROOT/'supabase/migrations/20261018000001_handbook_catalog_seed.sql').read_text(encoding='utf-8')
catalog=json.loads((ROOT/'scripts/data/handbook-catalog.json').read_text(encoding='utf-8'))
sql(schema)
sql(schema)
# An existing approved document must survive importing its old recipe snapshot.
old=next(d for d in catalog if d['key']=='recipe.tra-coc')
existing=review(submit(title=old['title'],store=None,content='Current approved: 220ml.')['id'])['entry_id']
before=int(value(staff,'SELECT count(*) FROM handbook_entries;'))
sql(seed)
assert int(value(staff,'SELECT count(*) FROM handbook_entries;'))==before
assert int(sql('SELECT count(*) FROM handbook_catalog_imports;'))==len(catalog)
assert value(staff,f"SELECT content FROM handbook_entries WHERE id='{existing}';")=='Current approved: 220ml.'
assert sql("SELECT outcome FROM handbook_catalog_imports WHERE source_key='recipe.tra-coc';")=='existing_preserved'
assert sql("SELECT count(*) FROM handbook_changes WHERE submitted_by='catalog-import' AND confirmed_at IS NOT NULL;")=='0'
count=sql('SELECT count(*) FROM handbook_changes;')
sql(seed)
assert sql('SELECT count(*) FROM handbook_changes;')==count
assert int(value(other,"SELECT count(*) FROM handbook_changes WHERE submitted_by='catalog-import';"))==0
print('PASS all imports pending, unchanged existing publication, idempotent import, no forged confirmation',flush=True)

recipe=next(d for d in catalog if d['key']=='recipe.tra-tac')
entry=recipe['id']
change=sql(f"SELECT id FROM handbook_changes WHERE entry_id='{entry}' AND status='pending';")
review(change)
knowledge=json.loads(value(staff,'SELECT get_handbook_knowledge();'))
published=next(d for d in knowledge if d['id']==entry)
assert published['content']==recipe['content'] and published['aliases']==recipe['aliases']
payload={k:v for k,v in recipe.items() if k not in ('key','id')}
payload.update(title='Renamed approved recipe',content='Updated quantity: 222ml.',aliases=['old recipe name','new recipe name'])
def propose(payload,revision=2,error=None):
    query=f"SELECT submit_handbook_change('{json.dumps(payload).replace(chr(39),chr(39)*2)}','{entry}',{revision},'upsert',true);"
    if error: return sql(actor(sm,query),error=error)
    return json.loads(value(sm,query))
for invalid in ['bad',None,['a'*101],['a']*21,[5]]:
    propose({**payload,'aliases':invalid},error='HANDBOOK_INVALID')
edit=propose(payload)
assert value(staff,f"SELECT title FROM handbook_entries WHERE id='{entry}';")==recipe['title']
review(edit['id'])
assert value(staff,f"SELECT content FROM handbook_entries WHERE id='{entry}';")=='Updated quantity: 222ml.'
archive=submit(entry=entry,revision=3,operation='archive')
review(archive['id'])
sql(seed)
assert value(staff,f"SELECT count(*) FROM handbook_entries WHERE id='{entry}';")=='0'
assert sql(f"SELECT is_active FROM handbook_entries WHERE id='{entry}';")=='f'
# Archive remains a tombstone; no content is leaked through the AI reader.
archived=next(d for d in json.loads(value(staff,'SELECT get_handbook_knowledge();')) if d['id']==entry)
assert archived['content']=='' and archived['aliases']==payload['aliases']
sql(actor(staff,f"UPDATE handbook_entries SET aliases=ARRAY['forge'] WHERE id='{entry}';"),error='permission denied')
print('PASS imported quantities/aliases, validation, Admin review, stable rename, soft archive, no resurrection on reimport',flush=True)
print('HANDBOOK_CATALOG_OK',DB,flush=True)
