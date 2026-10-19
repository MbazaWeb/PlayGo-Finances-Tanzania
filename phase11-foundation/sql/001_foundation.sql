-- PlayGo Finances Phase 11: PostgreSQL schema foundation ONLY.
-- Apply in an isolated development database. NOT production-ready.
-- Authentication integration and per-user database context are NOT implemented.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS institutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(trim(name)) > 1),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS app_users (
  id uuid PRIMARY KEY,
  display_name text NOT NULL,
  email text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS memberships (
  user_id uuid NOT NULL REFERENCES app_users(id),
  institution_id uuid NOT NULL REFERENCES institutions(id),
  role text NOT NULL CHECK (role IN ('student','institution_admin','support','operator')),
  PRIMARY KEY (user_id,institution_id,role)
);
CREATE TABLE IF NOT EXISTS academic_years (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id),
  label text NOT NULL,
  structure text NOT NULL CHECK (structure IN ('semester','term')),
  total_fee_tzs bigint NOT NULL CHECK (total_fee_tzs >= 0),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  UNIQUE (institution_id,label)
);
CREATE TABLE IF NOT EXISTS fee_installments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year_id uuid NOT NULL REFERENCES academic_years(id),
  installment_number smallint NOT NULL CHECK (installment_number BETWEEN 1 AND 3),
  amount_tzs bigint NOT NULL CHECK (amount_tzs >= 0),
  due_on date NOT NULL,
  UNIQUE (academic_year_id,installment_number)
);
CREATE TABLE IF NOT EXISTS student_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES app_users(id),
  academic_year_id uuid NOT NULL REFERENCES academic_years(id),
  registration_number text NOT NULL,
  UNIQUE (student_id,academic_year_id)
);
CREATE TABLE IF NOT EXISTS payment_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES student_enrollments(id),
  installment_id uuid NOT NULL REFERENCES fee_installments(id),
  amount_tzs bigint NOT NULL CHECK (amount_tzs > 0),
  idempotency_key uuid NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'disabled' CHECK (status = 'disabled'),
  created_at timestamptz NOT NULL DEFAULT now()
);
-- No actual money ledger, funding instructions, or bank secrets in this phase.
-- Deny application roles by default. A future authenticated service layer
-- must implement narrowly scoped access and explicit RLS policies.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_intents ENABLE ROW LEVEL SECURITY;
COMMIT;
