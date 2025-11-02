"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Clock, Mail, CheckCircle } from "lucide-react"
import Link from "next/link"

export default function CoachVerificationPendingPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Clock className="h-12 w-12 text-blue-600 mx-auto mb-4" />
          <CardTitle className="text-2xl">Verification Pending</CardTitle>
          <CardDescription>Your coach verification request is being reviewed</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-sm">Account created successfully</span>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-blue-600" />
              <span className="text-sm">Email verification sent</span>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-yellow-600" />
              <span className="text-sm">Coach verification pending</span>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">What happens next?</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>1. Check your email and verify your account</li>
              <li>2. Our team will review your coaching credentials</li>
              <li>3. You'll receive an email when verification is complete</li>
              <li>4. Once verified, you'll have access to coach features</li>
            </ul>
          </div>

          <div className="text-center">
            <Button asChild>
              <Link href="/auth/signin">Continue to Sign In</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
