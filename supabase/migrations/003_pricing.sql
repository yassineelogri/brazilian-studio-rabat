-- =========================================
-- Pricing Categories & Items
-- =========================================

CREATE TABLE pricing_categories (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  image_url  text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active  boolean NOT NULL DEFAULT true
);

CREATE TABLE pricing_items (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id    uuid NOT NULL REFERENCES pricing_categories(id) ON DELETE CASCADE,
  name           text NOT NULL,
  price          integer NOT NULL,          -- current price in DH
  original_price integer DEFAULT NULL,      -- if set and > price → promo display
  sort_order     integer NOT NULL DEFAULT 0,
  is_active      boolean NOT NULL DEFAULT true
);

-- RLS
ALTER TABLE pricing_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_items      ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "pricing_categories_public_read" ON pricing_categories FOR SELECT USING (true);
CREATE POLICY "pricing_items_public_read"       ON pricing_items      FOR SELECT USING (true);

-- Staff write
CREATE POLICY "pricing_categories_staff_write" ON pricing_categories FOR ALL USING (is_staff());
CREATE POLICY "pricing_items_staff_write"       ON pricing_items      FOR ALL USING (is_staff());

-- =========================================
-- Seed data (current static prices)
-- =========================================

DO $$
DECLARE
  c1 uuid; c2 uuid; c3 uuid; c4 uuid; c5 uuid; c6 uuid;
BEGIN

INSERT INTO pricing_categories (id, name, image_url, sort_order) VALUES
  (gen_random_uuid(), 'Hair & Coloration',       '/hair_coloration.webp',    1),
  (gen_random_uuid(), 'Lissage & Soin Capillaire', '/smooth_hair.webp',       2),
  (gen_random_uuid(), 'Nail Services',            '/russian_manicure.webp',   3),
  (gen_random_uuid(), 'Lashes & Soin de Visage',  '/lash_extensions.webp',    4),
  (gen_random_uuid(), 'Makeup',                   '/makeup_artistry.webp',    5),
  (gen_random_uuid(), 'Epilation',                '/epilation_waxing.webp',   6);

SELECT id INTO c1 FROM pricing_categories WHERE name = 'Hair & Coloration';
SELECT id INTO c2 FROM pricing_categories WHERE name = 'Lissage & Soin Capillaire';
SELECT id INTO c3 FROM pricing_categories WHERE name = 'Nail Services';
SELECT id INTO c4 FROM pricing_categories WHERE name = 'Lashes & Soin de Visage';
SELECT id INTO c5 FROM pricing_categories WHERE name = 'Makeup';
SELECT id INTO c6 FROM pricing_categories WHERE name = 'Epilation';

INSERT INTO pricing_items (category_id, name, price, sort_order) VALUES
  (c1, 'Brushing',              50,   1),
  (c1, 'Shampoing + Brushing',  70,   2),
  (c1, 'Brushing Wavy',         70,   3),
  (c1, 'Coupe + Brushing',     150,   4),
  (c1, 'Égalisation Pointes',   50,   5),
  (c1, 'Coloration',           300,   6),
  (c1, 'Balayage',             800,   7),
  (c1, 'Les Mèches',           700,   8),

  (c2, 'Lissage Goldery & More',              1500, 1),
  (c2, 'Lissage Cadiveu',                     1300, 2),
  (c2, 'Lissage Brazilian',                    500, 3),
  (c2, 'Soins (Inovatis, Nashi, Olaplex...)', 200,  4),

  (c3, 'Pose Permanente',          50,  1),
  (c3, 'BIAB',                    100,  2),
  (c3, 'Manicure Russe',          200,  3),
  (c3, 'Dépose',                   50,  4),
  (c3, 'Manicure Classique',       30,  5),
  (c3, 'Manicure Spa',             50,  6),
  (c3, 'Pedicure Russe',          250,  7),
  (c3, 'Pedicure Classique',       80,  8),
  (c3, 'Pedicure Spa',            100,  9),
  (c3, 'Faux Ongles + Permanente',200, 10),
  (c3, 'Gel Extension',           250, 11),
  (c3, 'Remplissage',             350, 12),
  (c3, 'Nail Art',                 20, 13),

  (c4, 'Cils Classique',           70,  1),
  (c4, 'Cils 1D',                 400,  2),
  (c4, 'Cils 2D',                 500,  3),
  (c4, 'Cils 3D',                 600,  4),
  (c4, 'Méga Volume',             300,  5),
  (c4, 'Effet',                   100,  6),
  (c4, 'Soin de Visage Express',  100,  7),
  (c4, 'Soin de Visage Profond',  200,  8),
  (c4, 'Soin Hydrafacial',        400,  9),
  (c4, 'Micro-Needling',          800, 10),
  (c4, 'Brow Lift',               200, 11),
  (c4, 'Lash Lift',               250, 12),

  (c5, 'Makeup Invitee',       300, 1),
  (c5, 'Makeup du Jour',       200, 2),
  (c5, 'Pack Makeup Mariee',  1600, 3),

  (c6, 'Duvet',                         15, 1),
  (c6, 'Sourcil',                        30, 2),
  (c6, 'Visage',                         50, 3),
  (c6, 'Aisselle',                       30, 4),
  (c6, 'Demi Bras / Bras Entier',        30, 5),
  (c6, 'Demi Jambes / Jambes Entières',  40, 6),
  (c6, 'Bord Maillot / Maillot',         50, 7),
  (c6, 'Corps Complet',                 100, 8);

END $$;
