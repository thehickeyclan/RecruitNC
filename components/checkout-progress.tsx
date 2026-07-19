"use client"

import { Check } from "lucide-react"

interface CheckoutProgressProps {
  currentStep: number
}

export function CheckoutProgress({ currentStep }: CheckoutProgressProps) {
  const steps = [
    { number: 1, label: "Contact" },
    { number: 2, label: "Delivery" },
    { number: 3, label: "Payment" },
  ]

  return (
    <div className="w-full overflow-x-auto pb-1">
      <div className="mx-auto flex min-w-max items-start justify-center px-1 sm:min-w-0">
      {steps.map((step, index) => (
        <div key={step.number} className="flex items-start">
          <div className="flex w-20 flex-col items-center sm:w-28">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors sm:h-10 sm:w-10 ${
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
              className={`mt-2 text-center text-xs leading-tight sm:text-sm ${
                step.number <= currentStep ? "text-foreground font-medium" : "text-muted-foreground"
              }`}
            >
              {step.label}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div
              className={`mx-1 mt-4 h-0.5 w-8 transition-colors sm:mx-2 sm:w-16 md:w-24 ${
                step.number < currentStep ? "bg-primary" : "bg-border"
              }`}
            />
          )}
        </div>
      ))}
      </div>
    </div>
  )
}
