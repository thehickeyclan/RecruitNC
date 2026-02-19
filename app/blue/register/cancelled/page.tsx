"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function BlueRegisterCancelledPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="text-[#03154C]">Payment cancelled</CardTitle>
          <CardDescription>
            You didn’t complete payment. Your registration is saved. If you want to join Blue, contact us for a new payment link or try again with your original invite link.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/blue">
            <Button variant="outline" className="w-full">Back to Blue program</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
