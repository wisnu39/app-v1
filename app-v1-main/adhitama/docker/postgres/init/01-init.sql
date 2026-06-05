-- ============================================================
-- Adhitama ERP — PostgreSQL Initialization Script
-- Runs once on first container start
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Development Database ────────────────────────────────────
-- Note: Main database is created via POSTGRES_DB env var.
-- This script handles extensions and grants only.

-- Ensure app user has full privileges on the database
-- (POSTGRES_USER is superuser by default in the official image,
--  but we make grants explicit for future non-superuser setup)
GRANT ALL PRIVILEGES ON DATABASE adhitama_dev TO adhitama_user;

-- Set default search path
ALTER DATABASE adhitama_dev SET search_path TO public;

-- ─── Timezone ────────────────────────────────────────────────
ALTER DATABASE adhitama_dev SET timezone TO 'UTC';
