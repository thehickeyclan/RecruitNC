"use client"

import { useMemo, useState } from "react"
import { CreditCard, Loader2, Package, Shirt } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { hubPanelClass } from "@/components/national-team/nhsca-hub-theme"
import { NHSCA_INTEREST_WEIGHT_CLASSES } from "@/lib/national-team-weight-classes"
import {
  buildIndividualLineItems,
  buildTeamPackageLineItems,
  lineItemsTotalCents,
  nhscaHotelFeeCents,
  nhscaVanTravelFeeCents,
  NHSCA_HUB_GEAR_SIZES,
  NHSCA_LONG_SLEEVE_CENTS,
  NHSCA_REG_FEE_CENTS,
  NHSCA_SHORT_SLEEVE_CENTS,
  NHSCA_SHORTS_CENTS,
  NHSCA_SINGLET_EACH_CENTS,
  NHSCA_TEAM_PACKAGE_CENTS,
  travelPendingLabel,
  type NhscaHubCheckoutMode,
  type NhscaHubIndividualSelections,
} from "@/lib/nhsca-hub-checkout-pricing"
import { cn } from "@/lib/utils"

const NONE = "__none__"

const hubInputClass =
  "min-h-[48px] bg-[#0a2040] border-white/20 text-white placeholder:text-white/40 text-base"
const hubSelectTrigger = "min-h-[48px] bg-[#0a2040] border-white/20 text-white text-base"

function formatDollars(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

function SizeSelect({
  label,
  value,
  onChange,
  required,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  required?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-white/70">
        {label}
        {required ? <span className="text-red-400 ml-0.5">*</span> : null}
      </Label>
      <Select value={value || NONE} onValueChange={(v) => onChange(v === NONE ? "" : v)}>
        <SelectTrigger className={hubSelectTrigger}>
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

function TravelOptions({
  vanTravel,
  hotel,
  onVan,
  onHotel,
}: {
  vanTravel: boolean
  hotel: boolean
  onVan: (v: boolean) => void
  onHotel: (v: boolean) => void
}) {
  const vanCents = nhscaVanTravelFeeCents()
  const hotelCents = nhscaHotelFeeCents()
  const pending = travelPendingLabel()

  return (
    <div className="rounded-xl bg-[#0a2040] border border-white/10 p-4 space-y-3">
      <p className="text-sm font-semibold text-white/80">Travel (optional)</p>
      <label className="flex items-center gap-3 min-h-[48px] cursor-pointer">
        <Checkbox
          checked={vanTravel}
          onCheckedChange={(c) => onVan(!!c)}
          className="h-5 w-5 border-white/30 data-[state=checked]:bg-[#CBAF5D]"
        />
        <span className="text-sm text-white flex-1">
          Van Transportation{" "}
          <span className="text-[#CBAF5D]">
            {vanCents > 0 ? formatDollars(vanCents) : "$0.00"}
          </span>
          {vanCents === 0 && pending ? (
            <span className="block text-xs text-white/45">{pending}</span>
          ) : null}
        </span>
      </label>
      <label className="flex items-center gap-3 min-h-[48px] cursor-pointer">
        <Checkbox
          checked={hotel}
          onCheckedChange={(c) => onHotel(!!c)}
          className="h-5 w-5 border-white/30 data-[state=checked]:bg-[#CBAF5D]"
        />
        <span className="text-sm text-white flex-1">
          Hotel{" "}
          <span className="text-[#CBAF5D]">
            {hotelCents > 0 ? formatDollars(hotelCents) : "$0.00"}
          </span>
          {hotelCents === 0 && pending ? (
            <span className="block text-xs text-white/45">{pending}</span>
          ) : null}
        </span>
      </label>
    </div>
  )
}

function LineItemSummary({ items }: { items: { name: string; amountCents: number; quantity?: number }[] }) {
  return (
    <ul className="space-y-1.5 text-sm">
      {items.map((item) => (
        <li key={item.name} className="flex justify-between gap-2 text-white/80">
          <span className="min-w-0">
            {item.name}
            {(item.quantity ?? 1) > 1 ? ` ×${item.quantity}` : ""}
          </span>
          <span className="tabular-nums text-[#CBAF5D] shrink-0">
            {formatDollars(item.amountCents * (item.quantity ?? 1))}
          </span>
        </li>
      ))}
    </ul>
  )
}

export function NhscaHubCheckoutForm({ onPaymentComplete }: { onPaymentComplete?: () => void }) {
  const { user } = useAuth()
  const [mode, setMode] = useState<NhscaHubCheckoutMode>("team_package")
  const [team, setTeam] = useState<"nhsca-duals-2026" | "nhsca-duals-2026-select">("nhsca-duals-2026")
  const [parentName, setParentName] = useState("")
  const [wrestlerName, setWrestlerName] = useState("")
  const [primaryWeight, setPrimaryWeight] = useState("")

  const [bundleSizes, setBundleSizes] = useState({
    singletSize: "",
    shortsSize: "",
    shortSleeveSize: "",
    longSleeveSize: "",
  })
  const [bundleTravel, setBundleTravel] = useState({ vanTravel: false, hotel: false })

  const [individual, setIndividual] = useState<NhscaHubIndividualSelections>({
    registration: true,
    singletQty: 0,
    singletSize: "",
    shorts: false,
    shortsSize: "",
    shortSleeve: false,
    shortSleeveSize: "",
    longSleeve: false,
    longSleeveSize: "",
    vanTravel: false,
    hotel: false,
  })

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const lineItems = useMemo(() => {
    if (mode === "team_package") {
      return buildTeamPackageLineItems(bundleTravel)
    }
    return buildIndividualLineItems(individual)
  }, [mode, bundleTravel, individual])

  const totalCents = lineItemsTotalCents(lineItems)

  const validate = (): string | null => {
    if (!parentName.trim()) return "Parent name is required."
    if (!wrestlerName.trim()) return "Athlete name is required."
    if (!primaryWeight) return "Weight class is required."
    if (mode === "team_package") {
      if (!bundleSizes.singletSize || !bundleSizes.shortsSize || !bundleSizes.shortSleeveSize || !bundleSizes.longSleeveSize) {
        return "Select all apparel sizes for the team package."
      }
    } else {
      if (!individual.registration && individual.singletQty === 0 && !individual.shorts && !individual.shortSleeve && !individual.longSleeve) {
        return "Select registration, apparel, or travel."
      }
      if (individual.singletQty > 0 && !individual.singletSize) return "Select singlet size."
      if (individual.shorts && !individual.shortsSize) return "Select shorts size."
      if (individual.shortSleeve && !individual.shortSleeveSize) return "Select short sleeve size."
      if (individual.longSleeve && !individual.longSleeveSize) return "Select long sleeve size."
    }
    if (totalCents <= 0) return "Total must be greater than $0 to pay through Stripe."
    return null
  }

  const handleCheckout = async () => {
    setError(null)
    const err = validate()
    if (err) {
      setError(err)
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/national-team/hub/checkout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          eventSlug: team,
          parentName: parentName.trim(),
          wrestlerName: wrestlerName.trim(),
          primaryWeight,
          teamPackage: { ...bundleSizes, ...bundleTravel },
          singletSize: bundleSizes.singletSize,
          shortsSize: bundleSizes.shortsSize,
          shortSleeveSize: bundleSizes.shortSleeveSize,
          longSleeveSize: bundleSizes.longSleeveSize,
          vanTravel: bundleTravel.vanTravel,
          hotel: bundleTravel.hotel,
          individual,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
        return
      }
      setError((data as { error?: string }).error ?? "Checkout failed.")
    } catch {
      setError("Could not start Stripe checkout. Try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setMode("team_package")}
          className={cn(
            "rounded-xl border-2 p-4 text-left min-h-[88px]",
            mode === "team_package"
              ? "border-[#CBAF5D] bg-[#CBAF5D]/10"
              : "border-white/15 bg-[#0a2040]"
          )}
        >
          <Package className={cn("h-6 w-6 mb-2", mode === "team_package" ? "text-[#CBAF5D]" : "text-white/50")} />
          <p className="font-bold text-white text-sm">Team Package</p>
          <p className="text-xs text-white/60">{formatDollars(NHSCA_TEAM_PACKAGE_CENTS)}</p>
        </button>
        <button
          type="button"
          onClick={() => setMode("individual")}
          className={cn(
            "rounded-xl border-2 p-4 text-left min-h-[88px]",
            mode === "individual"
              ? "border-[#CBAF5D] bg-[#CBAF5D]/10"
              : "border-white/15 bg-[#0a2040]"
          )}
        >
          <Shirt className={cn("h-6 w-6 mb-2", mode === "individual" ? "text-[#CBAF5D]" : "text-white/50")} />
          <p className="font-bold text-white text-sm">Individual</p>
          <p className="text-xs text-white/60">Reg · apparel · travel</p>
        </button>
      </div>

      <article className={cn(hubPanelClass, "overflow-hidden")}>
        <div className="p-5 md:p-6 space-y-5">
          <p className="text-xs text-white/50">
            Secure payment via Stripe. You&apos;ll return here after checkout.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs text-white/70">
                Parent name <span className="text-red-400">*</span>
              </Label>
              <Input
                className={hubInputClass}
                placeholder="First Last"
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
                autoComplete="name"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs text-white/70">
                Athlete name <span className="text-red-400">*</span>
              </Label>
              <Input
                className={hubInputClass}
                placeholder="First Last"
                value={wrestlerName}
                onChange={(e) => setWrestlerName(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-white/70">
                Weight <span className="text-red-400">*</span>
              </Label>
              <Select value={primaryWeight || NONE} onValueChange={(v) => setPrimaryWeight(v === NONE ? "" : v)}>
                <SelectTrigger className={hubSelectTrigger}>
                  <SelectValue placeholder="Select weight" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Select weight</SelectItem>
                  {NHSCA_INTEREST_WEIGHT_CLASSES.map((w) => (
                    <SelectItem key={w} value={w}>
                      {w}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-white/70">
                Team <span className="text-red-400">*</span>
              </Label>
              <Select value={team} onValueChange={(v) => setTeam(v as typeof team)}>
                <SelectTrigger className={hubSelectTrigger}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nhsca-duals-2026">National Team</SelectItem>
                  <SelectItem value="nhsca-duals-2026-select">Select Team</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {user?.email ? (
            <p className="text-xs text-white/45">Stripe receipt will go to {user.email}</p>
          ) : null}

          {mode === "team_package" ? (
            <>
              <div className="rounded-xl bg-[#0a2040] border border-white/10 p-4 space-y-3">
                <p className="font-semibold text-white">Package includes</p>
                <p className="text-xs text-white/55">
                  Registration, 2 singlets, shorts, short sleeve &amp; long sleeve tees — sizes required below.
                </p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <SizeSelect
                    label="Singlet"
                    value={bundleSizes.singletSize}
                    onChange={(v) => setBundleSizes((s) => ({ ...s, singletSize: v }))}
                    required
                  />
                  <SizeSelect
                    label="Shorts"
                    value={bundleSizes.shortsSize}
                    onChange={(v) => setBundleSizes((s) => ({ ...s, shortsSize: v }))}
                    required
                  />
                  <SizeSelect
                    label="Short sleeve tee"
                    value={bundleSizes.shortSleeveSize}
                    onChange={(v) => setBundleSizes((s) => ({ ...s, shortSleeveSize: v }))}
                    required
                  />
                  <SizeSelect
                    label="Long sleeve tee"
                    value={bundleSizes.longSleeveSize}
                    onChange={(v) => setBundleSizes((s) => ({ ...s, longSleeveSize: v }))}
                    required
                  />
                </div>
              </div>
              <TravelOptions
                vanTravel={bundleTravel.vanTravel}
                hotel={bundleTravel.hotel}
                onVan={(v) => setBundleTravel((s) => ({ ...s, vanTravel: v }))}
                onHotel={(v) => setBundleTravel((s) => ({ ...s, hotel: v }))}
              />
            </>
          ) : (
            <div className="space-y-4">
              <label className="flex items-center gap-3 rounded-xl bg-[#0a2040] border border-white/10 p-4 cursor-pointer min-h-[52px]">
                <Checkbox
                  checked={individual.registration}
                  onCheckedChange={(c) => setIndividual((s) => ({ ...s, registration: !!c }))}
                  className="h-5 w-5 data-[state=checked]:bg-[#CBAF5D]"
                />
                <span className="font-medium text-white flex-1">Registration &amp; team fee</span>
                <span className="text-[#CBAF5D] font-semibold">{formatDollars(NHSCA_REG_FEE_CENTS)}</span>
              </label>

              <div className="rounded-xl bg-[#0a2040] border border-white/10 p-4 space-y-3">
                <p className="text-sm font-semibold text-white/80">Apparel — singlet</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-white/70">Qty</Label>
                    <Select
                      value={String(individual.singletQty)}
                      onValueChange={(v) =>
                        setIndividual((s) => ({
                          ...s,
                          singletQty: v === "2" ? 2 : v === "1" ? 1 : 0,
                          ...(v === "0" ? { singletSize: "" } : {}),
                        }))
                      }
                    >
                      <SelectTrigger className={hubSelectTrigger}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">None</SelectItem>
                        <SelectItem value="1">1 — {formatDollars(NHSCA_SINGLET_EACH_CENTS)}</SelectItem>
                        <SelectItem value="2">2 — {formatDollars(NHSCA_SINGLET_EACH_CENTS * 2)}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {individual.singletQty > 0 ? (
                    <SizeSelect
                      label="Singlet size"
                      value={individual.singletSize}
                      onChange={(v) => setIndividual((s) => ({ ...s, singletSize: v }))}
                      required
                    />
                  ) : null}
                </div>
              </div>

              <div className="rounded-xl bg-[#0a2040] border border-white/10 p-4 space-y-3">
                <p className="text-sm font-semibold text-white/80">Apparel — other</p>
                <div className="space-y-3">
                  {(
                    [
                      { key: "shorts" as const, label: "Shorts", cents: NHSCA_SHORTS_CENTS, sizeKey: "shortsSize" as const },
                      { key: "shortSleeve" as const, label: "Short sleeve tee", cents: NHSCA_SHORT_SLEEVE_CENTS, sizeKey: "shortSleeveSize" as const },
                      { key: "longSleeve" as const, label: "Long sleeve tee", cents: NHSCA_LONG_SLEEVE_CENTS, sizeKey: "longSleeveSize" as const },
                    ] as const
                  ).map((item) => (
                    <div key={item.key} className="space-y-2">
                      <label className="flex items-center gap-3 cursor-pointer min-h-[44px]">
                        <Checkbox
                          checked={individual[item.key]}
                          onCheckedChange={(c) =>
                            setIndividual((s) => ({
                              ...s,
                              [item.key]: !!c,
                              ...(c ? {} : { [item.sizeKey]: "" }),
                            }))
                          }
                          className="h-5 w-5 data-[state=checked]:bg-[#CBAF5D]"
                        />
                        <span className="text-sm text-white flex-1">{item.label}</span>
                        <span className="text-sm text-[#CBAF5D]">{formatDollars(item.cents)}</span>
                      </label>
                      {individual[item.key] ? (
                        <SizeSelect
                          label={`${item.label} size`}
                          value={individual[item.sizeKey]}
                          onChange={(v) => setIndividual((s) => ({ ...s, [item.sizeKey]: v }))}
                          required
                        />
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>

              <TravelOptions
                vanTravel={individual.vanTravel}
                hotel={individual.hotel}
                onVan={(v) => setIndividual((s) => ({ ...s, vanTravel: v }))}
                onHotel={(v) => setIndividual((s) => ({ ...s, hotel: v }))}
              />
            </div>
          )}

          <div className="rounded-xl bg-[#002147] border border-[#CBAF5D]/30 p-4 space-y-3">
            <p className="text-xs font-bold text-[#CBAF5D] uppercase">Stripe checkout</p>
            <LineItemSummary items={lineItems} />
            <div className="flex justify-between items-center border-t border-white/10 pt-3">
              <span className="font-bold text-white text-lg">Total due today</span>
              <span className="font-bold text-[#CBAF5D] text-2xl tabular-nums">{formatDollars(totalCents)}</span>
            </div>
          </div>

          {error ? <p className="text-sm text-red-300">{error}</p> : null}

          <button
            type="button"
            disabled={submitting || totalCents <= 0}
            onClick={() => void handleCheckout()}
            className="w-full min-h-[56px] rounded-xl bg-[#CBAF5D] hover:bg-[#D3B574] text-[#002147] font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <>
                <CreditCard className="h-6 w-6" />
                Pay with Stripe — {formatDollars(totalCents)}
              </>
            )}
          </button>
        </div>
      </article>
    </div>
  )
}
