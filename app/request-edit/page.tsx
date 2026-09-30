import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

/**
 * Two paths, and the page used to describe only the slow one.
 *
 * A wrestler or a linked parent now edits the profile directly - school, club, cell, highlight
 * video, GPA, SAT, ACT and weight all save on the spot. Everyone else still files a request that
 * a person reads. Telling a family to "wait for review" when they could have typed it themselves
 * sends the people with instant access down the queue, which is where requests go to wait.
 */
export default function RequestEditPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">Updating a profile</h1>

      <Card className="mb-6 border-[#D3B574]/50">
        <CardHeader>
          <CardTitle>If it is your profile, or your wrestler&apos;s</CardTitle>
          <CardDescription>You do not need to request anything. Your changes save immediately.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-gray-600">
          <p>
            Sign in, open the profile, and use the pencil. School, club, cell number, highlight
            video, GPA, SAT, ACT and weight class all save straight away — no review, no waiting.
          </p>
          <p>
            Parents: your wrestlers are under{" "}
            <Link href="/profile" className="text-blue-600 hover:underline">
              My wrestlers
            </Link>{" "}
            in your account. If your wrestler is not listed there yet, you can link them from their
            profile page.
          </p>
          <p className="text-sm">
            Achievements and free-text notes are the exception: those are read by a person before
            they go on, because a claim about a result is not the same as a field.
          </p>
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>If it is someone else&apos;s profile</CardTitle>
          <CardDescription>Send a correction and we will check it.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-gray-600">
          <p>
            Open the profile from the{" "}
            <Link href="/prospects/all" className="text-blue-600 hover:underline">
              athlete directory
            </Link>{" "}
            and use <strong>Request Edit</strong>. Say what is wrong and, where you can, link
            something that shows it — a bracket, a results page, a school roster.
          </p>
          <p>
            Corrections to a record or a result are the most useful thing you can send us. Tell us
            which event and which bout, and we will check it against the source.
          </p>
          <p className="text-sm">
            Requests are read by a person, so they are not instant. You will get an email when
            yours is dealt with.
          </p>
        </CardContent>
      </Card>

      <div className="flex flex-wrap justify-center gap-4">
        <Link href="/profile">
          <Button className="bg-red-600 hover:bg-red-700">Go to my account</Button>
        </Link>
        <Link href="/submit-commitment">
          <Button variant="outline">Submit a commitment</Button>
        </Link>
      </div>
    </main>
  )
}
