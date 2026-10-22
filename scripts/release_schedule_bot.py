"""Release reviewed draft migrations and provision a scoped Supabase Auth bot.

Read-only by default. --apply migrates; --provision creates/repairs only the named
bot and stores credentials encrypted with Windows DPAPI outside the repository.
No employee, schedule, attendance or schedule-week writes.
"""
import argparse
import base64
import json
import os
from pathlib import Path
import re
import secrets
import subprocess
from datetime import datetime,timezone
from urllib.parse import urlparse,unquote
from urllib.request import Request,urlopen
from urllib.error import HTTPError

ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--apply',action='store_true')
parser.add_argument('--provision',action='store_true')
parser.add_argument('--verify',action='store_true')
parser.add_argument('--store',default='VN0500')
args=parser.parse_args()
if not re.fullmatch(r'VN\d{4}',args.store): raise SystemExit('Invalid store code')
def env_file(path):
    return dict((k.strip(),v.strip().strip('\"').strip("'")) for line in path.read_text(encoding='utf-8-sig').splitlines() if '=' in line and not line.lstrip().startswith('#') for k,v in [line.split('=',1)])
config=env_file(ROOT/'.env')
frontend=env_file(ROOT/'frontend/.env')
PROJECT='plitfdjzuealjxbylwxy'
base=frontend['VITE_SUPABASE_URL'].rstrip('/')
url=urlparse(config['DIRECT_URL'])
if PROJECT not in f'{url.hostname}/{url.username}' or urlparse(base).hostname!=f'{PROJECT}.supabase.co': raise SystemExit('Unexpected project')
env=os.environ.copy()
env.update(PGHOST=url.hostname,PGPORT=str(url.port or 5432),PGUSER=unquote(url.username or ''),PGPASSWORD=unquote(url.password or ''),PGDATABASE=url.path.lstrip('/'),PGSSLMODE='require',PGCONNECT_TIMEOUT='15',PGCLIENTENCODING='UTF8')
bin_dir=Path('C:/Program Files/PostgreSQL/17/bin')
def run(command,source=None):
    result=subprocess.run(command,input=source,env=env,capture_output=True,text=True,encoding='utf-8')
    if result.returncode:
        # Never echo SQL, HTTP payloads, keys, connection strings or generated passwords.
        raise RuntimeError(f'Command failed ({Path(command[0]).name}, exit {result.returncode}); credentials and response withheld')
    return result.stdout.strip()
def sql(source): return run([str(bin_dir/'psql.exe'),'-X','-At','-v','ON_ERROR_STOP=1'],source)
def owner_sql(source):
    path=ROOT/'artifacts/release/schedule-bot-query.sql';path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(source,encoding='utf-8')
    return run(['npx.cmd','--yes','supabase','db','query','--project-ref',PROJECT,'--linked','--file',str(path)])
state=json.loads(sql(f"SELECT json_build_object('store_active',EXISTS(SELECT 1 FROM stores WHERE id='{args.store}' AND is_active),'drafts',to_regclass('public.schedule_drafts') IS NOT NULL,'bot',to_regclass('public.schedule_bot_scopes') IS NOT NULL,'permission',to_regprocedure('public.has_permission(text,text)') IS NOT NULL);"))
print('PREFLIGHT',json.dumps(state),flush=True)
state['context_dates']=sql("SELECT coalesce(position('s.week_date::date' in pg_get_functiondef(to_regprocedure('public.get_schedule_bot_context(text,date)')))>0,false);")=='t'
if not state['store_active'] or not state['permission']: raise SystemExit('Store/permission prerequisites missing')
if (args.provision or args.verify) and not args.apply and not (state['drafts'] and state['bot']):
    raise SystemExit('Draft/bot migrations are missing; do not provision an account before the approved migration release')
if args.apply:
    stamp=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    backup=ROOT/'artifacts/release'/f'pre-bot-schema-{stamp}.sql';backup.parent.mkdir(parents=True,exist_ok=True)
    run([str(bin_dir/'pg_dump.exe'),'--schema-only','--schema=public','--no-owner','--file',str(backup)])
    names=[]
    if not state['drafts']: names.append('20261020000000_schedule_drafts.sql')
    if not state['bot']: names.append('20261021000000_schedule_bot_scope.sql')
    if not state['context_dates']: names.append('20261021000001_schedule_bot_week_types.sql')
    if names:
        parts=['\n'.join(line for line in (ROOT/'supabase/migrations'/name).read_text(encoding='utf-8').splitlines() if line.strip() not in ('BEGIN;','COMMIT;')) for name in names]
        owner_sql("BEGIN; SET LOCAL lock_timeout='10s'; SET LOCAL statement_timeout='60s';\n"+'\n'.join(parts)+"\nNOTIFY pgrst,'reload schema'; COMMIT;")
    print('MIGRATIONS_OK',len(names),flush=True)

credential_path=Path(os.environ.get('LOCALAPPDATA',''))/'LichCa/agents'/f'{args.store}.bin'
def powershell(command,source=None):
    return run(['powershell.exe','-NoProfile','-Command','Add-Type -AssemblyName System.Security; '+command],source)
def read_credentials():
    # Path is generated only from the validated store code and OS profile directory.
    return json.loads(powershell("$b=[IO.File]::ReadAllBytes('"+str(credential_path).replace("'","''")+"'); $v=[Security.Cryptography.ProtectedData]::Unprotect($b,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser); [Console]::OutputEncoding=[Text.Encoding]::UTF8; [Console]::Write([Text.Encoding]::UTF8.GetString($v))"))
def http(path,key,body=None,token=None,method=None):
    request=Request(base+path,data=None if body is None else json.dumps(body).encode(),headers={'apikey':key,'Authorization':'Bearer '+(token or key),'Content-Type':'application/json'},method=method)
    try:
        with urlopen(request,timeout=30) as response: return json.load(response)
    except HTTPError as error:
        detail=json.loads(error.read()) if path.startswith('/rest/v1/') else {}
        code=detail.get('code','')
        message=detail.get('message','') if path.startswith('/rest/v1/rpc/get_schedule_bot_context') else ''
        raise RuntimeError(f'HTTP {error.code} for {path.split("?")[0]}; {code} {message}') from None

if args.provision:
    email=f'schedule-bot-{args.store.lower()}@agents.invalid'
    keys=json.loads(run(['npx.cmd','--yes','supabase','projects','api-keys','--project-ref',PROJECT,'--output','json']))
    service=next((k['api_key'] for k in keys if k.get('name')=='service_role'),None)
    if not service: raise SystemExit('Administrative Auth key unavailable; no bot account was provisioned')
    if credential_path.exists():
        credentials=read_credentials()
        if credentials.get('email')!=email or credentials.get('url')!=base: raise SystemExit('Unexpected existing bot credentials')
        uid=credentials['userId']
    else:
        password=secrets.token_urlsafe(36)
        # Owner query finds only this exact dedicated identity; never enumerates human accounts.
        lookup=owner_sql(f"SELECT id FROM auth.users WHERE email='{email}';")
        found=re.search(r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}',lookup)
        account=http('/auth/v1/admin/users'+('/'+found[0] if found else ''),service,{'email':email,'password':password,'email_confirm':True,'role':'schedule_bot'},method='PUT' if found else 'POST')
        uid=account.get('id') or account.get('user',{}).get('id')
        credentials={'url':base,'key':frontend['VITE_SUPABASE_ANON_KEY'],'email':email,'password':password,'userId':uid}
        credential_path.parent.mkdir(parents=True,exist_ok=True)
        powershell("$raw=[Console]::In.ReadToEnd(); $b=[Security.Cryptography.ProtectedData]::Protect([Text.Encoding]::UTF8.GetBytes($raw),$null,[Security.Cryptography.DataProtectionScope]::CurrentUser); [IO.File]::WriteAllBytes('"+str(credential_path).replace("'","''")+"',$b)",json.dumps(credentials))
    if not re.fullmatch(r'[0-9a-f-]{36}',uid or ''): raise SystemExit('Unexpected bot identity')
    account=http('/auth/v1/admin/users/'+uid,service)
    account=account.get('user',account)
    if account.get('email')!=email: raise SystemExit('Bot identity does not match the dedicated email')
    http('/auth/v1/admin/users/'+uid,service,{'role':'schedule_bot'},method='PUT')
    owner_sql(f"INSERT INTO public.schedule_bot_scopes(user_id,store_id) VALUES('{uid}','{args.store}') ON CONFLICT(user_id,store_id) DO UPDATE SET enabled=true;")
    print('BOT_PROVISIONED',args.store,'encrypted credentials outside repository',flush=True)

if args.verify:
    credentials=read_credentials()
    login=http('/auth/v1/token?grant_type=password',credentials['key'],{'email':credentials['email'],'password':credentials['password']})
    token=login['access_token'];key=credentials['key']
    assert json.loads(base64.urlsafe_b64decode(token.split('.')[1]+'=='))['role']=='schedule_bot'
    context=http('/rest/v1/rpc/get_schedule_bot_context',key,{'p_store':args.store,'p_week':'2026-10-26'},token)
    assert context['store']['id']==args.store
    assert all(e['dept']==args.store for e in context['employees'])
    for table,fields in [('employees','id'),('schedules','emp_id'),('schedule_weeks','store_id'),('attendance','emp_id')]:
        try: http(f'/rest/v1/{table}?select={fields}&limit=1',key,token=token)
        except RuntimeError as error: assert 'HTTP 403' in str(error),table
        else: raise AssertionError('Direct table read was allowed: '+table)
    try: http('/rest/v1/rpc/get_schedule_bot_context',key,{'p_store':'VN0485','p_week':'2026-10-26'},token)
    except RuntimeError as error: assert 'HTTP 403' in str(error)
    else: raise AssertionError('Out-of-scope read was allowed')
    # Read-only denial tests above; never probe publication with a real schedule write.
    print('AUTH_POSTGREST_OK',args.store,'employees',len(context['employees']),'scoped_rows',len(context['schedules']),flush=True)
