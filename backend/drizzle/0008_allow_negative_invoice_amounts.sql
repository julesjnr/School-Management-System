-- Credits, bursaries, and waivers are stored as negative paid invoice entries.
ALTER TABLE "invoices" DROP CONSTRAINT IF EXISTS "invoices_amount_check";
