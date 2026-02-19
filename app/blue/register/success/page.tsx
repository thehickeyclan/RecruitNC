"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function BlueRegisterSuccessPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        <Card className="border-2 border-[#D3B574]">
          <CardHeader>
            <CardTitle className="text-[#03154C]">You’re in — welcome to NC United Blue</CardTitle>
            <CardDescription>
              Payment complete. Your athlete is signed up and you’re part of an exclusive group. Here’s what to do next:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2 text-sm">
              <p className="font-semibold text-[#03154C]">Practices</p>
              <p className="text-gray-700">
                UNC Fetzer Hall, 210 South Rd, Chapel Hill — <strong>Sundays 1:00–3:00 PM</strong>
              </p>
            </div>
            <div className="space-y-2 text-sm">
              <p className="font-semibold text-[#03154C]">Stay connected</p>
              <p className="text-gray-700">
                Join the <strong>NC United Blue GroupMe</strong> for updates and team chat:{" "}
                <a
                  href="https://groupme.com/join_group/104706096/bU0Ncyo4"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#03154C] underline hover:no-underline"
                >
                  Join NC United Blue on GroupMe
                </a>
              </p>
            </div>
            <div className="space-y-2 text-sm">
              <p className="font-semibold text-[#03154C]">RecruitNC profile</p>
              <p className="text-gray-700">
                If your wrestler doesn’t have a full profile on RecruitNC yet, create one so coaches and colleges can find them.
              </p>
            </div>
            <div className="space-y-2 text-sm">
              <p className="font-semibold text-[#03154C]">Calendar</p>
              <p className="text-gray-700">
                Check the NC United calendar for sessions and events:{" "}
                <a
                  href="https://calendar.ncwrestlingunited.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#03154C] underline hover:no-underline"
                >
                  calendar.ncwrestlingunited.com
                </a>
              </p>
            </div>
            <div className="border-t pt-4 flex flex-col gap-2">
              <Link href="/auth/signin">
                <Button className="w-full bg-[#03154C] hover:bg-[#0a2571] text-white">Sign in to RecruitNC</Button>
              </Link>
              <Link href="/blue">
                <Button variant="outline" className="w-full">Back to Blue program</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
