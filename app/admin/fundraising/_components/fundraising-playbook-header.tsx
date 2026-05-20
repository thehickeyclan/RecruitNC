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
            NC United · Fundraising (admin)
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <BookOpen className="h-8 w-8 shrink-0 md:h-9 md:w-9" style={{ color: brand.crimson }} aria-hidden />
            <div>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl" style={{ color: brand.navy }}>
                Match gifts to kids and families
              </h1>
              <p className="text-muted-foreground mt-1 text-sm font-medium md:text-[15px]">{campaign.campaignDisplayName}</p>
              <p className="text-muted-foreground mt-1 max-w-2xl text-sm leading-relaxed">
                Donors pay with a wrestler code (<span className="font-medium text-foreground">NCU-…</span>). Your job is to connect that code to the right athlete and parent account so{" "}
                <strong className="font-medium text-foreground">Profile → Fundraise</strong> shows correct totals. Public donor pages are optional extras.
              </p>
            </div>
          </div>

          {campaign.playbookOperationalBanner ? (
            <div
              role="status"
              className="max-w-3xl rounded-lg border border-amber-500/45 bg-amber-50 px-3 py-2.5 text-sm leading-snug text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/35 dark:text-amber-50"
            >
              {campaign.playbookOperationalBanner}
            </div>
          ) : null}

          <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">
            Numbers below use Stripe campaign{" "}
            <code className="rounded bg-muted px-1 font-mono text-[11px]">{campaign.stripeCampaignSlug}</code>
            , aligned with the public hub reporting window for reporting. Family-facing balances still follow how each code is pinned to an athlete.
          </p>
          <p className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <span>
              Reporting window:{" "}
              <strong className="text-foreground font-medium">matches public hub headline</strong>
            </span>
            <span className="text-muted-foreground/60">·</span>
            <span>
              Legacy public page{" "}
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
            <span className="text-muted-foreground/60">·</span>
            <HardLink href="/fundraising/training-fund" className="text-primary font-medium underline-offset-4 hover:underline">
              Fundraising hub / give
            </HardLink>
            <span className="text-muted-foreground/60">·</span>
            <HardLink href="/admin/fundraising/playbook" className="text-primary font-medium underline-offset-4 hover:underline">
              Playbook visits
            </HardLink>
            <span className="text-muted-foreground/60">·</span>
            <HardLink
              href="/admin/fundraising/activation-requests"
              className="text-primary font-medium underline-offset-4 hover:underline"
            >
              Activation requests
            </HardLink>
          </p>
        </div>
      </div>
    </header>
  )
}
