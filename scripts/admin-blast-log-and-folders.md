# Admin blast log and thread folders

Run in **Supabase → SQL Editor** to enable full Sent history and folders for organizing threads.

## 1. Admin blast log (Sent)

```sql
CREATE TABLE IF NOT EXISTS admin_blast_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sent_by_user_id uuid NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  audience_profile text,
  audience_group text,
  subject text,
  body text NOT NULL,
  body_snippet text,
  channels_in_app boolean NOT NULL DEFAULT false,
  channels_email boolean NOT NULL DEFAULT false,
  channels_sms boolean NOT NULL DEFAULT false,
  recipient_count int NOT NULL DEFAULT 0,
  result_in_app_sent boolean,
  result_in_app_thread_id uuid,
  result_email_sent int NOT NULL DEFAULT 0,
  result_email_failed int NOT NULL DEFAULT 0,
  result_sms_sent int NOT NULL DEFAULT 0,
  result_sms_failed int NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_admin_blast_log_sent_by ON admin_blast_log (sent_by_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_blast_log_sent_at ON admin_blast_log (sent_at DESC);

COMMENT ON TABLE admin_blast_log IS 'Log of each blast sent from Admin → Messaging for Sent list.';
```

## 2. Folders (organize threads)

```sql
CREATE TABLE IF NOT EXISTS messaging_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_messaging_folders_user ON messaging_folders (user_id);

CREATE TABLE IF NOT EXISTS messaging_folder_threads (
  folder_id uuid NOT NULL REFERENCES messaging_folders(id) ON DELETE CASCADE,
  thread_id uuid NOT NULL REFERENCES messaging_threads(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (folder_id, thread_id)
);

CREATE INDEX IF NOT EXISTS idx_messaging_folder_threads_folder ON messaging_folder_threads (folder_id);
CREATE INDEX IF NOT EXISTS idx_messaging_folder_threads_thread ON messaging_folder_threads (thread_id);

COMMENT ON TABLE messaging_folders IS 'User-created folders to organize threads (e.g. Blue, NHSCA, Urgent).';
COMMENT ON TABLE messaging_folder_threads IS 'Which threads are in which folder.';
```

After running, Admin → Messaging will show **Sent** (full history) and **Folders** (create folders, assign threads, view by folder).
