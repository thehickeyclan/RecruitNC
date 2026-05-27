"use client"

import { Minus, Plus } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AAU_SCHOLASTIC_CHECKOUT_LINES,
  AAU_SCHOLASTIC_MAX_LINE_QUANTITY,
  AAU_SCHOLASTIC_TRAVEL_LINES,
  aauScholasticApparelLineSelected,
  aauScholasticDefaultLineQuantities,
  aauScholasticFullBundleLineQuantities,
  aauScholasticLineQuantitiesFromRecord,
  aauScholasticLineSelectionsFromQuantities,
  formatAauScholasticDollars,
  AAU_SCHOLASTIC_GEAR_REUSE_NOTE,
  AAU_SCHOLASTIC_MEALS_NOT_INCLUDED,
  sumAauScholasticSelections,
  type AauScholasticApparelSizesInput,
  type AauScholasticPriceLine,
} from "@/lib/aau-scholastic-duals-2026-content"
import { NHSCA_HUB_GEAR_SIZES } from "@/lib/nhsca-hub-checkout-pricing"
import { aauLinkClass, aauFormLabelClass, aauPriceClass } from "@/components/national-team/aau-scholastic-theme"
import { cn } from "@/lib/utils"

const NONE = "__none__"

type Props = {
  lineQuantities: Record<string, number>
  onChange: (lineQuantities: Record<string, number>) => void
  apparelSizes: AauScholasticApparelSizesInput
  onApparelSizesChange: (sizes: AauScholasticApparelSizesInput) => void
  disabled?: boolean
  error?: string | null
  sizesError?: string | null
  variant?: "dark" | "light"
}

function QuantityStepper({
  value,
  onChange,
  disabled,
  isDark,
  inputId,
}: {
  value: number
  onChange: (next: number) => void
  disabled?: boolean
  isDark: boolean
  inputId: string
}) {
  const dec = () => onChange(Math.max(1, value - 1))
  const inc = () => onChange(Math.min(AAU_SCHOLASTIC_MAX_LINE_QUANTITY, value + 1))

  const btnClass = isDark
    ? "inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#B31B1B]/30 bg-[#0a2040] text-white hover:bg-[#B31B1B]/20 disabled:opacity-40"
    : "inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 disabled:opacity-40"

  return (
    <div className="flex items-center gap-1 shrink-0" role="group" aria-label="Quantity">
      <button type="button" className={btnClass} disabled={disabled || value <= 1} onClick={dec} aria-label="Decrease quantity">
        <Minus className="h-3.5 w-3.5" />
      </button>
      <label htmlFor={inputId} className="sr-only">
        Quantity
      </label>
      <input
        id={inputId}
        type="number"
        min={1}
        max={AAU_SCHOLASTIC_MAX_LINE_QUANTITY}
        value={value}
        disabled={disabled}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10)
          if (!Number.isFinite(n)) return
          onChange(Math.min(AAU_SCHOLASTIC_MAX_LINE_QUANTITY, Math.max(1, n)))
        }}
        className={
          isDark
            ? "h-8 w-10 rounded-md border border-[#B31B1B]/30 bg-[#0a2040] text-center text-sm font-semibold text-white tabular-nums"
            : "h-8 w-10 rounded-md border border-gray-300 bg-white text-center text-sm font-semibold text-gray-900 tabular-nums"
        }
      />
      <button type="button" className={btnClass} disabled={disabled || value >= AAU_SCHOLASTIC_MAX_LINE_QUANTITY} onClick={inc} aria-label="Increase quantity">
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

function GearSizeSelect({
  label,
  value,
  onChange,
  disabled,
  isDark,
  id,
  required,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  disabled?: boolean
  isDark: boolean
  id: string
  required?: boolean
}) {
  const triggerClass = isDark
    ? "min-h-[44px] bg-[#0a2040] border-[#B31B1B]/25 text-white"
    : undefined

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className={isDark ? aauFormLabelClass : undefined}>
        {label}
        {required ? " *" : null}
      </Label>
      <Select value={value || NONE} onValueChange={(v) => onChange(v === NONE ? "" : v)} disabled={disabled}>
        <SelectTrigger id={id} className={triggerClass}>
          <SelectValue placeholder="Select size" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>Select size</SelectItem>
          {NHSCA_HUB_GEAR_SIZES.map((s) => (
            <SelectItem key={s} value={s}>
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function LineGroup({
  title,
  lines,
  lineQuantities,
  disabled,
  isDark,
  onToggle,
  onQuantityChange,
}: {
  title: string
  lines: AauScholasticPriceLine[]
  lineQuantities: Record<string, number>
  disabled?: boolean
  isDark: boolean
  onToggle: (id: string, checked: boolean) => void
  onQuantityChange: (id: string, quantity: number) => void
}) {
  return (
    <div className="space-y-2">
      <p
        className={
          isDark
            ? "text-xs font-semibold uppercase tracking-wide text-[#FF7070]"
            : "text-xs font-semibold uppercase tracking-wide text-[#003366]"
        }
      >
        {title}
      </p>
      <ul
        className={
          isDark
            ? "divide-y divide-[#B31B1B]/15 rounded-lg border border-[#B31B1B]/25 bg-[#0a2040]/60 overflow-hidden"
            : "divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white overflow-hidden"
        }
      >
        {lines.map((line) => {
          const qty = lineQuantities[line.id] ?? 0
          const checked = qty > 0
          const inputId = `aau-checkout-${line.id}`
          const qtyInputId = `aau-checkout-qty-${line.id}`
          const lineTotal = checked ? line.dollars * qty : line.dollars

          return (
            <li key={line.id}>
              <div
                className={
                  isDark
                    ? "flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-white/[0.04]"
                    : "flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-gray-50/80"
                }
              >
                <Label
                  htmlFor={inputId}
                  className="flex flex-1 min-w-[180px] cursor-pointer items-start gap-3 has-[[data-disabled=true]]:cursor-not-allowed"
                >
                  <Checkbox
                    id={inputId}
                    checked={checked}
                    disabled={disabled}
                    onCheckedChange={(v) => onToggle(line.id, v === true)}
                    className="mt-0.5"
                  />
                  <span className="flex-1 min-w-0">
                    <span
                      className={
                        isDark
                          ? "block text-sm font-medium text-white/90"
                          : "block text-sm font-medium text-gray-800"
                      }
                    >
                      {line.label}
                    </span>
                    <span className={isDark ? "text-xs text-white/45" : "text-xs text-gray-500"}>
                      {formatAauScholasticDollars(line.dollars)} each
                    </span>
                  </span>
                </Label>
                {checked ? (
                  <QuantityStepper
                    value={qty}
                    onChange={(n) => onQuantityChange(line.id, n)}
                    disabled={disabled}
                    isDark={isDark}
                    inputId={qtyInputId}
                  />
                ) : null}
                <span
                  className={
                    isDark
                      ? cn("text-sm font-semibold tabular-nums shrink-0 min-w-[4rem] text-right", aauPriceClass)
                      : "text-sm font-semibold text-[#002147] tabular-nums shrink-0 min-w-[4rem] text-right"
                  }
                >
                  {checked ? formatAauScholasticDollars(lineTotal) : formatAauScholasticDollars(line.dollars)}
                </span>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function AauScholasticCheckoutItems({
  lineQuantities,
  onChange,
  apparelSizes,
  onApparelSizesChange,
  disabled,
  error,
  sizesError,
  variant = "dark",
}: Props) {
  const isDark = variant === "dark"
  const selections = aauScholasticLineSelectionsFromQuantities(aauScholasticLineQuantitiesFromRecord(lineQuantities))
  const total = sumAauScholasticSelections(selections)

  const showSinglet = aauScholasticApparelLineSelected(lineQuantities, "singlet")
  const showShorts = aauScholasticApparelLineSelected(lineQuantities, "shorts")
  const showLongSleeve = aauScholasticApparelLineSelected(lineQuantities, "long_sleeve")
  const showTee = aauScholasticApparelLineSelected(lineQuantities, "tee")
  const showApparelSizes = showSinglet || showShorts || showLongSleeve || showTee

  const toggle = (id: string, checked: boolean) => {
    const next = { ...lineQuantities }
    if (checked) next[id] = 1
    else delete next[id]
    onChange(next)
  }

  const setQuantity = (id: string, quantity: number) => {
    onChange({ ...lineQuantities, [id]: quantity })
  }

  const patchSize = (key: keyof AauScholasticApparelSizesInput, value: string) => {
    onApparelSizesChange({ ...apparelSizes, [key]: value })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={isDark ? "text-sm font-semibold text-white" : "text-sm font-semibold text-[#002147]"}>
          Select items for checkout (à la carte)
        </p>
        <button
          type="button"
          className={
            isDark
              ? cn("text-xs font-medium hover:underline disabled:opacity-50", aauLinkClass)
              : "text-xs font-medium text-[#003366] hover:underline disabled:opacity-50"
          }
          disabled={disabled}
          onClick={() => onChange(aauScholasticFullBundleLineQuantities())}
        >
          Select all items
        </button>
      </div>

      <LineGroup
        title="Registration & apparel"
        lines={AAU_SCHOLASTIC_CHECKOUT_LINES}
        lineQuantities={lineQuantities}
        disabled={disabled}
        isDark={isDark}
        onToggle={toggle}
        onQuantityChange={setQuantity}
      />
      <LineGroup
        title="Travel"
        lines={AAU_SCHOLASTIC_TRAVEL_LINES}
        lineQuantities={lineQuantities}
        disabled={disabled}
        isDark={isDark}
        onToggle={toggle}
        onQuantityChange={setQuantity}
      />

      {showApparelSizes ? (
        <div
          className={
            isDark
              ? "rounded-lg border border-[#B31B1B]/25 bg-[#0a2040]/40 p-4 space-y-3"
              : "rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3"
          }
        >
          <p className={isDark ? "text-sm font-semibold text-white" : "text-sm font-semibold text-[#002147]"}>
            Apparel sizes
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {showSinglet ? (
              <GearSizeSelect
                id="aau-singlet-size"
                label="Singlet"
                value={apparelSizes.singletSize}
                onChange={(v) => patchSize("singletSize", v)}
                disabled={disabled}
                isDark={isDark}
                required
              />
            ) : null}
            {showShorts ? (
              <GearSizeSelect
                id="aau-shorts-size"
                label="Shorts"
                value={apparelSizes.shortsSize}
                onChange={(v) => patchSize("shortsSize", v)}
                disabled={disabled}
                isDark={isDark}
                required
              />
            ) : null}
            {showLongSleeve ? (
              <GearSizeSelect
                id="aau-long-sleeve-size"
                label="Long sleeve"
                value={apparelSizes.longSleeveSize}
                onChange={(v) => patchSize("longSleeveSize", v)}
                disabled={disabled}
                isDark={isDark}
                required
              />
            ) : null}
            {showTee ? (
              <GearSizeSelect
                id="aau-tee-size"
                label="Tee"
                value={apparelSizes.teeSize}
                onChange={(v) => patchSize("teeSize", v)}
                disabled={disabled}
                isDark={isDark}
                required
              />
            ) : null}
          </div>
          {sizesError ? <p className="text-sm text-red-400">{sizesError}</p> : null}
        </div>
      ) : null}

      <p
        className={
          isDark
            ? cn("text-sm font-bold text-right tabular-nums", aauPriceClass)
            : "text-sm font-bold text-[#003366] text-right tabular-nums"
        }
      >
        Checkout total: {formatAauScholasticDollars(total)}
      </p>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <p className={isDark ? "text-xs text-white/50 leading-relaxed" : "text-xs text-gray-500 leading-relaxed"}>
        {AAU_SCHOLASTIC_GEAR_REUSE_NOTE}
      </p>
      <p className={isDark ? "text-xs text-white/50" : "text-xs text-gray-500"}>
        {AAU_SCHOLASTIC_MEALS_NOT_INCLUDED}
      </p>
    </div>
  )
}

export { aauScholasticDefaultLineQuantities, aauScholasticFullBundleLineQuantities }
