-- NHSCA Team Hub — heart likes on shared media (run after nhsca_hub_media exists).

CREATE TABLE IF NOT EXISTS nhsca_hub_media_likes (
  media_id UUID NOT NULL REFERENCES nhsca_hub_media(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (media_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_nhsca_hub_media_likes_media
  ON nhsca_hub_media_likes (media_id);

COMMENT ON TABLE nhsca_hub_media_likes IS 'NHSCA hub media — one like per signed-in user per photo/video.';
