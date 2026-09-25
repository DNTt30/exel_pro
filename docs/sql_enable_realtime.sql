-- ============================================================
-- REALTIME LỊCH — Chạy script này trên Supabase SQL Editor
-- Vào: supabase.com → Project → SQL Editor → New query → Paste → Run
-- ============================================================

-- Bước 1: Bật Realtime cho bảng schedules
ALTER PUBLICATION supabase_realtime ADD TABLE schedules;

-- Bước 2: Bật Realtime cho bảng shift_swaps
ALTER PUBLICATION supabase_realtime ADD TABLE shift_swaps;

-- Bước 3: Bật Realtime cho bảng feedbacks
ALTER PUBLICATION supabase_realtime ADD TABLE feedbacks;

-- Bước 4: Bật Realtime cho bảng shelf_items
ALTER PUBLICATION supabase_realtime ADD TABLE shelf_items;

-- ============================================================
-- Kiểm tra kết quả (chạy riêng để verify)
-- ============================================================
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;
