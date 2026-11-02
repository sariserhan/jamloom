-- Operator-funded startup/idle is independent of customer credit reservations.
-- A cycle reserves its entire worst-case allowance permanently within a permit.
CREATE TABLE cloud_capacity_permits (
 id text PRIMARY KEY,
 config_sha256 text NOT NULL,
 config jsonb NOT NULL,
 profile text NOT NULL,
 cap_micros bigint NOT NULL CHECK (cap_micros > 0),
 reserved_micros bigint NOT NULL DEFAULT 0 CHECK (reserved_micros >= 0 AND reserved_micros <= cap_micros),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE cloud_capacity_cycles (
 id text PRIMARY KEY,
 permit_id text NOT NULL REFERENCES cloud_capacity_permits(id),
 endpoint text NOT NULL,
 image text NOT NULL,
 owner_id text REFERENCES "user"(id) ON DELETE SET NULL,
 starts_at bigint NOT NULL,
 expires_at bigint NOT NULL CHECK (expires_at > starts_at),
 cap_micros bigint NOT NULL CHECK (cap_micros > 0),
 state text NOT NULL CHECK (state IN ('starting','ready','stopping','stopped')),
 ready_at bigint,
 busy_at bigint,
 reason text,
 stopped_at bigint
);
CREATE UNIQUE INDEX cloud_capacity_one_active_endpoint ON cloud_capacity_cycles(endpoint)
 WHERE state <> 'stopped';
CREATE INDEX cloud_capacity_owner_rate ON cloud_capacity_cycles(owner_id, starts_at);
CREATE TABLE cloud_capacity_guardians (
 endpoint text PRIMARY KEY,
 config_sha256 text NOT NULL,
 checked_at bigint NOT NULL
);
