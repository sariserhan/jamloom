ALTER TABLE dj_session_batches ADD COLUMN render_settings jsonb;
ALTER TABLE dj_session_batches ADD COLUMN started_at timestamptz;
ALTER TABLE dj_session_batches ADD COLUMN deadline timestamptz;
ALTER TABLE dj_session_batches ADD COLUMN lease_until timestamptz;
ALTER TABLE dj_session_batches ADD COLUMN stop_requested_at timestamptz;
ALTER TABLE dj_session_batches ADD COLUMN stop_confirmed_at timestamptz;
ALTER TABLE dj_session_batches ADD COLUMN stop_evidence_sha256 text CHECK (stop_evidence_sha256 ~ '^[a-f0-9]{64}$');
ALTER TABLE dj_session_batches ADD COLUMN settled_at timestamptz;
CREATE TABLE dj_rentals (
 reservation_id uuid PRIMARY KEY REFERENCES dj_session_batches(reservation_id),
 account_id bigint NOT NULL CHECK (account_id>0),
 label text UNIQUE NOT NULL,
 instance_id bigint UNIQUE CHECK (instance_id>0),
 created_at timestamptz NOT NULL DEFAULT now(),
 destroy_requested_at timestamptz,
 destroy_confirmed_at timestamptz,
 final_cost_micros bigint CHECK (final_cost_micros>=0),
 cost_evidence_sha256 text CHECK (cost_evidence_sha256 ~ '^[a-f0-9]{64}$')
);
