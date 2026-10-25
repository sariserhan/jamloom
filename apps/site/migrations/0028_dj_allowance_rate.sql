-- Bind top-up value as well as its whole-credit limit; purchase lots can have different net proceeds.
ALTER TABLE dj_sessions ADD COLUMN min_allowance_per_10k_credits bigint NOT NULL DEFAULT 0 CHECK(min_allowance_per_10k_credits>=0);
CREATE INDEX dj_allowance_allocations_lot ON dj_allowance_allocations(lot_id);
