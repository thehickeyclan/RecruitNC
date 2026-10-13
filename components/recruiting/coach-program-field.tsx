"use client"

import { COACH_PROGRAM_OPTIONS, type CoachProgram } from "@/lib/recruiting/coach-program"

/**
 * "Which program do you coach?" - three buttons, one must be picked (Matt, 13 October 2026).
 * Used at sign-up, on the Google completion step and on a coach's account page.
 */
export function CoachProgramField({
  value,
  onChange,
  disabled,
  tone = "light",
}: {
  value: CoachProgram | null
  onChange: (value: CoachProgram) => void
  disabled?: boolean
  tone?: "light" | "dark"
}) {
  const dark = tone === "dark"
  return (
    <fieldset className="space-y-2" disabled={disabled}>
      <legend className={`text-sm font-medium ${dark ? "text-white" : "text-foreground"}`}>Which program do you coach?</legend>
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Which program do you coach?">
        {COACH_PROGRAM_OPTIONS.map((option) => {
          const on = value === option.value
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={on}
              title={option.detail}
              onClick={() => onChange(option.value)}
              className={`min-h-11 rounded-md border px-3 py-2 text-sm font-semibold transition-colors ${
                on
                  ? "border-[#D3B574] bg-[#D3B574] text-[#0A1628]"
                  : dark
                    ? "border-white/20 text-white/80 hover:border-[#D3B574]"
                    : "border-gray-300 bg-white text-gray-800 hover:border-[#0A1628]"
              }`}
            >
              {option.label}
            </button>
          )
        })}
      </div>
      <p className={`text-xs ${dark ? "text-white/50" : "text-muted-foreground"}`}>
        Sets which rankings and wrestlers you see first. You can switch any time.
      </p>
    </fieldset>
  )
}
