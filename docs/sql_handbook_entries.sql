-- Handbook Entries table for dynamic AI knowledge base
CREATE TABLE IF NOT EXISTS handbook_entries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category    TEXT NOT NULL DEFAULT 'general',
  title       TEXT NOT NULL,
  content     TEXT NOT NULL,
  source_doc  TEXT,
  created_by  TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  is_active   BOOLEAN DEFAULT true
);

ALTER TABLE handbook_entries ENABLE ROW LEVEL SECURITY;

-- Admin có thể đọc/ghi tất cả
CREATE POLICY "admin_full_access" ON handbook_entries
  FOR ALL USING (true);

-- Trigger update updated_at
CREATE OR REPLACE FUNCTION update_handbook_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handbook_updated_at
  BEFORE UPDATE ON handbook_entries
  FOR EACH ROW EXECUTE FUNCTION update_handbook_updated_at();
