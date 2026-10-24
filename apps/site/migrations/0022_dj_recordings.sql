CREATE TABLE dj_recordings (
 id text PRIMARY KEY CHECK (id ~ '^[a-f0-9]{32}$'),
 owner_id text NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
 title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 80),
 mime text NOT NULL CHECK (mime IN ('audio/webm;codecs=opus','audio/mp4')),
 bytes bigint NOT NULL CHECK (bytes BETWEEN 1 AND 100663296),
 sha256 text NOT NULL CHECK (sha256 ~ '^[a-f0-9]{64}$'),
 seconds double precision NOT NULL CHECK (seconds > 0 AND seconds <= 3605),
 state text NOT NULL DEFAULT 'uploading' CHECK (state IN ('uploading','finalizing','ready','deleting','deleted')),
 upload_id text,
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL DEFAULT now() + interval '24 hours',
 completed_at timestamptz
);
CREATE INDEX dj_recordings_owner ON dj_recordings(owner_id,created_at DESC,id DESC);
CREATE INDEX dj_recordings_cleanup ON dj_recordings(expires_at) WHERE state IN ('uploading','finalizing','deleting');
