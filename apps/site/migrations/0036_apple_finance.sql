CREATE TABLE apple_finance_reports (
 vendor text NOT NULL,
 fiscal_month text NOT NULL CHECK(fiscal_month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
 region text NOT NULL CHECK(region='ZZ'),
 sha256 text NOT NULL CHECK(sha256 ~ '^[a-f0-9]{64}$'),
 net_usd_micros bigint NOT NULL,
 product_rows integer NOT NULL CHECK(product_rows>=0),
 state text NOT NULL DEFAULT 'pending_payment' CHECK(state IN ('pending_payment','settled','held')),
 settled_usd_micros bigint NOT NULL DEFAULT 0 CHECK(settled_usd_micros>=0),
 payment_reference text UNIQUE,
 payment_evidence_sha256 text,
 settled_at timestamptz,
 checked_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(vendor,fiscal_month,region),
 CHECK(state<>'settled' OR (payment_reference IS NOT NULL AND payment_evidence_sha256 ~ '^[a-f0-9]{64}$' AND settled_at IS NOT NULL AND settled_usd_micros<=GREATEST(0,net_usd_micros)))
);
-- A signed live refund immediately holds Apple funding, ahead of monthly reports.
CREATE TABLE apple_finance_holds (
 receipt text PRIMARY KEY,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE apple_finance_checks (
 vendor text NOT NULL,
 fiscal_month text NOT NULL,
 result text NOT NULL CHECK(result IN ('downloaded','no_sales','unavailable')),
 checked_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(vendor,fiscal_month)
);
