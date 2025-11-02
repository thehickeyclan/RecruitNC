import DemoRankingsClient from "./client-page"

// Force dynamic rendering to avoid prerendering issues with auth
export const dynamic = "force-dynamic"

export default function DemoRankingsPage() {
  return <DemoRankingsClient />
}
