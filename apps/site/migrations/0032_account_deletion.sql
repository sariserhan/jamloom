CREATE TABLE account_deletions (
 owner_id text PRIMARY KEY REFERENCES "user"(id),
 ticket_id uuid NOT NULL UNIQUE REFERENCES support_tickets(id),
 started_at timestamptz NOT NULL DEFAULT now(),
 completed_at timestamptz
);
