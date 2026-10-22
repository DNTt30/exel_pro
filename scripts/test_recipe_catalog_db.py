"""Structured quantities use the real handbook approval/RLS/audit on LOCAL PostgreSQL."""
import json
from test_handbook_catalog import sql,actor,ROOT,DB,value,review,admin,sm,staff,other
sql((ROOT/'supabase/migrations/20261022000000_handbook_recipe_spec.sql').read_text(encoding='utf-8'))
spec={'baseIngredientName':'Coffee','baseAmount':20,'baseUnit':'g','components':[{'name':'First','amount':20,'unit':'ml'},{'name':'Second','amount':45,'unit':'ml'}],'notes':'Test only'}
payload={'title':'Structured recipe test','category':'recipe','content':'Instructions and notes.','store_id':'A','images':[],'recipe_spec':spec}
def propose(body,who=sm,entry=None,revision=None,error=None):
    encoded=json.dumps(body).replace("'","''")
    query=f"SELECT submit_handbook_change('{encoded}',"+(f"'{entry}'" if entry else 'NULL')+f",{revision if revision else 'NULL'},'upsert',true);"
    if error: return sql(actor(who,query),error=error)
    return json.loads(value(who,query))
propose(payload,who=staff,error='HANDBOOK_FORBIDDEN')
for bad in [{}, {**spec,'baseAmount':0},{**spec,'components':[]},{**spec,'components':[{'name':'Water','amount':-1,'unit':'ml'}]}]:
    propose({**payload,'recipe_spec':bad},error='HANDBOOK_INVALID_RECIPE')
pending=propose(payload)
assert pending['payload']['recipe_spec']==spec
assert not any(e['title']==payload['title'] for e in json.loads(value(staff,'SELECT get_handbook_knowledge();')))
sql(actor(sm,f"SELECT review_handbook_change('{pending['id']}',true,true,'');"),error='HANDBOOK_ADMIN_REQUIRED')
entry=review(pending['id'])['entry_id']
def published(who=staff): return next((e for e in json.loads(value(who,'SELECT get_handbook_knowledge();')) if e['id']==entry),None)
assert published()['recipe_spec']==spec
assert published(other) is None
sql(actor(staff,f"UPDATE handbook_entries SET recipe_spec=NULL WHERE id='{entry}';"),error='permission denied')
updated={**spec,'baseAmount':40}
change=propose({**payload,'recipe_spec':updated},entry=entry,revision=published()['revision'])
assert published()['recipe_spec']==spec
review(change['id'])
assert published()['recipe_spec']==updated
assert int(sql(f"SELECT count(*) FROM admin_logs WHERE target IN ('{pending['id']}','{change['id']}') AND action IN ('handbook.submitted','handbook.approved');"))==4
# A legacy client edits text without structured fields: stale quantities are cleared.
old_client={k:v for k,v in payload.items() if k!='recipe_spec'}
old_client['content']='Changed instructions by older client.'
change=propose(old_client,entry=entry,revision=published()['revision'])
review(change['id'])
assert published()['recipe_spec'] is None
seed=(ROOT/'supabase/migrations/20261022000001_coffee_recipe_proposal.sql').read_text(encoding='utf-8')
sql(seed)
seed_entry=sql("SELECT entry_id FROM handbook_catalog_imports WHERE source_key='recipe.coffee-base-user-example-v1';")
assert sql(f"SELECT count(*) FROM handbook_changes WHERE entry_id='{seed_entry}' AND status='pending' AND confirmed_at IS NULL;")=='1'
assert not any(e['id']==seed_entry for e in json.loads(value(staff,'SELECT get_handbook_knowledge();')))
sql(seed)
assert sql(f"SELECT count(*) FROM handbook_changes WHERE entry_id='{seed_entry}';")=='1'
print('RECIPE_CATALOG_DB_OK: validation, scope, pending isolation, Admin approval, revision, audit, legacy invalidation',DB)
