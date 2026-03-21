-- ============================================================
-- V3: Devis & Factures
-- ============================================================

-- Numbering functions (defined before tables so they can be
-- called during INSERT; they only reference existing tables)

CREATE OR REPLACE FUNCTION generate_devis_number()
RETURNS text AS $$
DECLARE
  yr   text := to_char(now(), 'YYYY');
  last text;
  n    integer;
BEGIN
  SELECT MAX(split_part(number, '-', 3)) INTO last
  FROM devis
  WHERE number LIKE 'DEV-' || yr || '-%';
  n := COALESCE(last::integer, 0) + 1;
  RETURN 'DEV-' || yr || '-' || lpad(n::text, 3, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION generate_facture_number()
RETURNS text AS $$
DECLARE
  yr   text := to_char(now(), 'YYYY');
  last text;
  n    integer;
BEGIN
  SELECT MAX(split_part(number, '-', 3)) INTO last
  FROM factures
  WHERE number LIKE 'FAC-' || yr || '-%';
  n := COALESCE(last::integer, 0) + 1;
  RETURN 'FAC-' || yr || '-' || lpad(n::text, 3, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Tables

CREATE TABLE devis (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number         text UNIQUE NOT NULL,
  client_id      uuid NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL,
  status         text NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft','sent','accepted','rejected')),
  tva_rate       numeric(5,2) NOT NULL DEFAULT 20.00,
  notes          text,
  valid_until    date,
  events         jsonb NOT NULL DEFAULT '[]',
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE devis_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  devis_id    uuid NOT NULL REFERENCES devis(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity    numeric(10,2) NOT NULL CHECK (quantity > 0),
  unit_price  numeric(10,2) NOT NULL CHECK (unit_price >= 0),
  sort_order  integer NOT NULL DEFAULT 0
);

CREATE TABLE factures (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number         text UNIQUE NOT NULL,
  client_id      uuid NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  devis_id       uuid REFERENCES devis(id) ON DELETE SET NULL,
  appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL,
  status         text NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft','sent','paid','cancelled')),
  tva_rate       numeric(5,2) NOT NULL DEFAULT 20.00,
  notes          text,
  paid_at        timestamptz,
  paid_amount    numeric(10,2),
  payment_method text CHECK (payment_method IN ('cash','card','transfer')),
  events         jsonb NOT NULL DEFAULT '[]',
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE facture_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facture_id  uuid NOT NULL REFERENCES factures(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity    numeric(10,2) NOT NULL CHECK (quantity > 0),
  unit_price  numeric(10,2) NOT NULL CHECK (unit_price >= 0),
  sort_order  integer NOT NULL DEFAULT 0
);

-- RLS

ALTER TABLE devis         ENABLE ROW LEVEL SECURITY;
ALTER TABLE devis_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE factures      ENABLE ROW LEVEL SECURITY;
ALTER TABLE facture_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff can manage devis"         ON devis         FOR ALL USING (is_staff());
CREATE POLICY "staff can manage devis_items"   ON devis_items   FOR ALL USING (is_staff());
CREATE POLICY "staff can manage factures"      ON factures      FOR ALL USING (is_staff());
CREATE POLICY "staff can manage facture_items" ON facture_items FOR ALL USING (is_staff());
