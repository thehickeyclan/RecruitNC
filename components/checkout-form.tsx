"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useStripe, useElements, PaymentElement } from "@stripe/react-stripe-js"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { createOrderFromPaymentIntent } from "@/app/actions/stripe"

interface CheckoutFormProps {
  clientSecret: string
  total: number
}

export function CheckoutForm({ clientSecret, total }: CheckoutFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const router = useRouter()
  const { toast } = useToast()
  const [isProcessing, setIsProcessing] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setIsProcessing(true)

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${typeof window !== "undefined" ? window.location.origin : ""}/checkout/confirmation`,
        },
        redirect: "if_required",
      })

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message || "Your payment could not be processed. Please try again.",
          variant: "destructive",
        })
        setIsProcessing(false)
        return
      }

      if (paymentIntent?.status === "succeeded" && paymentIntent.id) {
        const pendingOrderId =
          typeof window !== "undefined" ? sessionStorage.getItem("store_pending_order_id") : null
        if (pendingOrderId) {
          try {
            sessionStorage.removeItem("store_pending_order_id")
          } catch {
            // ignore
          }
          window.location.href = `/checkout/confirmation?order_id=${pendingOrderId}`
          return
        }
        try {
          const orderResult = await createOrderFromPaymentIntent(paymentIntent.id)
          if (orderResult.success && orderResult.orderId) {
            window.location.href = `/checkout/confirmation?order_id=${orderResult.orderId}`
          } else {
            window.location.href = `/checkout/confirmation?payment_intent=${paymentIntent.id}`
          }
        } catch {
          window.location.href = `/checkout/confirmation?payment_intent=${paymentIntent.id}`
        }
      } else if (paymentIntent?.status === "requires_action") {
        // 3DS or other action – Stripe may redirect; keep processing state until redirect
      }
    } catch (err) {
      toast({
        title: "Payment Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
      setIsProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement
        options={{
          wallets: {
            applePay: "auto",
            googlePay: "auto",
          },
        }}
      />
      <Button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full bg-[#003366] hover:bg-[#003366]/90 text-white"
      >
        {isProcessing ? "Processing..." : `Pay $${total.toFixed(2)}`}
      </Button>
    </form>
  )
}
