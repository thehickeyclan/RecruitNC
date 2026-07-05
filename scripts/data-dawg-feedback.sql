-- Data Dawg user correction reports ("Hey Data Dawg")
-- Run in Supabase → SQL Editor

CREATE TABLE IF NOT EXISTS data_dawg_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'dismissed')),
  user_query TEXT,
  assistant_response TEXT,
  message_id TEXT,
  correction_notes TEXT NOT NULL,
  submitter_name TEXT,
  submitter_email TEXT,
  page_url TEXT,
  source TEXT DEFAULT 'data_dawg_widget',
  admin_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_data_dawg_feedback_status ON data_dawg_feedback(status);
CREATE INDEX IF NOT EXISTS idx_data_dawg_feedback_created_at ON data_dawg_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_data_dawg_feedback_message_id ON data_dawg_feedback(message_id);

ALTER TABLE data_dawg_feedback ENABLE ROW LEVEL SECURITY;
