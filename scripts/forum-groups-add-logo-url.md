# Forum groups: add room/group logo

Run in **Supabase → SQL Editor** to allow uploading a logo for each forum group (room). The Community UI will show this logo in the channel header and in the sidebar next to the group name.

```sql
ALTER TABLE forum_groups ADD COLUMN IF NOT EXISTS logo_url text;
```

After this, use the room header in a channel: hover or tap the group name area to see "Upload logo" (members can upload; image is stored in Vercel Blob and the URL is saved here).
