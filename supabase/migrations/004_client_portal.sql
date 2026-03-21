-- ============================================================
-- V4: Client Portal
-- ============================================================

-- 1. Add starts_at generated column to appointments
--    Combines date + start_time into a single UTC-comparable timestamptz.
--    'Africa/Casablanca' is UTC+1 (no DST for Morocco since 2018).
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS starts_at timestamptz
    GENERATED ALWAYS AS ((date + start_time) AT TIME ZONE 'Africa/Casablanca') STORED;

-- 2. Helper: returns the clients.id for the current Supabase auth user
CREATE OR REPLACE FUNCTION get_client_id()
RETURNS uuid AS $$
  SELECT id FROM clients WHERE auth_user_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 3. Booking tokens (one per appointment, auto-refreshable)
CREATE TABLE IF NOT EXISTS booking_tokens (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token          text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  client_id      uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  appointment_id uuid NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  expires_at     timestamptz NOT NULL DEFAULT now() + interval '30 days',
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT booking_tokens_appointment_id_key UNIQUE (appointment_id)
);

ALTER TABLE booking_tokens ENABLE ROW LEVEL SECURITY;
-- No client RLS needed — accessed only via service_role in API routes

-- 4. RLS: clients can read their own rows
CREATE POLICY "clients can view own profile"
  ON clients FOR SELECT
  USING (auth_user_id = auth.uid());

CREATE POLICY "clients can view own appointments"
  ON appointments FOR SELECT
  USING (client_id = get_client_id());

CREATE POLICY "clients can view own devis"
  ON devis FOR SELECT
  USING (client_id = get_client_id());

CREATE POLICY "clients can view own devis_items"
  ON devis_items FOR SELECT
  USING (devis_id IN (SELECT id FROM devis WHERE client_id = get_client_id()));

CREATE POLICY "clients can view own factures"
  ON factures FOR SELECT
  USING (client_id = get_client_id());

CREATE POLICY "clients can view own facture_items"
  ON facture_items FOR SELECT
  USING (facture_id IN (SELECT id FROM factures WHERE client_id = get_client_id()));
