-- ==============================================================================
-- Chan doan loi Supabase Auth: 'Database error saving new user'
--
-- Loi nay = viec INSERT vao auth.users that bai o tang DB. Nguyen nhan pho bien
-- nhat: co MOT TRIGGER CU (thuong ten handle_new_user / on_auth_user_created)
-- con sot lai tu cac huong dan/cai dat truoc do, va trigger do dang bi loi.
-- Supabase MAC DINH khong co trigger nao tren auth.users.
-- ==============================================================================

-- BUOC 1: Chay de xem co trigger nao tren auth.users khong
SELECT
  n.nspname  AS schema_name,
  c.relname  AS table_name,
  t.tgname   AS trigger_name,
  p.proname  AS function_name,
  pn.nspname AS function_schema
FROM pg_trigger t
JOIN pg_class     c  ON c.oid  = t.tgrelid
JOIN pg_namespace n  ON n.oid  = c.relnamespace
JOIN pg_proc      p  ON p.oid  = t.tgfoid
JOIN pg_namespace pn ON pn.oid = p.pronamespace
WHERE NOT t.tgisinternal
ORDER BY 1, 2;

-- BUOC 2: Neu ket qua co dong voi table_name = 'users' (schema auth), do la thu pham.
-- Thay ten tuong ung roi chay 2 lenh mau:
--   DROP TRIGGER IF EXISTS <trigger_name> ON auth.users;
--   DROP FUNCTION IF EXISTS <function_schema>.<function_name>();
-- Vi du thuong gap nhat:
--   DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
--   DROP FUNCTION IF EXISTS public.handle_new_user();

-- BUOC 3: Quay lai app, DANG XUAT -> DANG NHAP LAI, roi kiem tra user da tao:
SELECT id, email,
       email_confirmed_at IS NOT NULL AS confirmed,
       created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;