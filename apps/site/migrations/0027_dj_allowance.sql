-- Existing credits stay whole. DJ top-ups retain their purchase provenance and unused value.
CREATE TABLE dj_allowance_lots (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id text NOT NULL,
 credit_lot_id uuid NOT NULL, credits integer NOT NULL CHECK(credits>0),
 capacity_micros bigint NOT NULL CHECK(capacity_micros>0),
 state text NOT NULL DEFAULT 'active' CHECK(state IN ('active','returned','void')),
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(id,owner_id), UNIQUE(id,credit_lot_id,owner_id),
 FOREIGN KEY(credit_lot_id,owner_id) REFERENCES credit_lots(id,owner_id)
);
ALTER TABLE generation_reservations ADD COLUMN dj_charge_micros bigint NOT NULL DEFAULT 0 CHECK(dj_charge_micros>=0 AND dj_charge_micros<=6250000);
ALTER TABLE dj_sessions ADD COLUMN allowance_billing boolean NOT NULL DEFAULT false;
CREATE TABLE dj_allowance_allocations (
 reservation_id uuid NOT NULL, lot_id uuid NOT NULL, owner_id text NOT NULL,
 micros bigint NOT NULL CHECK(micros>0),
 state text NOT NULL DEFAULT 'reserved' CHECK(state IN ('reserved','captured','released')),
 PRIMARY KEY(reservation_id,lot_id),
 FOREIGN KEY(reservation_id,owner_id) REFERENCES generation_reservations(id,owner_id),
 FOREIGN KEY(lot_id,owner_id) REFERENCES dj_allowance_lots(id,owner_id)
);
CREATE INDEX dj_allowance_owner ON dj_allowance_lots(owner_id,created_at);
ALTER TABLE wallet_ledger_entries ADD COLUMN dj_allowance_lot_id uuid;
ALTER TABLE wallet_ledger_entries ADD FOREIGN KEY(dj_allowance_lot_id,lot_id,owner_id) REFERENCES dj_allowance_lots(id,credit_lot_id,owner_id);
ALTER TABLE wallet_ledger_entries DROP CONSTRAINT wallet_ledger_entries_kind_check;
ALTER TABLE wallet_ledger_entries DROP CONSTRAINT wallet_ledger_entries_check;
ALTER TABLE wallet_ledger_entries ADD CHECK(kind IN ('grant','reserve','capture','release','refund','dj_fund','dj_return'));
ALTER TABLE wallet_ledger_entries ADD CHECK (
 (dj_allowance_lot_id IS NULL AND (
 (kind='grant' AND available_delta>0 AND reserved_delta=0 AND reservation_id IS NULL) OR
 (kind='reserve' AND available_delta<0 AND reserved_delta=-available_delta AND reservation_id IS NOT NULL) OR
 (kind='release' AND available_delta>0 AND reserved_delta=-available_delta AND reservation_id IS NOT NULL) OR
 (kind='capture' AND available_delta=0 AND reserved_delta<0 AND reservation_id IS NOT NULL) OR
 (kind='refund' AND available_delta<=0 AND reserved_delta=0 AND reservation_id IS NULL))) OR
 (dj_allowance_lot_id IS NOT NULL AND reservation_id IS NULL AND reserved_delta=0 AND
 ((kind='dj_fund' AND available_delta<0) OR (kind='dj_return' AND available_delta>0)))
);
CREATE UNIQUE INDEX dj_allowance_credit_event ON wallet_ledger_entries(dj_allowance_lot_id,kind) WHERE dj_allowance_lot_id IS NOT NULL;
