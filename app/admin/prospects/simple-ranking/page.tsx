import { redirect } from "next/navigation"

/** Retired in favour of /admin/rankings/board. See app/admin/prospects/ranking/page.tsx. */
export default function RetiredSimpleRankingPage() {
  redirect("/admin/rankings/board")
}
