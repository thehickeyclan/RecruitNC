"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createClient } from "@/lib/supabase/client"

export function PhoneSignIn() {
  const [phoneNumber, setPhoneNumber] = useState("")
  const [verificationCode, setVerificationCode] = useState("")
  const [step, setStep] = useState<"phone" | "verification">("phone")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const formattedPhone = phoneNumber.startsWith("+") ? phoneNumber : `+1${phoneNumber}`

      const { error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
        options: {
          // When magic-link-like SMS is used, confirmation redirects here
          // Not all SMS flows use redirect, but it's safe to include
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        setError(error.message)
        setIsLoading(false)
        return
      }

      setStep("verification")
    } catch (err) {
      console.error("Error sending verification code:", err)
      setError("Failed to send verification code. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const formattedPhone = phoneNumber.startsWith("+") ? phoneNumber : `+1${phoneNumber}`

      const { error } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token: verificationCode,
        type: "sms",
      })

      if (error) {
        setError(error.message)
        setIsLoading(false)
        return
      }

      // Sync server cookies so APIs immediately see your user
      await fetch("/auth/callback", { method: "POST" })
    } catch (err) {
      console.error("Error verifying code:", err)
      setError("Failed to verify code. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {step === "phone" ? (
        <form onSubmit={handleSendCode} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="(555) 555-5555"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              By entering your phone number and clicking "Send verification code", you consent to receive a one-time SMS
              verification code. Standard message and data rates may apply.
            </p>
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Sending..." : "Send verification code"}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleVerifyCode} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">Verification Code</Label>
            <Input
              id="code"
              type="text"
              placeholder="123456"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              required
            />
            <div className="flex justify-between">
              <Button
                type="button"
                variant="link"
                className="px-0"
                onClick={() => setStep("phone")}
                disabled={isLoading}
              >
                Change phone number
              </Button>
              <Button type="button" variant="link" className="px-0" onClick={handleSendCode} disabled={isLoading}>
                Resend code
              </Button>
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Verifying..." : "Verify"}
          </Button>
        </form>
      )}
    </div>
  )
}
