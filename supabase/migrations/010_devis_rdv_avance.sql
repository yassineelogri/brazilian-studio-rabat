-- Add appointment date + advance payment + payment mode fields to devis
ALTER TABLE devis ADD COLUMN rdv_date      date    DEFAULT NULL;
ALTER TABLE devis ADD COLUMN avance_amount integer DEFAULT NULL;  -- amount in MAD
ALTER TABLE devis ADD COLUMN avance_paid   boolean NOT NULL DEFAULT false;
ALTER TABLE devis ADD COLUMN payment_mode  text    DEFAULT NULL CHECK (payment_mode IN ('cash', 'cheque', 'card'));
