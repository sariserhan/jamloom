-- Financial evidence deliberately survives account deletion. No personal data.
CREATE TABLE gpu_payment_proceeds (
 receipt text PRIMARY KEY,
 charge_id text NOT NULL UNIQUE,
 balance_id text NOT NULL UNIQUE,
 gross_cents bigint NOT NULL CHECK(gross_cents>0),
 fee_cents bigint NOT NULL CHECK(fee_cents>=0),
 tax_cents bigint NOT NULL CHECK(tax_cents>=0),
 net_micros bigint NOT NULL CHECK(net_micros>=0),
 allocation_micros bigint NOT NULL CHECK(allocation_micros=net_micros/5),
 settled boolean NOT NULL DEFAULT false,
 revoked boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(),
 checked_at timestamptz NOT NULL DEFAULT now(),
 CHECK(net_micros=GREATEST(0,gross_cents-fee_cents-tax_cents)*10000)
);
CREATE TABLE gpu_revenue_reservations (
 cycle_id text PRIMARY KEY REFERENCES cloud_capacity_cycles(id),
 micros bigint NOT NULL CHECK(micros>0),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE gpu_provider_funding (
 endpoint text PRIMARY KEY,
 balance_micros bigint NOT NULL CHECK(balance_micros>=0),
 checked_at bigint NOT NULL
);
