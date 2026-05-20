"use client"

import { useMemo, useState } from "react"
import { CreditCard, Loader2 } from "lucide-react"
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
import { NhscaHubTeamGearShowcase } from "@/components/national-team/nhsca-hub-team-gear-showcase"
import { NhscaHubTravelRoster } from "@/components/national-team/nhsca-hub-travel-roster"
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
  NHSCA_SINGLET_TWO_CENTS,
  NHSCA_TEAM_PACKAGE_CENTS,
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
  compact,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  required?: boolean
  compact?: boolean
}) {
  return (
    <div className={cn("space-y-1.5", compact && "w-full sm:max-w-[140px]")}>
      <Label className="text-xs text-white/70">
        {label}
        {required ? <span className="text-red-400 ml-0.5">*</span> : null}
      </Label>
      <Select value={value || NONE} onValueChange={(v) => onChange(v === NONE ? "" : v)}>
        <SelectTrigger className={hubSelectTrigger}>
          <SelectValue placeholder="Size" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>Size</SelectItem>
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

function LineItemSummary({ items }: { items: { name: string; amountCents: number; quantity?: number }[] }) {
  return (
    <ul className="space-y-1.5 text-sm">
      {items.map((item) => (
        <li key={item.name} className="flex justify-between gap-3 text-white/80">
          <span className="min-w-0 break-words">{item.name}</span>
          <span className="tabular-nums text-[#CBAF5D] shrink-0">{formatDollars(item.amountCents * (item.quantity ?? 1))}</span>
        </li>
      ))}
    </ul>
  )
}

const EMPTY_INDIVIDUAL: NhscaHubIndividualSelections = {
  registration: false,
  singletQty: 0,
  singletColor: "",
  singletSize: "",
  shorts: false,
  shortsSize: "",
  shortSleeve: false,
  shortSleeveSize: "",
  longSleeve: false,
  longSleeveSize: "",
  vanTravel: false,
  hotel: false,
}

export function NhscaHubCheckoutForm({ onPaymentComplete }: { onPaymentComplete?: () => void }) {
  const { user } = useAuth()
  const [fullPackage, setFullPackage] = useState(true)
  const [team, setTeam] = useState<"nhsca-duals-2026" | "nhsca-duals-2026-select">("nhsca-duals-2026")
  const [parentName, setParentName] = useState("")
  const [wrestlerName, setWrestlerName] = useState("")

  const [bundleSizes, setBundleSizes] = useState({
    singletSize: "",
    shortsSize: "",
    shortSleeveSize: "",
    longSleeveSize: "",
  })

  const [individual, setIndividual] = useState<NhscaHubIndividualSelections>(EMPTY_INDIVIDUAL)
  const [vanTravel, setVanTravel] = useState(false)
  const [hotel, setHotel] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const vanCents = nhscaVanTravelFeeCents()
  const hotelCents = nhscaHotelFeeCents()

  const lineItems = useMemo(() => {
    const travel = { vanTravel, hotel }
    if (fullPackage) return buildTeamPackageLineItems(travel)
    return buildIndividualLineItems({ ...individual, vanTravel, hotel })
  }, [fullPackage, bundleSizes, individual, vanTravel, hotel])

  const totalCents = lineItemsTotalCents(lineItems)

  const selectFullPackage = (on: boolean) => {
    setFullPackage(on)
    if (on) setIndividual(EMPTY_INDIVIDUAL)
  }

  const updateIndividual = (patch: Partial<NhscaHubIndividualSelections>) => {
    setIndividual((s) => ({ ...s, ...patch }))
    if (fullPackage) setFullPackage(false)
  }

  const validate = (): string | null => {
    if (!parentName.trim()) return "Parent name is required."
    if (!wrestlerName.trim()) return "Athlete name is required."
    if (fullPackage) {
      if (!bundleSizes.singletSize || !bundleSizes.shortsSize || !bundleSizes.shortSleeveSize || !bundleSizes.longSleeveSize) {
        return "Select all apparel sizes for the team package."
      }
    } else {
      const hasPaidTravel = (vanTravel && vanCents > 0) || (hotel && hotelCents > 0)
      if (
        !individual.registration &&
        individual.singletQty === 0 &&
        !individual.shorts &&
        !individual.shortSleeve &&
        !individual.longSleeve &&
        !hasPaidTravel
      ) {
        return "Select at least one item below, or choose the full team package."
      }
      if (individual.singletQty > 0 && !individual.singletSize) return "Select singlet size."
      if (individual.singletQty === 1 && !individual.singletColor) return "Select blue or white singlet."
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
      const mode = fullPackage ? "team_package" : "individual"
      const res = await fetch("/api/national-team/hub/checkout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          eventSlug: team,
          parentName: parentName.trim(),
          wrestlerName: wrestlerName.trim(),
          teamPackage: { ...bundleSizes, vanTravel, hotel },
          singletSize: bundleSizes.singletSize,
          shortsSize: bundleSizes.shortsSize,
          shortSleeveSize: bundleSizes.shortSleeveSize,
          longSleeveSize: bundleSizes.longSleeveSize,
          vanTravel,
          hotel,
          individual: fullPackage ? { ...EMPTY_INDIVIDUAL, vanTravel, hotel } : { ...individual, vanTravel, hotel },
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
      <NhscaHubTeamGearShowcase carousel />

      <article className={cn(hubPanelClass, "overflow-hidden")}>
        <div className="p-4 sm:p-5 md:p-6 space-y-5">
          <p className="text-xs text-white/50">One checkout — pick the full package or choose items à la carte.</p>

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
            <div className="space-y-1.5 sm:col-span-2">
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
          {user?.email ? <p className="text-xs text-white/45">Receipt → {user.email}</p> : null}

          <div className="rounded-xl bg-[#0a2040] border border-white/10 divide-y divide-white/10">
            <label
              className={cn(
                "flex items-start gap-3 p-4 cursor-pointer min-h-[52px]",
                fullPackage && "bg-[#CBAF5D]/10"
              )}
            >
              <Checkbox
                checked={fullPackage}
                onCheckedChange={(c) => selectFullPackage(!!c)}
                className="h-5 w-5 mt-0.5 data-[state=checked]:bg-[#CBAF5D]"
              />
              <span className="flex-1 min-w-0">
                <span className="font-semibold text-white block">Full team package</span>
                <span className="text-xs text-white/55 block mt-0.5">
                  Registration, 2 singlets (blue &amp; white), shorts, short &amp; long sleeve tees
                </span>
              </span>
              <span className="text-[#CBAF5D] font-bold shrink-0">{formatDollars(NHSCA_TEAM_PACKAGE_CENTS)}</span>
            </label>

            {fullPackage ? (
              <div className="p-4 grid grid-cols-1 min-[400px]:grid-cols-2 sm:grid-cols-4 gap-3">
                <SizeSelect label="Singlet (blue & white)" value={bundleSizes.singletSize} onChange={(v) => setBundleSizes((s) => ({ ...s, singletSize: v }))} required compact />
                <SizeSelect label="Shorts" value={bundleSizes.shortsSize} onChange={(v) => setBundleSizes((s) => ({ ...s, shortsSize: v }))} required compact />
                <SizeSelect label="SS tee" value={bundleSizes.shortSleeveSize} onChange={(v) => setBundleSizes((s) => ({ ...s, shortSleeveSize: v }))} required compact />
                <SizeSelect label="LS tee" value={bundleSizes.longSleeveSize} onChange={(v) => setBundleSizes((s) => ({ ...s, longSleeveSize: v }))} required compact />
              </div>
            ) : null}

            {!fullPackage ? (
              <>
                <label className="flex items-center gap-3 p-4 cursor-pointer min-h-[48px]">
                  <Checkbox
                    checked={individual.registration}
                    onCheckedChange={(c) => updateIndividual({ registration: !!c })}
                    className="h-5 w-5 data-[state=checked]:bg-[#CBAF5D]"
                  />
                  <span className="text-sm text-white flex-1">Registration &amp; team fee</span>
                  <span className="text-sm text-[#CBAF5D] font-semibold">{formatDollars(NHSCA_REG_FEE_CENTS)}</span>
                </label>

                <div className="p-4 flex flex-wrap items-end gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                    <Checkbox
                      checked={individual.singletQty > 0}
                      onCheckedChange={(c) =>
                        updateIndividual({
                          singletQty: c ? 1 : 0,
                          singletColor: c ? individual.singletColor : "",
                          singletSize: c ? individual.singletSize : "",
                        })
                      }
                      className="h-5 w-5 data-[state=checked]:bg-[#CBAF5D]"
                    />
                    <span className="text-sm text-white flex-1">
                      Singlet <span className="text-white/45 text-xs">(blue or white)</span>
                    </span>
                  </div>
                  {individual.singletQty > 0 ? (
                    <>
                      <Select
                        value={String(individual.singletQty)}
                        onValueChange={(v) =>
                          updateIndividual({
                            singletQty: v === "2" ? 2 : 1,
                            singletColor: v === "2" ? "" : individual.singletColor,
                          })
                        }
                      >
                        <SelectTrigger className={cn(hubSelectTrigger, "w-[150px]")}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 — {formatDollars(NHSCA_SINGLET_EACH_CENTS)}</SelectItem>
                          <SelectItem value="2">Both — {formatDollars(NHSCA_SINGLET_TWO_CENTS)}</SelectItem>
                        </SelectContent>
                      </Select>
                      {individual.singletQty === 1 ? (
                        <div className="space-y-1.5 w-full sm:max-w-[140px]">
                          <Label className="text-xs text-white/70">
                            Color <span className="text-red-400">*</span>
                          </Label>
                          <Select
                            value={individual.singletColor || NONE}
                            onValueChange={(v) =>
                              updateIndividual({
                                singletColor: v === NONE ? "" : (v as "blue" | "white"),
                              })
                            }
                          >
                            <SelectTrigger className={hubSelectTrigger}>
                              <SelectValue placeholder="Blue or white" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={NONE}>Color</SelectItem>
                              <SelectItem value="blue">Blue</SelectItem>
                              <SelectItem value="white">White</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      ) : (
                        <span className="text-xs text-white/50 pb-2 self-center">Blue &amp; white</span>
                      )}
                      <SizeSelect label="Size" value={individual.singletSize} onChange={(v) => updateIndividual({ singletSize: v })} required compact />
                    </>
                  ) : (
                    <span className="text-xs text-white/40 pb-2">
                      {formatDollars(NHSCA_SINGLET_EACH_CENTS)} blue or white · both {formatDollars(NHSCA_SINGLET_TWO_CENTS)}
                    </span>
                  )}
                </div>

                {(
                  [
                    { key: "shorts" as const, label: "Shorts", cents: NHSCA_SHORTS_CENTS, sizeKey: "shortsSize" as const },
                    { key: "shortSleeve" as const, label: "Short sleeve tee", cents: NHSCA_SHORT_SLEEVE_CENTS, sizeKey: "shortSleeveSize" as const },
                    { key: "longSleeve" as const, label: "Long sleeve tee", cents: NHSCA_LONG_SLEEVE_CENTS, sizeKey: "longSleeveSize" as const },
                  ] as const
                ).map((item) => (
                  <div key={item.key} className="p-4 space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer min-h-[44px]">
                      <Checkbox
                        checked={individual[item.key]}
                        onCheckedChange={(c) =>
                          updateIndividual({
                            [item.key]: !!c,
                            ...(c ? {} : { [item.sizeKey]: "" }),
                          })
                        }
                        className="h-5 w-5 data-[state=checked]:bg-[#CBAF5D]"
                      />
                      <span className="text-sm text-white flex-1">{item.label}</span>
                      <span className="text-sm text-[#CBAF5D]">{formatDollars(item.cents)}</span>
                    </label>
                    {individual[item.key] ? (
                      <SizeSelect label="Size" value={individual[item.sizeKey]} onChange={(v) => updateIndividual({ [item.sizeKey]: v })} required compact />
                    ) : null}
                  </div>
                ))}
              </>
            ) : null}

            <label className="flex items-center gap-3 p-4 cursor-pointer min-h-[48px]">
              <Checkbox checked={vanTravel} onCheckedChange={(c) => setVanTravel(!!c)} className="h-5 w-5 data-[state=checked]:bg-[#CBAF5D]" />
              <span className="text-sm text-white flex-1">
                Van transportation{" "}
                <span className="text-[#CBAF5D]">{vanCents > 0 ? `${formatDollars(vanCents)} / person` : ""}</span>
              </span>
            </label>
            <label className="flex items-center gap-3 p-4 cursor-pointer min-h-[48px]">
              <Checkbox checked={hotel} onCheckedChange={(c) => setHotel(!!c)} className="h-5 w-5 data-[state=checked]:bg-[#CBAF5D]" />
              <span className="text-sm text-white flex-1">
                Team hotel (3 nights){" "}
                <span className="text-[#CBAF5D]">{hotelCents > 0 ? `${formatDollars(hotelCents)} / person` : ""}</span>
              </span>
            </label>
          </div>

          {!fullPackage ? (
            <p className="text-xs text-white/45 text-center">
              Need everything? Check <strong className="text-white/70">Full team package</strong> above instead.
            </p>
          ) : null}

          <NhscaHubTravelRoster compact />

          <div className="rounded-xl bg-[#002147] border border-[#CBAF5D]/30 p-4 space-y-3">
            <LineItemSummary items={lineItems} />
            <div className="flex justify-between items-center border-t border-white/10 pt-3">
              <span className="font-bold text-white">Total</span>
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
                Pay {formatDollars(totalCents)}
              </>
            )}
          </button>
        </div>
      </article>
    </div>
  )
}
