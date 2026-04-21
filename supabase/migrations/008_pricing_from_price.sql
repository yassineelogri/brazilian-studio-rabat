-- Add "à partir de" flag to pricing_items
ALTER TABLE pricing_items ADD COLUMN is_from_price boolean NOT NULL DEFAULT false;
