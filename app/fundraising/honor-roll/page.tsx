import type { Metadata } from "next"
import { fetchDonorHallOfFameFromStripe, DONOR_RECOGNITION_MIN_AMOUNT_CENTS } from "@/lib/fundraising/donor-hall-of-fame"
import { DonorHallOfFame } from "../components/DonorHallOfFame"
import { HardLink } from "@/components/hard-link"

export const metadata: Metadata = {
  title: "Top donors | NC United Fundraising",
  description:
    "Recognized NC United donors who chose to show their name — qualifying paid Stripe checkouts, 501(c)(3) nonprofit.",
}

function displayFont(c: string) {
  return `font-[family-name:var(--font-fundraising-display)] ${c}`
}

export default async function FundraisingHonorRollPage() {
  const hallOfFame = await fetchDonorHallOfFameFromStripe()

  return (
    <div
      className="min-h-screen bg-[#0B2545] px-4 py-10 text-white sm:py-14"
      style={{ fontFamily: "var(--font-fundraising-body), system-ui, sans-serif" }}
    >
      <div className="mx-auto max-w-6xl">
        <HardLink
          href="/fundraising"
          className={`${displayFont("text-sm font-extrabold uppercase tracking-wide text-[#C8A94A] underline-offset-4 hover:underline")}`}
        >
          ← Fundraising hub
        </HardLink>
      </div>
      <DonorHallOfFame
        individuals={hallOfFame?.individuals ?? []}
        organizations={hallOfFame?.organizations ?? []}
        minAmountCents={hallOfFame?.minAmountCents ?? DONOR_RECOGNITION_MIN_AMOUNT_CENTS}
      />
    </div>
  )
}
