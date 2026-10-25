ALTER TABLE dj_recordings ADD COLUMN streaming boolean NOT NULL DEFAULT false;
ALTER TABLE dj_recordings ADD COLUMN sealed_at timestamptz;
ALTER TABLE dj_recordings ADD COLUMN interrupted boolean NOT NULL DEFAULT false;
ALTER TABLE dj_recordings DROP CONSTRAINT dj_recordings_bytes_check;
ALTER TABLE dj_recordings DROP CONSTRAINT dj_recordings_seconds_check;
ALTER TABLE dj_recordings ADD CONSTRAINT dj_recordings_bytes_check CHECK (
 (NOT streaming AND bytes BETWEEN 1 AND 100663296) OR (streaming AND bytes BETWEEN 0 AND 10737418240));
ALTER TABLE dj_recordings ADD CONSTRAINT dj_recordings_seconds_check CHECK (
 (NOT streaming AND seconds>0 AND seconds<=3605) OR (streaming AND seconds>=0));
CREATE TABLE dj_recording_parts (
 recording_id text NOT NULL REFERENCES dj_recordings(id) ON DELETE CASCADE,
 number integer NOT NULL CHECK (number BETWEEN 1 AND 2048),
 bytes integer NOT NULL CHECK (bytes BETWEEN 1 AND 5242880),
 sha256 text NOT NULL CHECK (sha256 ~ '^[a-f0-9]{64}$'),
 verified boolean NOT NULL DEFAULT false,
 PRIMARY KEY(recording_id,number)
);
