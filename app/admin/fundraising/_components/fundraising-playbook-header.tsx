"use client"

import { ArrowLeft, BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { HardLink } from "@/components/hard-link"
import type { FundraisingCampaignDefinition } from "@/lib/fundraising/campaign-registry"
import { NC_UNITED_FUNDRAISING_BRAND } from "@/lib/fundraising/campaign-registry"

const brand = NC_UNITED_FUNDRAISING_BRAND

export function FundraisingPlaybookHeader({
  campaign,
}: {
  campaign: FundraisingCampaignDefinition
}) {
  return (
    <header className="mb-8 border-b border-[#003366]/12 pb-6">
      <div className="flex items-start gap-3">
        <Button variant="outline" size="icon" className="mt-0.5 shrink-0 border-[#003366]/25" asChild>
          <HardLink href="/admin" aria-label="Back to admin">
            <ArrowLeft className="h-4 w-4" />
          </HardLink>
        </Button>
        <div className="min-w-0 flex-1 space-y-2">
          <p
            className="text-muted-foreground text-xs font-semibold uppercase tracking-[0.12em]"
            style={{ color: brand.navy }}
          >
            NC United · Fundraising playbook
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <BookOpen className="h-8 w-8 shrink-0 md:h-9 md:w-9" style={{ color: brand.crimson }} aria-hidden />
            <div>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl" style={{ color: brand.navy }}>
                Operations
              </h1>
              <p className="text-muted-foreground mt-0.5 text-sm font-medium md:text-base">{campaign.campaignDisplayName}</p>
            </div>
          </div>
          <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">
            Same flow for every drive: profiles and NCU codes → parent sees Fundraise → each payment credits the right athlete.
            Load data, use the tiles, fix each section, refresh.
          </p>
          <p className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <span>
              Window: <strong className="text-foreground font-medium">{campaign.defaultLookbackDays} days</strong>
            </span>
            <span className="text-muted-foreground/60">·</span>
            <span>
              Stripe{" "}
              <code className="rounded bg-muted px-1 font-mono text-[11px]">{campaign.stripeCampaignSlug}</code>
            </span>
            <span className="text-muted-foreground/60">·</span>
            <span>
              Public{" "}
              <HardLink
                href={campaign.publicPagePath}
                className="text-primary font-mono text-[11px] underline-offset-4 hover:underline"
              >
                {campaign.publicPagePath}
              </HardLink>
            </span>
            <span className="text-muted-foreground/60">·</span>
            <HardLink
              href="/admin/fundraising/rankings"
              className="text-primary font-medium underline-offset-4 hover:underline"
            >
              Rankings
            </HardLink>
            <span className="text-muted-foreground/60">·</span>
            <HardLink
              href={`/fundraising/leaderboard?campaign=${encodeURIComponent(campaign.stripeCampaignSlug)}`}
              className="text-primary font-medium underline-offset-4 hover:underline"
            >
              Public leaderboard
            </HardLink>
          </p>
        </div>
      </div>
    </header>
  )
}
