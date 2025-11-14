import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export default function TestLinksPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Match System Test Dashboard</h1>
          <p className="text-gray-600">Test the new direct athlete_id match system</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>🧪 System Tests</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/test/match-system">
                <Button className="w-full">Run API Tests</Button>
              </Link>
              <Link href="/api/athletes/ed26dd22-9533-4acf-ade7-577b41b03337/matches-direct" target="_blank">
                <Button variant="outline" className="w-full bg-transparent">
                  Direct API Test
                </Button>
              </Link>
              <Link href="/debug/check-matches-columns">
                <Button variant="outline" className="w-full bg-transparent">
                  Check Database Status
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>👤 Profile Tests</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/test/athlete-profile-improved/ed26dd22-9533-4acf-ade7-577b41b03337">
                <Button className="w-full">🆕 New Profile System</Button>
              </Link>
              <Link href="/athletes/ed26dd22-9533-4acf-ade7-577b41b03337">
                <Button variant="outline" className="w-full bg-transparent">
                  📊 Current Profile
                </Button>
              </Link>
              <div className="text-sm text-gray-600">Compare loading speeds: New system should be instant!</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>⚙️ Admin Tools</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/admin/backfill-athlete-ids">
                <Button variant="outline" className="w-full bg-transparent">
                  Backfill Status
                </Button>
              </Link>
              <Link href="/admin/match-manager">
                <Button variant="outline" className="w-full bg-transparent">
                  Match Manager
                </Button>
              </Link>
              <Link href="/debug/matches-check">
                <Button variant="outline" className="w-full bg-transparent">
                  Debug Matches
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>📊 System Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">athlete_id Column</span>
                  <Badge className="bg-green-100 text-green-800">✅ Added</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Backfill Complete</span>
                  <Badge className="bg-green-100 text-green-800">151/158</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">New API Ready</span>
                  <Badge className="bg-blue-100 text-blue-800">🧪 Testing</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>🎯 What to Test</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">✅ Should Work</h4>
                <ul className="text-sm space-y-1 text-gray-600">
                  <li>• Instant match data loading</li>
                  <li>• Career totals calculation</li>
                  <li>• Season breakdown display</li>
                  <li>• No name-matching errors</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">🔍 Compare</h4>
                <ul className="text-sm space-y-1 text-gray-600">
                  <li>• Old system: 3-5 second delays</li>
                  <li>• New system: Instant loading</li>
                  <li>• Old system: Complex matching</li>
                  <li>• New system: Direct relationships</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
