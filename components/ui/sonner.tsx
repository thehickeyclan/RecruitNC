"use client"

import type { ComponentProps } from "react"
import { Toaster as Sonner } from "sonner"

type ToasterProps = ComponentProps<typeof Sonner>

/** Sonner toasts for admin surfaces (dark theme). Mount once in admin layout. */
export function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      theme="dark"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast: "bg-[#0f1c2e] border border-white/15 text-white",
          title: "text-white",
          description: "text-white/80",
          actionButton: "bg-[#D3B574] text-[#0A1628]",
          cancelButton: "bg-white/10 text-white",
        },
      }}
      {...props}
    />
  )
}
