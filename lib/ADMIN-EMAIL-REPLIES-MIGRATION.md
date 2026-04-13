# Admin email replies (inbound)

Run this in **Supabase → SQL Editor** after `admin_blast_log` exists.

```sql
CREATE TABLE IF NOT EXISTS admin_email_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id uuid NOT NULL,
  admin_blast_log_id uuid REFERENCES admin_blast_log(id) ON DELETE SET NULL,
  subject text NOT NULL,
  created_by_admin_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz NOT NULL DEFAULT now(),
  has_unread_inbound boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_admin_email_threads_recipient ON admin_email_threads (recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_email_threads_last ON admin_email_threads (last_message_at DESC);

CREATE TABLE IF NOT EXISTS admin_email_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES admin_email_threads(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('outbound', 'inbound')),
  body_text text NOT NULL,
  body_html text,
  from_email text,
  sender_user_id uuid,
  resend_sent_message_id text,
  inbound_resend_email_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_email_messages_thread ON admin_email_messages (thread_id, created_at);

ALTER TABLE admin_email_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_email_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_all_admin_email_threads" ON admin_email_threads FOR ALL USING (false);
CREATE POLICY "deny_all_admin_email_messages" ON admin_email_messages FOR ALL USING (false);
```

## Env

- `RECRUITNC_EMAIL_REPLY_DOMAIN` — domain that receives inbound mail (same domain you configure in **Resend → Receiving**). Reply-To is `replies+<thread_uuid>@YOUR_DOMAIN`.
- Webhook URL: `https://YOUR_APP_URL/api/webhooks/resend` with event `email.received`.

## Resend

1. Enable **Receiving** on the domain (MX records per Resend).
2. Add webhook → `email.received` → URL above.
