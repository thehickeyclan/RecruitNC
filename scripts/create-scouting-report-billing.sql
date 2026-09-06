-- Scouting report billing. Deliberately separate from Blue.
--
-- Blue's billing carries split Stripe/WIQ state and a history of double-billed families;
-- nothing here touches it. These two tables are the whole entitlement story.
--
-- What is being sold is *reach the page*, never the personal data. Contact details and
-- academics are gated on coach verification inside buildScoutingReport and are not for sale
-- at any price — so a bug in billing can expose a report, but never a minor's phone number.

-- One-off purchase of one athlete's report.
CREATE TABLE IF NOT EXISTS scouting_report_purchases (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL,
  athlete_id        uuid NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  amount_cents      integer NOT NULL,
  stripe_session_id text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  /* Buying the same report twice is a refund conversation, not two rows. */
  UNIQUE (user_id, athlete_id)
);

CREATE INDEX IF NOT EXISTS scouting_report_purchases_user_idx ON scouting_report_purchases (user_id);

-- Unlimited access while the subscription is live.
CREATE TABLE IF NOT EXISTS scouting_report_subscriptions (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                uuid NOT NULL UNIQUE,
  stripe_customer_id     text,
  stripe_subscription_id text UNIQUE,
  /* Stripe's own status string: active, trialing, past_due, canceled, ... */
  status                 text NOT NULL,
  current_period_end     timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS scouting_report_subscriptions_user_idx ON scouting_report_subscriptions (user_id);

ALTER TABLE scouting_report_purchases     ENABLE ROW LEVEL SECURITY;
ALTER TABLE scouting_report_subscriptions ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE scouting_report_purchases IS 'One-off $4.99 report purchases. Entitlement only — never gates contact details or academics, which follow coach verification.';
COMMENT ON TABLE scouting_report_subscriptions IS 'Unlimited $14.99/month scouting report access.';
