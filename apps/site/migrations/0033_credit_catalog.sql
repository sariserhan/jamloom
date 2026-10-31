-- Additive schema only. Unit conversion runs under each wallet's lock after old jobs finish.
ALTER TABLE credit_lots ADD COLUMN unit_version integer NOT NULL DEFAULT 1 CHECK(unit_version IN (1,2));
ALTER TABLE credit_lots ADD COLUMN grant_kind text NOT NULL DEFAULT 'topup' CHECK(grant_kind IN ('topup','subscription','trial'));
ALTER TABLE credit_lots ADD COLUMN subscription_id text;
ALTER TABLE credit_lots DROP CONSTRAINT credit_lots_provider_check;
ALTER TABLE credit_lots ADD CHECK(provider IN ('stripe_test','stripe_live','apple_sandbox','apple_live','promo_test','promo_live'));
ALTER TABLE generation_reservations ADD COLUMN price_version text;
ALTER TABLE generation_reservations ADD COLUMN fixed_credits integer CHECK(fixed_credits>0);
ALTER TABLE generation_reservations ADD CHECK((price_version IS NULL)=(fixed_credits IS NULL));
CREATE TABLE credit_subscriptions (
 provider text NOT NULL CHECK(provider IN ('stripe_test','stripe_live','apple_sandbox','apple_live')),
 subscription_id text NOT NULL, owner_id text NOT NULL REFERENCES credit_wallets(owner_id),
 customer_id text, plan text NOT NULL CHECK(plan='creator'),
 status text NOT NULL, period_start timestamptz NOT NULL, period_end timestamptz NOT NULL,
 observed_at bigint NOT NULL DEFAULT 0,
 cancel_at_period_end boolean NOT NULL DEFAULT false, updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(provider,subscription_id), CHECK(period_end>period_start)
);
CREATE INDEX credit_subscriptions_owner ON credit_subscriptions(owner_id,period_end);
CREATE TABLE credit_subscription_periods (
 provider text NOT NULL, subscription_id text NOT NULL, period_start timestamptz NOT NULL,
 receipt text NOT NULL, PRIMARY KEY(provider,subscription_id,period_start), UNIQUE(provider,receipt),
 FOREIGN KEY(provider,subscription_id) REFERENCES credit_subscriptions(provider,subscription_id)
);
CREATE TABLE credit_customers (
 owner_id text NOT NULL REFERENCES "user"(id), billing_live boolean NOT NULL,
 customer_id text NOT NULL UNIQUE, PRIMARY KEY(owner_id,billing_live)
);
CREATE TABLE credit_trial_claims (
 owner_id text NOT NULL REFERENCES "user"(id), billing_live boolean NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(owner_id,billing_live)
);
CREATE TABLE credit_trial_budgets (
 billing_live boolean PRIMARY KEY, max_claims integer NOT NULL DEFAULT 0 CHECK(max_claims>=0)
);
INSERT INTO credit_trial_budgets(billing_live,max_claims) VALUES(false,1000),(true,0);

ALTER TABLE dj_sessions ADD COLUMN max_minutes integer NOT NULL DEFAULT 15 CHECK(max_minutes BETWEEN 1 AND 120);
ALTER TABLE dj_sessions DROP CONSTRAINT dj_sessions_end_reason_check;
ALTER TABLE dj_sessions ADD CHECK(end_reason IN ('stop','credits','price','failure','disconnected','limit'));
