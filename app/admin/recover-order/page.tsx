"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

export default function RecoverOrderPage() {
  const [paymentIntentId, setPaymentIntentId] = useState("")
  const [sessionId, setSessionId] = useState("")
  const [isRecovering, setIsRecovering] = useState(false)
  const [lastError, setLastError] = useState<string | null>(null)
  const [lastAlreadyExisted, setLastAlreadyExisted] = useState<string | null>(null)
  const { toast } = useToast()

  const handleRecover = async () => {
    const pi = paymentIntentId.trim()
    const cs = sessionId.trim()
    if (!pi && !cs) {
      toast({
        title: "Error",
        description: "Enter a Payment Intent ID (pi_...) or Checkout Session ID (cs_...)",
        variant: "destructive",
      })
      return
    }

    setIsRecovering(true)
    setLastAlreadyExisted(null)
    setLastError(null)

    try {
      const body = cs ? { sessionId: cs } : { paymentIntentId: pi }
      const response = await fetch("/api/recover-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      })

      const contentType = response.headers.get("content-type")
      const isJson = contentType?.includes("application/json")
      const data = isJson ? await response.json() : { success: false, error: `Server returned ${response.status}` }

      if (data.success) {
        setLastError(null)
        if (data.alreadyExisted) {
          setLastAlreadyExisted(data.orderNumber ?? null)
          toast({
            title: "Order already exists",
            description: `This order is already in the database (Order #${data.orderNumber}). No recovery was needed.`,
            variant: "default",
          })
        } else {
          setLastAlreadyExisted(null)
          toast({
            title: "Success!",
            description: `Order created successfully! Order #: ${data.orderNumber}`,
          })
        }
        setPaymentIntentId("")
        setSessionId("")
      } else {
        setLastAlreadyExisted(null)
        const errorMsg = data.error || "Failed to recover order"
        setLastError(errorMsg)
        toast({
          title: "Recover failed",
          description: errorMsg,
          variant: "destructive",
        })
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to recover order"
      setLastError(msg)
      toast({
        title: "Error",
        description: msg,
        variant: "destructive",
      })
    } finally {
      setIsRecovering(false)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Recover Missing Order</CardTitle>
          <CardDescription>
            Recover an order from a Stripe Payment Intent ID (starts with pi_). Useful when a payment succeeded but the order wasn&apos;t created. We try: (1) order data on the Payment Intent, (2) linked Checkout Session (line items + customer), (3) minimal order from the charge (amount + billing details).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="payment-intent-id" className="text-sm font-medium">
              Payment Intent ID
            </label>
            <Input
              id="payment-intent-id"
              value={paymentIntentId}
              onChange={(e) => setPaymentIntentId(e.target.value)}
              placeholder="pi_3SaJj6P30On92r5U1GTudcJd"
            />
            <p className="text-xs text-muted-foreground">
              From Stripe (starts with pi_). We also look up the linked Checkout Session if needed.
            </p>
          </div>
          <div className="space-y-2">
            <label htmlFor="session-id" className="text-sm font-medium">
              Or Checkout Session ID (optional)
            </label>
            <Input
              id="session-id"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              placeholder="cs_..."
            />
            <p className="text-xs text-muted-foreground">
              If you have the Session ID (cs_...), use this and leave Payment Intent blank to recover from the session.
            </p>
          </div>

          <Button onClick={handleRecover} disabled={isRecovering} className="w-full">
            {isRecovering ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Recovering Order...
              </>
            ) : (
              "Recover Order"
            )}
          </Button>

          {lastAlreadyExisted && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <p className="font-medium">Order already in database</p>
              <p className="mt-1">Order #{lastAlreadyExisted} already exists. No recovery was needed.</p>
            </div>
          )}
          {lastError && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              <p className="font-medium">Error:</p>
              <p className="mt-1 break-all">{lastError}</p>
            </div>
          )}

          <div className="mt-4 p-4 bg-muted rounded-lg">
            <p className="text-sm font-medium mb-2">What this does:</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Fetches Payment Intent; if no order metadata, looks up linked Checkout Session or uses charge billing details</li>
              <li>Creates the order and order items in your database</li>
              <li>Confirmation email is not sent for recovered orders</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
