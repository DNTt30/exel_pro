-- ==============================================================================
-- MACHINE LEARNING SMART SCHEDULER SCHEMA
-- (Đã cập nhật theo Review: UTC Timezone, RLS Select Only, existing function)
-- ==============================================================================

-- Cleanup nếu chạy lại script này (vì đây là feature mới, an toàn để drop)
DROP TABLE IF EXISTS ml_demand_predictions CASCADE;
DROP TABLE IF EXISTS ml_shift_history CASCADE;
DROP TABLE IF EXISTS ml_store_profiles CASCADE;

-- 1. Bảng Hồ Sơ Cửa Hàng (Store Profile)
CREATE TABLE ml_store_profiles (
  store_id VARCHAR PRIMARY KEY,
  location_type VARCHAR NOT NULL, 
  base_daily_revenue NUMERIC,     
  peak_shifts VARCHAR[],          
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO ml_store_profiles (store_id, location_type, base_daily_revenue, peak_shifts)
VALUES ('VN0485', 'OFFICE_SCHOOL', 16000000, ARRAY['MORNING', 'AFTERNOON']);

-- 2. Bảng Dữ Liệu Huấn Luyện (Training Data History)
CREATE TABLE ml_shift_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id VARCHAR NOT NULL REFERENCES ml_store_profiles(store_id),
  shift_date DATE NOT NULL,
  shift_type VARCHAR NOT NULL,
  
  is_weekend BOOLEAN NOT NULL,
  is_holiday BOOLEAN NOT NULL,
  has_extreme_weather BOOLEAN DEFAULT false,
  shift_revenue_vnd NUMERIC,
  shift_foot_traffic INT,
  
  ideal_staff_count INT NOT NULL,     
  assigned_staff_count INT NOT NULL,  
  
  is_mock_data BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Bảng Lưu Trữ Dự Báo (Predictions)
CREATE TABLE ml_demand_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id VARCHAR NOT NULL,
  target_date DATE NOT NULL,
  shift_type VARCHAR NOT NULL,
  
  predicted_staff_count INT NOT NULL,
  confidence_score NUMERIC,
  features_used JSONB,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(store_id, target_date, shift_type)
);


-- ==========================================
-- BẢO MẬT RLS (Row Level Security)
-- ==========================================
ALTER TABLE ml_store_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_shift_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_demand_predictions ENABLE ROW LEVEL SECURITY;

-- Dọn dẹp policy rác (nếu tồn tại)
DROP POLICY IF EXISTS "Admin full access ML profiles" ON ml_store_profiles;
DROP POLICY IF EXISTS "Admin full access ML history" ON ml_shift_history;
DROP POLICY IF EXISTS "Admin full access ML predictions" ON ml_demand_predictions;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON ml_store_profiles;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON ml_shift_history;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON ml_demand_predictions;

-- Frontend Users (Admin/SM) chỉ có quyền SELECT dựa trên function phân quyền có sẵn
CREATE POLICY "Users can view allowed ML profiles" ON ml_store_profiles FOR SELECT
  USING (public.can_manage_store(store_id) = true);

CREATE POLICY "Users can view allowed ML history" ON ml_shift_history FOR SELECT
  USING (public.can_manage_store(store_id) = true);

CREATE POLICY "Users can view allowed ML predictions" ON ml_demand_predictions FOR SELECT
  USING (public.can_manage_store(store_id) = true);

-- Lưu ý: Việc INSERT dữ liệu dự báo mới sẽ do Service Python (dùng SUPABASE_SERVICE_ROLE_KEY) thực hiện
-- nên không cần tạo policy INSERT cho client.
