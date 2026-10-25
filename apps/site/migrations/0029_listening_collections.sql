CREATE TABLE music_favorites (
 owner_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
 kind text NOT NULL CHECK(kind IN ('music-dna','improvise','sets','catalogue','aurowall')),
 track_id text NOT NULL CHECK(char_length(track_id) BETWEEN 24 AND 36),
 added_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(owner_id,kind,track_id)
);
CREATE TABLE playlist_listening_items (
 playlist_id uuid NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
 kind text NOT NULL CHECK(kind IN ('music-dna','improvise','sets','catalogue','aurowall')),
 track_id text NOT NULL CHECK(char_length(track_id) BETWEEN 24 AND 36),
 added_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(playlist_id,kind,track_id)
);
