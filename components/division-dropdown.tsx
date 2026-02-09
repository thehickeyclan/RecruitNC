"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CANONICAL_DIVISIONS_FULL, normalizeToCanonicalFull } from "@/lib/division-display"

const EMPTY_VALUE = "__empty__"

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
  const normalized = normalizeToCanonicalFull(value)
  const selectValue = normalized || EMPTY_VALUE

  const handleChange = (v: string) => {
    onValueChange(v === EMPTY_VALUE ? "" : v)
  }

  return (
    <Select
      value={selectValue}
      onValueChange={handleChange}
      disabled={disabled}
    >
      <SelectTrigger className={className} aria-required={required}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={EMPTY_VALUE}>{placeholder}</SelectItem>
        {CANONICAL_DIVISIONS_FULL.map((div) => (
          <SelectItem key={div} value={div}>
            {div}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
