"use client"

import type { AgeBand } from "@/lib/legal/consent"

export type ConsentState = { termsAccepted: boolean; ageBand: AgeBand | null; guardianConsent: boolean; marketingOptIn: boolean }
export const EMPTY_CONSENT: ConsentState = { termsAccepted: false, ageBand: null, guardianConsent: false, marketingOptIn: false }

/**
 * The consent block on sign-up and on the Google finish-up page (lib/legal/consent.ts): an athlete's
 * age, a guardian's agreement for 13 to 17, the Terms and Privacy Policy, and an optional yes to email.
 */
export function SignupConsent({ role, value, onChange, disabled }: { role: string | null; value: ConsentState; onChange: (v: ConsentState) => void; disabled?: boolean }) {
  const athlete = role === "athlete"
  const set = (patch: Partial<ConsentState>) => onChange({ ...value, ...patch })
  const box = "mt-0.5 h-4 w-4 shrink-0 accent-[#D3B574]"
  return (
    <div className="space-y-3 rounded-lg border border-border p-3 text-sm">
      {athlete ? (
        <fieldset className="space-y-2" disabled={disabled}>
          <legend className="font-semibold">How old are you?</legend>
          <div className="flex flex-wrap gap-2">
            {([["18+", "18 or older"], ["13-17", "13 to 17"], ["under-13", "12 or younger"]] as const).map(([band, label]) => (
              <label key={band} className={`cursor-pointer rounded-md border px-3 py-1.5 ${value.ageBand === band ? "border-[#D3B574] bg-[#D3B574]/15" : "border-border"}`}>
                <input type="radio" name="ageBand" className="sr-only" checked={value.ageBand === band} onChange={() => set({ ageBand: band, guardianConsent: band === "13-17" ? value.guardianConsent : false })} />
                {label}
              </label>
            ))}
          </div>
          {value.ageBand === "under-13" ? (
            <p className="text-amber-300">Wrestlers under 13 need a parent to make the account. Ask a parent to sign up and choose Parent.</p>
          ) : null}
          {value.ageBand === "13-17" ? (
            <label className="flex gap-2">
              <input type="checkbox" className={box} checked={value.guardianConsent} onChange={(e) => set({ guardianConsent: e.target.checked })} />
              <span>My parent or guardian has read and agrees to the Terms of Service and Privacy Policy for me.</span>
            </label>
          ) : null}
        </fieldset>
      ) : null}
      <label className="flex gap-2">
        <input type="checkbox" className={box} checked={value.termsAccepted} disabled={disabled} onChange={(e) => set({ termsAccepted: e.target.checked })} required />
        <span>
          I agree to the{" "}
          <a href="/terms" target="_blank" rel="noopener" className="underline">Terms of Service</a> and{" "}
          <a href="/privacy" target="_blank" rel="noopener" className="underline">Privacy Policy</a>.
        </span>
      </label>
      <label className="flex gap-2 text-muted-foreground">
        <input type="checkbox" className={box} checked={value.marketingOptIn} disabled={disabled} onChange={(e) => set({ marketingOptIn: e.target.checked })} />
        <span>Email me recruiting news and updates (optional).</span>
      </label>
    </div>
  )
}
