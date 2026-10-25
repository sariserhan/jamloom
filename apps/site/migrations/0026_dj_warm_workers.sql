CREATE TABLE dj_warm_workers (
 id uuid PRIMARY KEY,
 lease uuid NOT NULL,
 account_id bigint NOT NULL CHECK(account_id>0),
 instance_id bigint UNIQUE NOT NULL CHECK(instance_id>0),
 label text UNIQUE NOT NULL,
 permit_sha256 text UNIQUE NOT NULL CHECK(permit_sha256 ~ '^[a-f0-9]{64}$'),
 hourly_micros bigint NOT NULL CHECK(hourly_micros BETWEEN 1 AND 5000000),
 budget_micros bigint NOT NULL CHECK(budget_micros BETWEEN 1 AND 6000000),
 observed_micros bigint NOT NULL DEFAULT 0 CHECK(observed_micros>=0),
 allocated_micros bigint NOT NULL DEFAULT 0 CHECK(allocated_micros>=0),
 billing_live boolean NOT NULL,
 state text NOT NULL DEFAULT 'ready' CHECK(state IN ('ready','stopping','stopped')),
 created_at timestamptz NOT NULL DEFAULT now(),
 deadline timestamptz NOT NULL,
 heartbeat_at timestamptz NOT NULL DEFAULT now(),
 destroy_requested_at timestamptz,
 destroy_confirmed_at timestamptz,
 shutdown_sha256 text CHECK(shutdown_sha256 ~ '^[a-f0-9]{64}$')
);
CREATE UNIQUE INDEX dj_one_warm_worker ON dj_warm_workers ((true)) WHERE state<>'stopped';
ALTER TABLE dj_session_batches ADD COLUMN warm_worker_id uuid REFERENCES dj_warm_workers(id);
ALTER TABLE dj_session_batches ADD COLUMN compute_ms integer CHECK(compute_ms BETWEEN 0 AND 900000);
ALTER TABLE dj_session_batches ADD COLUMN vocal jsonb;
