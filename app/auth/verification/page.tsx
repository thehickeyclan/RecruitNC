"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Mail, CheckCircle, XCircle } from "lucide-react"

export default function VerificationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<"pending" | "success" | "error">("pending")
  const [message, setMessage] = useState("")
  const [isResending, setIsResending] = useState(false)

  useEffect(() => {
    const error = searchParams.get("error")
    const success = searchParams.get("success")

    if (error) {
      setStatus("error")
      setMessage("There was an error verifying your email. Please try again.")
    } else if (success) {
      setStatus("success")
      setMessage("Your email has been verified! You can now sign in.")
      // Redirect to sign in after 3 seconds
      setTimeout(() => {
        router.push("/auth/signin")
      }, 3000)
    }
  }, [searchParams, router])

  const handleResendVerification = async () => {
    setIsResending(true)
    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (response.ok) {
        setMessage("Verification email sent! Please check your inbox.")
      } else {
        setMessage(data.error || "Failed to resend verification email")
      }
    } catch (error) {
      setMessage("An error occurred while resending the verification email")
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="container mx-auto flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-6">
          <div className="space-y-6 text-center">
            {status === "pending" && (
              <>
                <div className="flex justify-center">
                  <Mail className="h-12 w-12 text-blue-600" />
                </div>
                <div className="space-y-2">
                  <h1 className="text-2xl font-semibold tracking-tight">Check your email</h1>
                  <p className="text-sm text-muted-foreground">
                    We've sent a verification link to your email address. Please click the link to verify your account.
                  </p>
                </div>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Didn't receive the email? Check your spam folder or click below to resend.
                  </p>
                  <Button
                    onClick={handleResendVerification}
                    variant="outline"
                    disabled={isResending}
                    className="w-full bg-transparent"
                  >
                    {isResending ? "Sending..." : "Resend verification email"}
                  </Button>
                </div>
              </>
            )}

            {status === "success" && (
              <>
                <div className="flex justify-center">
                  <CheckCircle className="h-12 w-12 text-green-600" />
                </div>
                <div className="space-y-2">
                  <h1 className="text-2xl font-semibold tracking-tight">Email verified!</h1>
                  <p className="text-sm text-muted-foreground">
                    Your account has been successfully verified. Redirecting you to sign in...
                  </p>
                </div>
                <Alert>
                  <AlertDescription>{message}</AlertDescription>
                </Alert>
              </>
            )}

            {status === "error" && (
              <>
                <div className="flex justify-center">
                  <XCircle className="h-12 w-12 text-red-600" />
                </div>
                <div className="space-y-2">
                  <h1 className="text-2xl font-semibold tracking-tight">Verification failed</h1>
                  <p className="text-sm text-muted-foreground">There was a problem verifying your email address.</p>
                </div>
                <Alert variant="destructive">
                  <AlertDescription>{message}</AlertDescription>
                </Alert>
                <Button onClick={handleResendVerification} disabled={isResending} className="w-full">
                  {isResending ? "Sending..." : "Resend verification email"}
                </Button>
              </>
            )}

            <div className="text-center text-sm">
              <Link href="/auth/signin" className="text-blue-600 hover:underline">
                Back to sign in
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
