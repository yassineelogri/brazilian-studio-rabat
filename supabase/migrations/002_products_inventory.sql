-- supabase/migrations/002_products_inventory.sql
-- Note: is_staff() function already defined in migration 001 — do not redefine.

-- Atomic stock decrement function (prevents race conditions)
CREATE OR REPLACE FUNCTION decrement_stock(p_product_id uuid, p_quantity integer)
RETURNS void AS $$
  UPDATE products
  SET stock_quantity = stock_quantity - p_quantity
  WHERE id = p_product_id AND stock_quantity >= p_quantity;
$$ LANGUAGE sql SECURITY DEFINER;

-- Products table
CREATE TABLE products (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text NOT NULL,
  brand               text,
  buying_price        numeric(10,2) NOT NULL CHECK (buying_price >= 0),
  selling_price       numeric(10,2) NOT NULL CHECK (selling_price >= 0),
  stock_quantity      integer NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  low_stock_threshold integer NOT NULL DEFAULT 3 CHECK (low_stock_threshold >= 0),
  is_active           boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- Product sales table
CREATE TABLE product_sales (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id     uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL,
  quantity       integer NOT NULL CHECK (quantity > 0),
  unit_price     numeric(10,2) NOT NULL CHECK (unit_price >= 0),
  sold_by        uuid REFERENCES staff(id) ON DELETE SET NULL,
  sold_at        timestamptz NOT NULL DEFAULT now(),
  notes          text
);

-- Public view: hides buying_price from anonymous users
CREATE VIEW products_public AS
  SELECT id, name, brand, selling_price, is_active
  FROM products
  WHERE is_active = true;

-- RLS: products table staff-only
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff can manage products"
  ON products FOR ALL
  USING (is_staff());

-- RLS: product_sales staff-only
ALTER TABLE product_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff can manage product_sales"
  ON product_sales FOR ALL
  USING (is_staff());

-- Seed data: 3 test products
INSERT INTO products (name, brand, buying_price, selling_price, stock_quantity, low_stock_threshold) VALUES
  ('OPI Nail Polish — Red', 'OPI', 45.00, 120.00, 10, 3),
  ('Lissage Brésilien Kit', 'Inoar', 280.00, 650.00, 5, 2),
  ('Crème Hydratante Visage', 'The Ordinary', 35.00, 95.00, 8, 3);
