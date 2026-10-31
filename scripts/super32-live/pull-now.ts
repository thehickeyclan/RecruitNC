/** Runs the auto-pull once from a laptop: npx tsx --conditions=react-server --env-file=.env.local scripts/super32-live/pull-now.ts */
import { createClient } from "@supabase/supabase-js"
import { pullAndPublish } from "@/lib/super32-live/auto-pull"
pullAndPublish(createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!) as any)
  .then((o) => console.log(JSON.stringify(o)))
  .catch((e) => { console.error(e); process.exit(1) })
