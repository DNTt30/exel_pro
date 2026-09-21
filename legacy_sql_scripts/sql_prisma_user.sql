-- User Prisma. Chạy lại được nếu role đã tồn tại (không báo 42710).
-- Đổi mật khẩu: bỏ comment dòng ALTER USER bên dưới.

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'prisma') THEN
    CREATE USER "prisma" WITH PASSWORD 'your_strong_password' BYPASSRLS CREATEDB;
  ELSE
    ALTER ROLE "prisma" WITH BYPASSRLS CREATEDB;
  END IF;
END
$$;

-- Chỉ chạy khi muốn đổi mật khẩu:
-- ALTER USER "prisma" WITH PASSWORD 'your_strong_password';

GRANT "prisma" TO "postgres";
GRANT USAGE ON SCHEMA public TO prisma;
GRANT CREATE ON SCHEMA public TO prisma;
GRANT ALL ON ALL TABLES IN SCHEMA public TO prisma;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO prisma;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO prisma;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
GRANT ALL ON TABLES TO prisma;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
GRANT ALL ON SEQUENCES TO prisma;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
GRANT ALL ON ROUTINES TO prisma;
