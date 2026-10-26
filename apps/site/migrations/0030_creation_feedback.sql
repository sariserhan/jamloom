ALTER TABLE support_tickets DROP CONSTRAINT support_tickets_kind_check;
ALTER TABLE support_tickets ADD CONSTRAINT support_tickets_kind_check CHECK(kind IN ('contact','support','bug'));
CREATE TABLE creation_feedback (
 owner_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
 kind text NOT NULL CHECK(kind IN ('music-dna','improvise','sets','library','local-remix','local-dj')),
 creation_id text NOT NULL CHECK(length(creation_id) BETWEEN 1 AND 80),
 feedback jsonb NOT NULL CHECK(jsonb_typeof(feedback)='object' AND octet_length(feedback::text)<=4096),
 audio_sha256 text CHECK(audio_sha256 ~ '^[a-f0-9]{64}$'),
 rights_confirmed boolean NOT NULL DEFAULT false,
 consent_version integer NOT NULL DEFAULT 1 CHECK(consent_version=1),
 updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(owner_id,kind,creation_id)
);
CREATE INDEX creation_feedback_review ON creation_feedback(updated_at DESC);
CREATE TABLE creation_training_reviews (
 kind text NOT NULL, creation_id text NOT NULL, audio_sha256 text NOT NULL CHECK(audio_sha256 ~ '^[a-f0-9]{64}$'),
 approved boolean NOT NULL, rights_note text NOT NULL CHECK(length(rights_note) BETWEEN 10 AND 1000),
 reviewer_id text NOT NULL REFERENCES "user"(id), reviewed_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(kind,creation_id)
);
