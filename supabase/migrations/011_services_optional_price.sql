-- Optional reservation price shown in booking when filled.
ALTER TABLE services
  ADD COLUMN IF NOT EXISTS price integer;
