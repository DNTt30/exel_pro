-- Database-only handbook catalog; source aliases are reviewed with the document.
BEGIN;
ALTER TABLE public.handbook_entries ADD COLUMN IF NOT EXISTS aliases text[] NOT NULL DEFAULT '{}';
-- An offline import has not been confirmed by a human; Admin must still review it.
ALTER TABLE public.handbook_changes ALTER COLUMN confirmed_at DROP NOT NULL;
CREATE OR REPLACE FUNCTION public.submit_handbook_change(
 p_payload jsonb, p_entry_id uuid DEFAULT NULL, p_revision integer DEFAULT NULL,
 p_operation text DEFAULT 'upsert', p_confirmed boolean DEFAULT false
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE old public.handbook_entries; saved public.handbook_changes; scope text;
 body jsonb; paths text[]; path text;
BEGIN
 IF p_confirmed IS DISTINCT FROM true THEN RAISE EXCEPTION 'HANDBOOK_CONFIRM_REQUIRED'; END IF;
 IF p_operation IS NULL OR p_operation NOT IN ('upsert','archive') THEN RAISE EXCEPTION 'HANDBOOK_INVALID'; END IF;
 IF jsonb_typeof(p_payload) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'HANDBOOK_INVALID'; END IF;
 scope:=nullif(btrim(p_payload->>'store_id'),'');
 IF p_entry_id IS NOT NULL THEN
   SELECT * INTO old FROM public.handbook_entries WHERE id=p_entry_id FOR UPDATE;
   IF NOT FOUND OR old.revision IS DISTINCT FROM p_revision THEN RAISE EXCEPTION 'HANDBOOK_CONFLICT' USING ERRCODE='40001'; END IF;
   IF NOT public.handbook_can_edit(old.store_id) THEN RAISE EXCEPTION 'HANDBOOK_FORBIDDEN' USING ERRCODE='42501'; END IF;
   IF p_operation='archive' THEN scope:=old.store_id; END IF;
 END IF;
 IF NOT public.handbook_can_edit(scope) THEN RAISE EXCEPTION 'HANDBOOK_FORBIDDEN' USING ERRCODE='42501'; END IF;
 IF scope IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.stores WHERE id=scope AND is_active) THEN RAISE EXCEPTION 'HANDBOOK_INVALID_STORE'; END IF;
 IF p_operation='archive' THEN
   IF p_entry_id IS NULL OR length(btrim(coalesce(p_payload->>'reason',''))) NOT BETWEEN 5 AND 1000 THEN RAISE EXCEPTION 'HANDBOOK_REASON_REQUIRED'; END IF;
   body:=jsonb_build_object('title',old.title,'content',old.content,'category',old.category,
     'source_doc',old.source_doc,'aliases',old.aliases,'images',old.images,'store_id',scope,'reason',btrim(p_payload->>'reason'));
 ELSE
   IF jsonb_typeof(p_payload->'title') IS DISTINCT FROM 'string'
     OR jsonb_typeof(p_payload->'content') IS DISTINCT FROM 'string'
     OR jsonb_typeof(p_payload->'category') IS DISTINCT FROM 'string'
     OR (p_payload ? 'store_id' AND jsonb_typeof(p_payload->'store_id') NOT IN ('string','null'))
     OR (p_payload ? 'source_doc' AND jsonb_typeof(p_payload->'source_doc') NOT IN ('string','null'))
     OR length(btrim(coalesce(p_payload->>'title',''))) NOT BETWEEN 2 AND 160
     OR length(btrim(coalesce(p_payload->>'content',''))) NOT BETWEEN 5 AND 4000
     OR coalesce(p_payload->>'category','') NOT IN ('recipe','quality','ops','labor','general')
     OR length(coalesce(p_payload->>'source_doc',''))>300
     OR jsonb_typeof(coalesce(p_payload->'images','[]')) IS DISTINCT FROM 'array'
     THEN RAISE EXCEPTION 'HANDBOOK_INVALID'; END IF;
   SELECT coalesce(array_agg(value),'{}') INTO paths FROM jsonb_array_elements_text(coalesce(p_payload->'images','[]'));
   IF cardinality(paths)>3 THEN RAISE EXCEPTION 'HANDBOOK_INVALID_IMAGES'; END IF;
   FOREACH path IN ARRAY paths LOOP
     IF path IS NULL OR path !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(png|jpg|webp)$'
       OR (split_part(path,'/',1)<>auth.uid()::text AND NOT(path=ANY(coalesce(old.images,'{}')))
         AND NOT EXISTS(SELECT 1 FROM public.handbook_changes c WHERE c.payload->'images' ? path AND public.handbook_can_edit(c.store_id)))
       OR NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='handbook-images' AND name=path)
       THEN RAISE EXCEPTION 'HANDBOOK_INVALID_IMAGES'; END IF;
   END LOOP;
   IF jsonb_typeof(coalesce(p_payload->'aliases',to_jsonb(old.aliases),'[]'::jsonb)) IS DISTINCT FROM 'array'
     THEN RAISE EXCEPTION 'HANDBOOK_INVALID'; END IF;
   IF jsonb_array_length(coalesce(p_payload->'aliases',to_jsonb(old.aliases),'[]'::jsonb))>20
     OR EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(p_payload->'aliases',to_jsonb(old.aliases),'[]'::jsonb)) a
      WHERE jsonb_typeof(a)<>'string' OR length(trim(a#>>'{}')) NOT BETWEEN 1 AND 100)
     THEN RAISE EXCEPTION 'HANDBOOK_INVALID'; END IF;
   body:=jsonb_build_object('title',btrim(p_payload->>'title'),'content',btrim(p_payload->>'content'),
     'category',p_payload->>'category','source_doc',nullif(btrim(p_payload->>'source_doc'),''),'images',paths,'store_id',scope,'aliases',coalesce(p_payload->'aliases',to_jsonb(old.aliases),'[]'::jsonb));
 END IF;
 INSERT INTO public.handbook_changes(entry_id,store_id,base_revision,operation,payload,submitted_by)
 VALUES(p_entry_id,scope,p_revision,p_operation,body,public.current_emp_id()) RETURNING * INTO saved;
 INSERT INTO public.admin_logs(actor_id,actor_name,action,target,detail)
 VALUES(public.current_emp_id(),public.current_emp_id(),'handbook.submitted',saved.id::text,p_operation);
 RETURN to_jsonb(saved);
END $$;

CREATE OR REPLACE FUNCTION public.review_handbook_change(p_id uuid,p_approve boolean,p_confirmed boolean DEFAULT false,p_note text DEFAULT '')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE c public.handbook_changes; old public.handbook_entries; entry uuid; paths text[];
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_admin() THEN RAISE EXCEPTION 'HANDBOOK_ADMIN_REQUIRED' USING ERRCODE='42501'; END IF;
 IF p_confirmed IS DISTINCT FROM true THEN RAISE EXCEPTION 'HANDBOOK_CONFIRM_REQUIRED'; END IF;
 IF p_approve IS NULL OR length(coalesce(p_note,''))>1000 THEN RAISE EXCEPTION 'HANDBOOK_INVALID'; END IF;
 SELECT * INTO c FROM public.handbook_changes WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR c.status<>'pending' THEN RAISE EXCEPTION 'HANDBOOK_CONFLICT' USING ERRCODE='40001'; END IF;
 IF p_approve THEN
   IF c.entry_id IS NOT NULL THEN
     SELECT * INTO old FROM public.handbook_entries WHERE id=c.entry_id FOR UPDATE;
     IF NOT FOUND OR old.revision IS DISTINCT FROM c.base_revision THEN RAISE EXCEPTION 'HANDBOOK_CONFLICT' USING ERRCODE='40001'; END IF;
   END IF;
   IF c.store_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.stores WHERE id=c.store_id AND is_active) THEN RAISE EXCEPTION 'HANDBOOK_INVALID_STORE'; END IF;
   entry:=coalesce(c.entry_id,gen_random_uuid());
   SELECT coalesce(array_agg(value),'{}') INTO paths FROM jsonb_array_elements_text(c.payload->'images');
   IF c.operation='archive' THEN
     UPDATE public.handbook_entries SET is_active=false,revision=revision+1,updated_at=now(),published_by=public.current_emp_id() WHERE id=entry;
   ELSE
     INSERT INTO public.handbook_entries(id,category,title,content,source_doc,created_by,store_id,images,published_at,published_by,is_active,aliases)
     VALUES(entry,c.payload->>'category',c.payload->>'title',c.payload->>'content',c.payload->>'source_doc',c.submitted_by,c.store_id,paths,now(),public.current_emp_id(),true,ARRAY(SELECT jsonb_array_elements_text(coalesce(c.payload->'aliases',to_jsonb(old.aliases),'[]'::jsonb))))
     ON CONFLICT(id) DO UPDATE SET category=excluded.category,title=excluded.title,content=excluded.content,
       source_doc=excluded.source_doc,store_id=excluded.store_id,images=excluded.images,aliases=excluded.aliases,published_at=now(),
       published_by=excluded.published_by,is_active=true,revision=handbook_entries.revision+1,updated_at=now();
   END IF;
 ELSE
   IF length(btrim(coalesce(p_note,'')))<5 THEN RAISE EXCEPTION 'HANDBOOK_REASON_REQUIRED'; END IF;
 END IF;
 UPDATE public.handbook_changes SET status=CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END,
   reviewed_by=public.current_emp_id(),reviewed_at=now(),review_note=btrim(p_note),entry_id=coalesce(entry,entry_id)
 WHERE id=p_id RETURNING * INTO c;
 INSERT INTO public.admin_logs(actor_id,actor_name,action,target,detail)
 VALUES(public.current_emp_id(),public.current_emp_id(),'handbook.'||c.status,c.id::text,c.operation||': '||coalesce(p_note,''));
 RETURN to_jsonb(c);
END $$;
REVOKE ALL ON FUNCTION public.submit_handbook_change(jsonb,uuid,integer,text,boolean),public.review_handbook_change(uuid,boolean,boolean,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.submit_handbook_change(jsonb,uuid,integer,text,boolean),public.review_handbook_change(uuid,boolean,boolean,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_handbook_knowledge() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',e.id,'title',e.title,'category',e.category,
   'content',CASE WHEN e.is_active THEN e.content ELSE '' END,'source_doc',CASE WHEN e.is_active THEN e.source_doc ELSE NULL END,
   'images',CASE WHEN e.is_active THEN to_jsonb(e.images) ELSE '[]'::jsonb END,
   'aliases',to_jsonb(e.aliases),'store_id',e.store_id,'revision',e.revision,'is_active',e.is_active,'published_at',e.published_at)), '[]'::jsonb)
 FROM public.handbook_entries e WHERE e.published_at IS NOT NULL AND public.handbook_can_read(e.store_id);
$$;
REVOKE ALL ON FUNCTION public.get_handbook_knowledge() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_handbook_knowledge() TO authenticated;


COMMIT;
