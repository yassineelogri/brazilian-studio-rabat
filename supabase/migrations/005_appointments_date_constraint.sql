-- Prevent malformed date values (e.g. "6200-03-21") from being inserted
-- into the appointments table. The booking API also validates this, but
-- the constraint is the last line of defence at the database level.
ALTER TABLE appointments
  ADD CONSTRAINT appointments_date_sane
  CHECK (date >= '2024-01-01' AND date < '2031-01-01');
