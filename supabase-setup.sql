-- FixIt AI - Supabase Setup SQL
-- Run this in Supabase SQL Editor (dashboard.supabase.co)

-- 1. Auth PINs (temporary, expire in 10 minutes)
CREATE TABLE IF NOT EXISTS auth_pins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('manager', 'technician', 'user')),
  pin_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_auth_pins_lookup ON auth_pins(email, role);

-- 2. Sessions (24-hour expiry)
CREATE TABLE IF NOT EXISTS sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('manager', 'technician', 'user')),
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- 3. Technicians
CREATE TABLE IF NOT EXISTS technicians (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  trade TEXT NOT NULL DEFAULT 'hvac',
  assigned_buildings TEXT[] DEFAULT '{"Gore Hall", "Smith Hall"}',
  is_available BOOLEAN DEFAULT true,
  current_location TEXT,
  phone TEXT
);

-- 4. Assignments
CREATE TABLE IF NOT EXISTS assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  report_id UUID NOT NULL REFERENCES reports(id),
  technician_id UUID NOT NULL REFERENCES technicians(id),
  assigned_by TEXT NOT NULL DEFAULT 'ai',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'in_progress', 'completed', 'cancelled')),
  notes TEXT,
  completion_notes TEXT,
  completion_photo_base64 TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  estimated_arrival TEXT
);

CREATE INDEX IF NOT EXISTS idx_assignments_technician ON assignments(technician_id, status);
CREATE INDEX IF NOT EXISTS idx_assignments_report ON assignments(report_id);

-- 5. Seed demo HVAC technicians
INSERT INTO technicians (name, email, trade, assigned_buildings, is_available) VALUES
  ('Mike Johnson', 'mike@facilities.udel.edu', 'hvac', '{"Gore Hall", "Smith Hall"}', true),
  ('Sarah Chen', 'sarah@facilities.udel.edu', 'hvac', '{"Gore Hall"}', true),
  ('James Williams', 'james@facilities.udel.edu', 'hvac', '{"Smith Hall"}', true)
ON CONFLICT (email) DO NOTHING;

-- 6. Disable RLS on new tables (for hackathon speed - use service role key)
ALTER TABLE auth_pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE technicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (our API routes use service role key)
CREATE POLICY "Service role full access" ON auth_pins FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON technicians FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON assignments FOR ALL USING (true) WITH CHECK (true);
