-- Add optional upper bound for range prices (e.g. "50DH / 100DH")
ALTER TABLE pricing_items ADD COLUMN price_max integer DEFAULT NULL;
