"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

export default function RecoverOrderPage() {
  const [paymentIntentId, setPaymentIntentId] = useState("")
  const [isRecovering, setIsRecovering] = useState(false)
  const [lastError, setLastError] = useState<string | null>(null)
  const { toast } = useToast()

  const handleRecover = async () => {
    if (!paymentIntentId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a Payment Intent ID",
        variant: "destructive",
      })
      return
    }

    setIsRecovering(true)

    try {
      const response = await fetch("/api/recover-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ paymentIntentId: paymentIntentId.trim() }),
      })

      const contentType = response.headers.get("content-type")
      const isJson = contentType?.includes("application/json")
      const data = isJson ? await response.json() : { success: false, error: `Server returned ${response.status}` }

      if (data.success) {
        setLastError(null)
        toast({
          title: "Success!",
          description: `Order created successfully! Order #: ${data.orderNumber}`,
        })
        setPaymentIntentId("")
      } else {
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
            Recover an order from a Stripe Payment Intent ID. This is useful when a payment succeeded but the order wasn't created in the database.
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
              The Payment Intent ID from Stripe (starts with "pi_")
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

          {lastError && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              <p className="font-medium">Error:</p>
              <p className="mt-1 break-all">{lastError}</p>
            </div>
          )}

          <div className="mt-4 p-4 bg-muted rounded-lg">
            <p className="text-sm font-medium mb-2">What this does:</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Fetches order details from Stripe Payment Intent</li>
              <li>Creates the order in your database</li>
              <li>Creates order items</li>
              <li>Reduces inventory stock automatically</li>
              <li>Sends confirmation email (if configured)</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
