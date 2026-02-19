/**
 * System-wide phone format: store and display as (xxx) xxx-xxxx.
 * Use normalizePhoneForStorage when saving; use formatPhoneForDisplay when showing.
 */

/** Strip to digits (last 10 or 11 with leading 1). */
function digitsOnly(value: string | null | undefined): string {
  if (value == null) return ""
  return String(value).replace(/\D/g, "")
}

/**
 * Normalize for storage: always save as (xxx) xxx-xxxx when we have 10 digits.
 * Use when saving to DB (profile, athlete, interest forms, etc.).
 */
export function normalizePhoneForStorage(phone: string | null | undefined): string {
  const digits = digitsOnly(phone)
  const ten = digits.length === 11 && digits[0] === "1" ? digits.slice(1) : digits.length === 10 ? digits : ""
  if (ten.length !== 10) return (phone ?? "").trim()
  return `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}`
}

/**
 * Format for display: show as (xxx) xxx-xxxx. Safe to call on already-formatted values.
 * Use when displaying in UI (tables, profile, exports).
 */
export function formatPhoneForDisplay(phone: string | null | undefined): string {
  const digits = digitsOnly(phone)
  if (digits.length === 0) return ""
  const ten = digits.length === 11 && digits[0] === "1" ? digits.slice(1) : digits.slice(-10)
  if (ten.length < 3) return ten
  if (ten.length < 6) return `(${ten.slice(0, 3)}) ${ten.slice(3)}`
  return `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6, 10)}`
}

/**
 * While user types in an input: format as (xxx) xxx-xxxx. Call on onChange.
 */
export function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(-10)
  if (digits.length < 3) return digits
  if (digits.length < 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}
