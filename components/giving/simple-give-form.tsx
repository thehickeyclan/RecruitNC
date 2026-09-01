"use client"

import { useMemo, useState } from "react"

export type GiveScholarshipOption = {
  slug: string
  name: string
}

type Destination = "fund" | "scholarship"

const PRESET_AMOUNTS = [50, 100, 250, 500] as const

/** Matches the $5 minimum enforced by /api/spartan/checkout. */
const MIN_GIFT_CENTS = 500

/**
 * The one giving form.
 *
 * Everything the old wizard collected beyond this — tee sizes, shipping, athlete credit, race
 * tiers, supporter-list visibility — is gone. A donor picks a destination, an amount, and pays.
 * Gifts are never listed publicly, so `donorListPublic` is pinned false rather than asked.
 */
export function SimpleGiveForm({
  scholarships,
  lockedScholarshipSlug,
  lockedDestination,
}: {
  scholarships: readonly GiveScholarshipOption[]
  /** Preset and hide the destination picker — used by a single fund's own page. */
  lockedScholarshipSlug?: string
  lockedDestination?: Destination
}) {
  const initialDestination: Destination =
    lockedDestination ?? (lockedScholarshipSlug ? "scholarship" : "fund")

  const [destination, setDestination] = useState<Destination>(initialDestination)
  const [scholarshipSlug, setScholarshipSlug] = useState(
    lockedScholarshipSlug || scholarships[0]?.slug || "",
  )
  const [preset, setPreset] = useState<number | "other">(100)
  const [customAmount, setCustomAmount] = useState("")
  const [donorName, setDonorName] = useState("")
  const [email, setEmail] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const locked = Boolean(lockedDestination || lockedScholarshipSlug)
  const hasScholarships = scholarships.length > 0

  const amountCents = useMemo(() => {
    if (preset !== "other") return preset * 100
    const parsed = Number(customAmount.replace(/[^0-9.]/g, ""))
    if (!Number.isFinite(parsed) || parsed <= 0) return 0
    return Math.round(parsed * 100)
  }, [preset, customAmount])

  const chosenScholarship = scholarships.find((s) => s.slug === scholarshipSlug) ?? null

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError("")

    /** Mirror the server's floor exactly — a client that allows less just fails at submit. */
    if (amountCents < MIN_GIFT_CENTS) {
      setError("Enter an amount of $5 or more.")
      return
    }
    if (!donorName.trim()) {
      setError("Enter the name for your receipt.")
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid email address.")
      return
    }
    if (destination === "scholarship" && !chosenScholarship) {
      setError("Choose a scholarship fund.")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/spartan/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountCents,
          donorName: donorName.trim(),
          email: email.trim(),
          fundraisingHub: true,
          fundraisingHubReturnSlug:
            destination === "scholarship" && chosenScholarship
              ? `scholarships/${chosenScholarship.slug}`
              : "training-fund",
          teeRequested: false,
          donorListPublic: false,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string }
      if (!res.ok || typeof data.url !== "string") {
        setError(data.error || "Could not start checkout. Please try again.")
        setSubmitting(false)
        return
      }
      window.location.href = data.url
    } catch {
      setError("Could not reach checkout. Please try again.")
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mx-auto w-full max-w-xl rounded-2xl border border-white/10 bg-[#0f1c2e] p-6 shadow-xl sm:p-8"
    >
      {!locked && (
        <fieldset className="mb-6">
          <legend className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#D3B574]">
            Where your gift goes
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <DestinationCard
              selected={destination === "fund"}
              onSelect={() => setDestination("fund")}
              title="NC United Fund"
              blurb="General support — travel, training, gear and events."
            />
            <DestinationCard
              selected={destination === "scholarship"}
              onSelect={() => setDestination("scholarship")}
              title="Scholarship"
              blurb="A named scholarship fund, governed separately."
              disabled={!hasScholarships}
            />
          </div>
        </fieldset>
      )}

      {destination === "scholarship" && !lockedScholarshipSlug && hasScholarships && (
        <label className="mb-6 block">
          <span className="mb-2 block text-sm font-semibold text-white">Scholarship fund</span>
          {scholarships.length === 1 ? (
            <p className="rounded-lg border border-white/10 bg-[#0A1628] px-4 py-3 text-white">
              {scholarships[0].name}
            </p>
          ) : (
            <select
              value={scholarshipSlug}
              onChange={(e) => setScholarshipSlug(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#0A1628] px-4 py-3 text-white"
            >
              {scholarships.map((s) => (
                <option key={s.slug} value={s.slug}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
        </label>
      )}

      <fieldset className="mb-6">
        <legend className="mb-3 text-sm font-semibold text-white">Amount</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {PRESET_AMOUNTS.map((amount) => (
            <button
              key={amount}
              type="button"
              onClick={() => setPreset(amount)}
              className={`rounded-lg border px-3 py-3 font-semibold transition ${
                preset === amount
                  ? "border-[#D3B574] bg-[#D3B574] text-[#0A1628]"
                  : "border-white/15 bg-[#0A1628] text-white hover:border-[#D3B574]/60"
              }`}
            >
              ${amount}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPreset("other")}
            className={`rounded-lg border px-3 py-3 font-semibold transition ${
              preset === "other"
                ? "border-[#D3B574] bg-[#D3B574] text-[#0A1628]"
                : "border-white/15 bg-[#0A1628] text-white hover:border-[#D3B574]/60"
            }`}
          >
            Other
          </button>
        </div>
        {preset === "other" && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-white/10 bg-[#0A1628] px-4 py-3">
            <span className="text-white/60">$</span>
            <input
              inputMode="decimal"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              placeholder="Amount"
              className="w-full bg-transparent text-white outline-none placeholder:text-white/40"
              autoFocus
            />
          </div>
        )}
      </fieldset>

      <label className="mb-4 block">
        <span className="mb-2 block text-sm font-semibold text-white">Name for your receipt</span>
        <input
          value={donorName}
          onChange={(e) => setDonorName(e.target.value)}
          autoComplete="name"
          className="w-full rounded-lg border border-white/10 bg-[#0A1628] px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-[#D3B574]"
          placeholder="Jane Smith"
        />
      </label>

      <label className="mb-6 block">
        <span className="mb-2 block text-sm font-semibold text-white">Email</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          className="w-full rounded-lg border border-white/10 bg-[#0A1628] px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-[#D3B574]"
          placeholder="you@example.com"
        />
      </label>

      {error && (
        <p role="alert" className="mb-4 rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-[#D3B574] px-6 py-4 text-lg font-bold text-[#0A1628] transition hover:bg-[#e0c68c] disabled:opacity-60"
      >
        {submitting ? "Starting checkout…" : "Give"}
      </button>

      <p className="mt-4 text-center text-xs text-white/50">
        Secure checkout by Stripe. NC United Wrestling is a 501(c)(3), EIN 99-3757238. Gifts are not
        listed publicly.
      </p>
    </form>
  )
}

function DestinationCard({
  selected,
  onSelect,
  title,
  blurb,
  disabled,
}: {
  selected: boolean
  onSelect: () => void
  title: string
  blurb: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className={`rounded-xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-40 ${
        selected
          ? "border-[#D3B574] bg-[#D3B574]/10"
          : "border-white/15 bg-[#0A1628] hover:border-[#D3B574]/60"
      }`}
    >
      <span className="block font-bold text-white">{title}</span>
      <span className="mt-1 block text-sm text-white/60">{blurb}</span>
    </button>
  )
}
