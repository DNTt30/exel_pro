-- Tạo bảng Stores (Cửa hàng)
CREATE TABLE public.stores (
  id VARCHAR(50) PRIMARY KEY, -- Mã cửa hàng (VN0485)
  name TEXT NOT NULL, -- Tên hiển thị
  region VARCHAR(50) DEFAULT 'Miền Bắc',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cho phép đọc, ghi tất cả" ON public.stores FOR ALL USING (true);
