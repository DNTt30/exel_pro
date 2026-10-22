-- User-provided example: prepare a reviewable proposal, never auto-publish it.
BEGIN;
DO $$
DECLARE entry uuid; proposal uuid; spec jsonb;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('handbook-catalog-import-v1',0));
 IF EXISTS(SELECT 1 FROM public.handbook_catalog_imports WHERE source_key='recipe.coffee-base-user-example-v1') THEN RETURN; END IF;
 SELECT id INTO entry FROM public.handbook_entries WHERE store_id IS NULL AND lower(trim(title))=lower('Pha cốt cà phê') LIMIT 1;
 IF entry IS NOT NULL THEN
   INSERT INTO public.handbook_catalog_imports(source_key,entry_id,outcome) VALUES('recipe.coffee-base-user-example-v1',entry,'existing_preserved');
   RETURN;
 END IF;
 spec:='{"baseIngredientName":"cà phê","baseAmount":20,"baseUnit":"g","components":[{"name":"Nước lượt 1","amount":20,"unit":"ml"},{"name":"Nước lượt 2","amount":45,"unit":"ml"}],"notes":"Tổng nước thêm vào không phải lượng cốt thu được."}'::jsonb;
 INSERT INTO public.handbook_entries(title,content,category,source_doc,created_by,is_active,recipe_spec)
 VALUES('Pha cốt cà phê','Tính tỷ lệ các lượt nước theo lượng cà phê. Không tự suy ra thời gian, nhiệt độ hoặc lượng thành phẩm.',
 'recipe','Ví dụ người dùng cung cấp ngày 21/10/2026; cần Admin xác nhận trước khi công bố.','catalog-import',false,spec) RETURNING id INTO entry;
 INSERT INTO public.handbook_changes(entry_id,base_revision,operation,payload,submitted_by,confirmed_at)
 SELECT id,revision,'upsert',jsonb_build_object('title',title,'content',content,'category',category,'source_doc',source_doc,'images','[]'::jsonb,'aliases','[]'::jsonb,'store_id',NULL,'recipe_spec',recipe_spec),'catalog-import',NULL
 FROM public.handbook_entries WHERE id=entry RETURNING id INTO proposal;
 INSERT INTO public.handbook_catalog_imports(source_key,entry_id,outcome) VALUES('recipe.coffee-base-user-example-v1',entry,'pending_review');
 INSERT INTO public.admin_logs(actor_id,actor_name,action,target,detail)
 VALUES('catalog-import','catalog-import','handbook.imported',proposal::text,'Coffee ratio proposal; awaiting Admin review.');
END $$;
COMMIT;
