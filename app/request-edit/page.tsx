import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function RequestEditPage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">How to Request Edits</h1>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Request Updates to Athlete Profiles</CardTitle>
          <CardDescription>
            Follow these steps to request updates to existing athlete profiles in our database.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <h3 className="text-lg font-medium">1. Navigate to an athlete's profile</h3>
            <p className="text-gray-600">
              Find the athlete profile you want to update by browsing our <Link href="/prospects/all" className="text-blue-600 hover:underline">prospects directory</Link> or using the search function.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-medium">2. Click the "Request Edit" button</h3>
            <p className="text-gray-600">
              On the athlete's profile page, you'll find a "Request Edit" button. Click this to open the edit request
              form. You don't need to be signed in to request edits.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-medium">3. Submit your requested changes</h3>
            <p className="text-gray-600">
              Fill out the form with the information that needs to be updated. Be as specific as possible and provide
              any supporting evidence or links if available.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-medium">4. Wait for review</h3>
            <p className="text-gray-600">
              Our team will review your request and make the appropriate changes if approved. You'll receive a
              notification when your request has been processed.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center gap-4">
        <Link href="/submit-commitment">
          <Button className="bg-red-600 hover:bg-red-700">Submit New Commitment</Button>
        </Link>
        <Link href="/">
          <Button variant="outline">Return to Home</Button>
        </Link>
      </div>
    </main>
  )
}
