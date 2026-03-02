"use client"

import { Check } from "lucide-react"

interface CheckoutProgressProps {
  currentStep: number
}

export function CheckoutProgress({ currentStep }: CheckoutProgressProps) {
  const steps = [
    { number: 1, label: "Shipping" },
    { number: 2, label: "Shipping Method" },
    { number: 3, label: "Payment" },
  ]

  return (
    <div className="flex items-center justify-center">
      {steps.map((step, index) => (
        <div key={step.number} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                step.number < currentStep
                  ? "bg-primary border-primary text-white"
                  : step.number === currentStep
                    ? "bg-primary border-primary text-white"
                    : "bg-white border-border text-muted-foreground"
              }`}
            >
              {step.number < currentStep ? (
                <Check className="w-5 h-5" />
              ) : (
                <span className="font-semibold">{step.number}</span>
              )}
            </div>
            <span
              className={`text-sm mt-2 ${
                step.number <= currentStep ? "text-foreground font-medium" : "text-muted-foreground"
              }`}
            >
              {step.label}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div
              className={`w-24 h-0.5 mx-4 mb-6 transition-colors ${
                step.number < currentStep ? "bg-primary" : "bg-border"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  )
}
