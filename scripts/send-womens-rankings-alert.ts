/**
 * The women's rankings release alert (Matt, 14 October 2026). One-off, run by hand.
 *
 *   npx tsx scripts/send-womens-rankings-alert.ts          # dry run: prints the alert and audience
 *   npx tsx --conditions=react-server scripts/send-womens-rankings-alert.ts --send   # sends it
 *
 * Opens /rankings, the one rankings path every installed build has; `gender` makes builds with the
 * Men's | Women's switch open on the women's boards. The automatic publish alert is off for the
 * women's boards on purpose (a publish there is not a release), so this is the release alert.
 */
import fs from "fs"
for (const l of fs.readFileSync(".env.local", "utf8").split("\n")) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "")
}

const message = {
  title: "Women's rankings are here",
  body: "The first NC Women's Class of 2027 and 2028 rankings are out, built on freestyle. Tap to see the boards.",
  data: { kind: "rankings", gender: "Female", path: "/rankings" },
}

async function main() {
  const { createClient } = await import("@supabase/supabase-js")
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  })
  const { count } = await admin
    .from("push_devices")
    .select("expo_push_token", { count: "exact", head: true })
    .eq("alert_rankings", true)
  console.log(JSON.stringify(message, null, 2))
  console.log(`Audience: ${count ?? 0} devices with rankings alerts on.`)
  if (!process.argv.includes("--send")) {
    console.log("Dry run. Add --send to send.")
    return
  }
  const { sendToSubscribers } = await import("../lib/push-send")
  const result = await sendToSubscribers("alert_rankings", message)
  console.log("Sent:", JSON.stringify(result))
}
main()
