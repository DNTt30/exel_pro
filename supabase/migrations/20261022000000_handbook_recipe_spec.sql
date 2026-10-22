-- Structured quantities share the handbook's scope, revision, approval and audit.
BEGIN;
CREATE FUNCTION public.valid_recipe_spec(spec jsonb) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SET search_path=public,pg_temp AS $$
DECLARE c jsonb;
BEGIN
 IF spec IS NULL OR spec='null'::jsonb THEN RETURN true; END IF;
 IF jsonb_typeof(spec)<>'object' OR jsonb_typeof(spec->'baseIngredientName') IS DISTINCT FROM 'string'
   OR length(btrim(spec->>'baseIngredientName')) NOT BETWEEN 1 AND 100
   OR jsonb_typeof(spec->'baseAmount') IS DISTINCT FROM 'number'
   OR (spec->>'baseAmount')::numeric NOT BETWEEN 0.000000001 AND 1000000000
   OR jsonb_typeof(spec->'baseUnit') IS DISTINCT FROM 'string' OR length(btrim(spec->>'baseUnit')) NOT BETWEEN 1 AND 24
   OR jsonb_typeof(spec->'components') IS DISTINCT FROM 'array' THEN RETURN false; END IF;
 IF jsonb_array_length(spec->'components') NOT BETWEEN 1 AND 30 THEN RETURN false; END IF;
 IF spec ? 'notes' AND (jsonb_typeof(spec->'notes')<>'string' OR length(spec->>'notes')>500) THEN RETURN false; END IF;
 FOR c IN SELECT value FROM jsonb_array_elements(spec->'components') LOOP
   IF jsonb_typeof(c)<>'object' OR jsonb_typeof(c->'name') IS DISTINCT FROM 'string' OR length(btrim(c->>'name')) NOT BETWEEN 1 AND 100
     OR jsonb_typeof(c->'unit') IS DISTINCT FROM 'string' OR length(btrim(c->>'unit')) NOT BETWEEN 1 AND 24
     OR jsonb_typeof(c->'amount') IS DISTINCT FROM 'number' OR (c->>'amount')::numeric NOT BETWEEN 0 AND 1000000000 THEN RETURN false; END IF;
 END LOOP;
 RETURN true;
EXCEPTION WHEN OTHERS THEN RETURN false;
END $$;
ALTER TABLE public.handbook_entries ADD COLUMN recipe_spec jsonb CHECK(public.valid_recipe_spec(recipe_spec));

-- Assert every patch target, preserving the deployed permission and concurrency guards.
CREATE FUNCTION pg_temp.patch_recipe_function(body text,old_text text,new_text text) RETURNS text
LANGUAGE plpgsql AS $$ BEGIN
 IF length(body)-length(replace(body,old_text,''))<>length(old_text) THEN RAISE EXCEPTION 'Unexpected handbook function; inspect before applying'; END IF;
 RETURN replace(body,old_text,new_text);
END $$;
DO $$ DECLARE body text;
BEGIN
 body:=pg_get_functiondef('public.submit_handbook_change(jsonb,uuid,integer,text,boolean)'::regprocedure);
 body:=pg_temp.patch_recipe_function(body,' INSERT INTO public.handbook_changes(entry_id', $patch$
 IF p_operation='archive' THEN
   body:=body || jsonb_build_object('recipe_spec',old.recipe_spec);
 ELSE
   IF NOT public.valid_recipe_spec(p_payload->'recipe_spec') OR
     (p_payload->'recipe_spec' IS NOT NULL AND p_payload->'recipe_spec'<>'null'::jsonb AND p_payload->>'category'<>'recipe') THEN
     RAISE EXCEPTION 'HANDBOOK_INVALID_RECIPE';
   END IF;
   -- Older clients cannot silently keep obsolete quantities after editing text.
   body:=body || jsonb_build_object('recipe_spec',CASE WHEN p_payload ? 'recipe_spec' THEN p_payload->'recipe_spec'
     WHEN old.content=p_payload->>'content' THEN old.recipe_spec ELSE NULL END);
 END IF;
 INSERT INTO public.handbook_changes(entry_id$patch$);
 EXECUTE body;
 body:=pg_get_functiondef('public.review_handbook_change(uuid,boolean,boolean,text)'::regprocedure);
 body:=pg_temp.patch_recipe_function(body,'is_active,aliases)', 'is_active,recipe_spec,aliases)');
 body:=pg_temp.patch_recipe_function(body,'public.current_emp_id(),true,ARRAY', 'public.current_emp_id(),true,c.payload->''recipe_spec'',ARRAY');
 body:=pg_temp.patch_recipe_function(body,'aliases=excluded.aliases,published_at=now()', 'aliases=excluded.aliases,recipe_spec=excluded.recipe_spec,published_at=now()');
 EXECUTE body;
 body:=pg_get_functiondef('public.get_handbook_knowledge()'::regprocedure);
 body:=pg_temp.patch_recipe_function(body,'''aliases'',to_jsonb(e.aliases)', '''recipe_spec'',CASE WHEN e.is_active THEN e.recipe_spec ELSE NULL END,''aliases'',to_jsonb(e.aliases)');
 EXECUTE body;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
