-- =========================================
-- Brazilian Studio — Initial Schema V1
-- =========================================

-- Staff members
CREATE TABLE staff (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  role         text NOT NULL CHECK (role IN ('worker', 'manager', 'secretary')),
  auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Services offered by the salon
CREATE TABLE services (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  description  text,
  min_duration integer NOT NULL,
  max_duration integer NOT NULL,
  color        text NOT NULL DEFAULT '#E8B4B8',
  is_active    boolean NOT NULL DEFAULT true
);

-- Clients (guests have no auth_user_id)
CREATE TABLE clients (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  phone        text NOT NULL UNIQUE,
  email        text,
  auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Appointments (core table)
CREATE TABLE appointments (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        uuid NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  service_id       uuid NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  staff_id         uuid REFERENCES staff(id) ON DELETE SET NULL,
  date             date NOT NULL,
  start_time       time NOT NULL,
  end_time         time NOT NULL,
  duration_minutes integer NOT NULL,
  status           text NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','confirmed','cancelled','completed','no_show')),
  notes            text,
  created_by       text NOT NULL CHECK (created_by IN ('client','staff')),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- Auto-update updated_at on every change
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Notification log
CREATE TABLE notifications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id  uuid NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  type            text NOT NULL CHECK (type IN ('new_booking','confirmed','cancelled')),
  read            boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- =========================================
-- Row Level Security
-- =========================================

ALTER TABLE staff         ENABLE ROW LEVEL SECURITY;
ALTER TABLE services      ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients       ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Helper: is the current user an active staff member?
CREATE OR REPLACE FUNCTION is_staff()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM staff
    WHERE auth_user_id = auth.uid() AND is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- services: public read, staff write
CREATE POLICY "services_public_read" ON services FOR SELECT USING (true);
CREATE POLICY "services_staff_write" ON services FOR ALL USING (is_staff());

-- staff: public read, staff write
CREATE POLICY "staff_public_read"    ON staff FOR SELECT USING (true);
CREATE POLICY "staff_staff_write"    ON staff FOR ALL USING (is_staff());

-- appointments: staff full access (anon writes via service_role in API routes)
CREATE POLICY "appointments_staff_all" ON appointments FOR ALL USING (is_staff());

-- clients: staff full access
CREATE POLICY "clients_staff_all" ON clients FOR ALL USING (is_staff());

-- notifications: staff full access
CREATE POLICY "notifications_staff_all" ON notifications FOR ALL USING (is_staff());

-- =========================================
-- Seed: Initial services data
-- =========================================

INSERT INTO services (name, description, min_duration, max_duration, color) VALUES
  ('Nail Art',        'Nail design and polish',          60,  180, '#F4A7B9'),
  ('Coiffure',        'Haircut, styling, blow-dry',      15,   45, '#C9A96E'),
  ('Épilation',       'Waxing — body or facial',         20,   60, '#B8D4C8'),
  ('Soin du visage',  'Facial treatment',                45,   90, '#D4B4E8'),
  ('Manucure',        'Manicure + nail care',            30,   60, '#F8B4D4'),
  ('Pédicure',        'Pedicure + foot care',            45,   60, '#B4D4F8');
