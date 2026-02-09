"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CANONICAL_DIVISIONS_FULL, normalizeToCanonicalFull } from "@/lib/division-display"

type Props = {
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  className?: string
  required?: boolean
  disabled?: boolean
}

/** Division dropdown: only canonical options (NCAA Division I/II/III, NAIA, NJCAA, Club). Prevents inconsistent free-text. */
export function DivisionDropdown({
  value,
  onValueChange,
  placeholder = "Select division",
  className,
  required,
  disabled,
}: Props) {
  const displayValue = normalizeToCanonicalFull(value)

  return (
    <Select
      value={displayValue || undefined}
      onValueChange={onValueChange}
      disabled={disabled}
    >
      <SelectTrigger className={className} aria-required={required}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {CANONICAL_DIVISIONS_FULL.map((div) => (
          <SelectItem key={div} value={div}>
            {div}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
