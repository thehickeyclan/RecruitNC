"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  AAU_SCHOLASTIC_CHECKOUT_LINES,
  AAU_SCHOLASTIC_DEFAULT_SELECTED_LINE_IDS,
  aauScholasticLinesFromSelectedIds,
  formatAauScholasticDollars,
  sumAauScholasticLines,
} from "@/lib/aau-scholastic-duals-2026-content"
import { aauLinkClass, aauPriceClass } from "@/components/national-team/aau-scholastic-theme"
import { cn } from "@/lib/utils"

type Props = {
  selectedIds: string[]
  onChange: (ids: string[]) => void
  disabled?: boolean
  error?: string | null
  /** Light card on gray register shell (NHSCA-style); default dark for AAU portal. */
  variant?: "dark" | "light"
}

export function AauScholasticCheckoutItems({
  selectedIds,
  onChange,
  disabled,
  error,
  variant = "dark",
}: Props) {
  const selectedSet = new Set(selectedIds)
  const total = sumAauScholasticLines(aauScholasticLinesFromSelectedIds(selectedIds))
  const isDark = variant === "dark"

  const toggle = (id: string, checked: boolean) => {
    if (checked) {
      onChange([...new Set([...selectedIds, id])])
      return
    }
    onChange(selectedIds.filter((x) => x !== id))
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={isDark ? "text-sm font-semibold text-white" : "text-sm font-semibold text-[#002147]"}>
          Select items for checkout
        </p>
        <button
          type="button"
          className={
            isDark
              ? cn("text-xs font-medium hover:underline disabled:opacity-50", aauLinkClass)
              : "text-xs font-medium text-[#003366] hover:underline disabled:opacity-50"
          }
          disabled={disabled}
          onClick={() => onChange([...AAU_SCHOLASTIC_DEFAULT_SELECTED_LINE_IDS])}
        >
          Select all
        </button>
      </div>
      <ul
        className={
          isDark
            ? "divide-y divide-[#B31B1B]/15 rounded-lg border border-[#B31B1B]/25 bg-[#0a2040]/60 overflow-hidden"
            : "divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white overflow-hidden"
        }
      >
        {AAU_SCHOLASTIC_CHECKOUT_LINES.map((line) => {
          const checked = selectedSet.has(line.id)
          const inputId = `aau-checkout-${line.id}`
          return (
            <li key={line.id}>
              <Label
                htmlFor={inputId}
                className={
                  isDark
                    ? "flex cursor-pointer items-start gap-3 px-4 py-3 hover:bg-white/[0.04] has-[[data-disabled=true]]:cursor-not-allowed"
                    : "flex cursor-pointer items-start gap-3 px-4 py-3 hover:bg-gray-50/80 has-[[data-disabled=true]]:cursor-not-allowed"
                }
              >
                <Checkbox
                  id={inputId}
                  checked={checked}
                  disabled={disabled}
                  onCheckedChange={(v) => toggle(line.id, v === true)}
                  className="mt-0.5"
                />
                <span className="flex-1 min-w-0">
                  <span className={isDark ? "block text-sm font-medium text-white/90" : "block text-sm font-medium text-gray-800"}>
                    {line.label}
                  </span>
                </span>
                <span
                  className={
                    isDark
                      ? cn("text-sm font-semibold tabular-nums shrink-0", aauPriceClass)
                      : "text-sm font-semibold text-[#002147] tabular-nums shrink-0"
                  }
                >
                  {formatAauScholasticDollars(line.dollars)}
                </span>
              </Label>
            </li>
          )
        })}
      </ul>
      <p className={isDark ? cn("text-sm font-bold text-right tabular-nums", aauPriceClass) : "text-sm font-bold text-[#003366] text-right tabular-nums"}>
        Checkout total: {formatAauScholasticDollars(total)}
      </p>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <p className={isDark ? "text-xs text-white/50" : "text-xs text-gray-500"}>
        Travel (hotel/van, flight) is not included here — see pricing on the Scholastic Duals info page.
      </p>
    </div>
  )
}

export { AAU_SCHOLASTIC_DEFAULT_SELECTED_LINE_IDS }
