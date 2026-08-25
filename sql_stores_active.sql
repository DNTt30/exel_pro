-- =============================================================================
-- THEM COT KHOA CUA HANG: is_active (mac dinh true). Chay 1 lan trong Supabase.
-- CH bi khoa: an khoi bo loc xep lich/dashboard; du lieu cu van con nguyen.
-- ==============================================================================

ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- Kiem tra:
SELECT id, name, is_active FROM public.stores ORDER BY id LIMIT 20;