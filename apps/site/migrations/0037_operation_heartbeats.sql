CREATE TABLE operation_heartbeats (
 name text PRIMARY KEY CHECK(name ~ '^[a-z][a-z0-9-]{0,79}$'),
 ok_at timestamptz NOT NULL DEFAULT now()
);
