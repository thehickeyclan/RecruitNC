"use client"

import { Checkbox } from "@/components/ui/checkbox"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { HardLink } from "@/components/hard-link"
import { NC_UNITED_CODE, NC_UNITED_CODE_HREF } from "@/lib/nc-united-code"
import { cn } from "@/lib/utils"

export const NC_UNITED_CODE_ACK_ID = "nc-united-code-ack"

export function NcUnitedCodeAcknowledgment({
  checked,
  onCheckedChange,
  variant = "light",
  disabled = false,
  highlighted = false,
  className,
}: {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  variant?: "light" | "dark"
  disabled?: boolean
  highlighted?: boolean
  className?: string
}) {
  const isDark = variant === "dark"

  return (
    <label
      id={NC_UNITED_CODE_ACK_ID}
      tabIndex={-1}
      className={cn(
        "flex items-start gap-3 rounded-lg border px-3 py-3 cursor-pointer scroll-mt-24 outline-none transition-shadow",
        isDark
          ? "border-[#B31B1B]/30 bg-[#B31B1B]/10 text-white/85"
          : "border-gray-200 bg-gray-50 text-gray-700",
        disabled && "cursor-not-allowed opacity-60",
        highlighted &&
          (isDark ? "ring-2 ring-[#FF7070] shadow-[0_0_0_3px_rgba(179,27,27,0.25)]" : "ring-2 ring-amber-500"),
        className,
      )}
    >
      <Checkbox
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
        disabled={disabled}
        className={cn(
          "mt-0.5",
          isDark && "border-white/40 data-[state=checked]:bg-[#B31B1B] data-[state=checked]:border-[#B31B1B]",
        )}
        aria-required
      />
      <span className="text-sm leading-relaxed">
        I have read the{" "}
        <span onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
          <HardLink
            href={NC_UNITED_CODE_HREF}
            className={cn(
              "font-semibold underline underline-offset-2",
              isDark ? "text-[#FF7070] hover:text-white" : "text-[#003366] hover:text-[#B31B1B]",
            )}
          >
            {NC_UNITED_CODE.title}
          </HardLink>
        </span>{" "}
        and agree that our athlete will represent North Carolina according to these standards — on the mat, mat-side,
        at the hotel, online, and everywhere we travel as NC United.
      </span>
    </label>
  )
}

export function NcUnitedCodeConductRequiredDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const focusAcknowledgment = () => {
    onOpenChange(false)
    requestAnimationFrame(() => {
      const el = document.getElementById(NC_UNITED_CODE_ACK_ID)
      el?.scrollIntoView({ behavior: "smooth", block: "center" })
      el?.focus()
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Read and acknowledge the {NC_UNITED_CODE.title}</AlertDialogTitle>
          <AlertDialogDescription className="text-left space-y-2">
            <span className="block">
              Before payment, a parent or guardian must read the NC United Code and check the acknowledgment box on
              the registration form.
            </span>
            <span className="block">
              The Code covers team standards, travel and hotel conduct, mat-side behavior, social media, and
              representing North Carolina the right way.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-between gap-2">
          <HardLink
            href={NC_UNITED_CODE_HREF}
            className="inline-flex min-h-[44px] items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
          >
            Read the full Code
          </HardLink>
          <AlertDialogAction
            type="button"
            onClick={focusAcknowledgment}
            className="bg-[#003366] hover:bg-[#003366]/90"
          >
            OK — I&apos;ll acknowledge below
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
