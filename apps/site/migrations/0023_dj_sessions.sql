CREATE TABLE dj_sessions (
 id text PRIMARY KEY CHECK (id ~ '^[a-f0-9]{32}$'),
 owner_id text NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
 title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 80),
 visibility text NOT NULL CHECK (visibility IN ('public','private')),
 settings jsonb NOT NULL,
 budget jsonb NOT NULL,
 max_credits integer NOT NULL CHECK (max_credits>=0),
 billing_live boolean NOT NULL,
 fingerprint text NOT NULL,
 state text NOT NULL DEFAULT 'active' CHECK (state IN ('active','ending','ended')),
 end_reason text CHECK (end_reason IN ('stop','credits','price','failure','disconnected')),
 created_at timestamptz NOT NULL DEFAULT now(),
 heartbeat_at timestamptz NOT NULL DEFAULT now(),
 ended_at timestamptz,
 withdrawn_at timestamptz
);
CREATE UNIQUE INDEX dj_sessions_active_owner ON dj_sessions(owner_id) WHERE state IN ('active','ending');
CREATE TABLE dj_session_batches (
 session_id text NOT NULL REFERENCES dj_sessions(id) ON DELETE RESTRICT,
 sequence integer NOT NULL CHECK (sequence>=0),
 reservation_id uuid NOT NULL UNIQUE REFERENCES generation_reservations(id),
 seed bigint NOT NULL CHECK (seed BETWEEN 0 AND 4294967295),
 state text NOT NULL DEFAULT 'queued' CHECK (state IN ('queued','running','completed','failed','cancelled')),
 lease uuid,
 audio_sha256 text UNIQUE CHECK (audio_sha256 ~ '^[a-f0-9]{64}$'),
 audio_bytes integer,
 actual_cost_micros bigint,
 played_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(session_id,sequence)
);
ALTER TABLE dj_recordings ADD COLUMN session_id text UNIQUE REFERENCES dj_sessions(id) ON DELETE RESTRICT;
CREATE INDEX dj_sessions_public ON dj_sessions(created_at DESC,id DESC) WHERE visibility='public' AND state='ended' AND withdrawn_at IS NULL;
