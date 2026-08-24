-- Gan SM quan ly cua hang: nhan vien cua cac CH CUNG MOT SM se thay lich cua nhau.

ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS sm_id text;

-- Cach gan (SQL Editor) - gan SM A (ma NV 260716001) quan ly 3 CH:
--   UPDATE public.stores SET sm_id = '260716001' WHERE id IN ('VN0485','VN0499','VN0500');
--   (ma NV lay trong bang employees, vai tro 'Cua hang truong')
--
-- Sau khi gan: NV vao tab Lich ca se thay chip chon cua hang cua nhung CH do.
