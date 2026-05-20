import { Smartphone, Trophy, Tv, ExternalLink, PlayCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  hubPanelClass,
  hubPanelDescClass,
  hubPanelHeaderClass,
  hubPanelTitleClass,
} from "@/components/national-team/nhsca-hub-theme"

const FLO_HOW_TO_WATCH =
  "https://www.flowrestling.org/articles/15686324-how-to-watch-2026-nhsca-national-duals-wrestling?classic=true"
const NHSCA_DUALS_PAGE = "https://nhsca-events.com/national-duals/"

export function NHSCADuals2026HowToWatch({
  hubTheme = false,
  embedded = false,
}: {
  hubTheme?: boolean
  /** Parent NhscaHubSection supplies the section title when embedded on the hub page. */
  embedded?: boolean
}) {
  if (hubTheme) {
    return (
      <article
        id={embedded ? undefined : "how-to-watch"}
        className={cn(hubPanelClass, !embedded && "scroll-mt-8")}
      >
        {!embedded && (
          <header className={hubPanelHeaderClass}>
            <h2 className={cn(hubPanelTitleClass, "flex items-center gap-2")}>
              <Tv className="h-5 w-5 text-[#CBAF5D]" />
              How to watch
            </h2>
            <p className={hubPanelDescClass}>FloWrestling streams competition Sat–Mon; brackets on NHSCA.</p>
          </header>
        )}
        <div
          className={cn(
            "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#B31B1B] px-5 py-5 text-white",
            embedded ? "rounded-t-2xl" : "border-b border-white/10"
          )}
        >
          <div>
            <p className="text-lg font-bold">Watch live on FloWrestling</p>
            <p className="text-sm text-white/90 mt-1">Sat May 23 – Mon May 25, 2026</p>
          </div>
          <Button asChild className="shrink-0 bg-white text-[#B31B1B] hover:bg-gray-100 font-bold min-h-[44px]">
            <a href={FLO_HOW_TO_WATCH} target="_blank" rel="noopener noreferrer">
              <PlayCircle className="h-4 w-4 mr-2" />
              Watch live
              <ExternalLink className="h-3.5 w-3.5 ml-1 opacity-70" />
            </a>
          </Button>
        </div>
        <div className="p-5 md:p-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-white/[0.06] p-4">
              <div className="flex gap-3">
                <Tv className="h-5 w-5 text-[#CBAF5D] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">On your TV</p>
                  <p className="text-sm text-white/70 mt-1">FloSports app — Roku, Fire TV, Apple TV, and more.</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.06] p-4">
              <div className="flex gap-3">
                <Smartphone className="h-5 w-5 text-[#CBAF5D] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">On your phone</p>
                  <p className="text-sm text-white/70 mt-1">FloSports app for iOS and Android.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              asChild
              variant="outline"
              className="flex-1 min-h-[44px] border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white font-semibold"
            >
              <a href={FLO_HOW_TO_WATCH} target="_blank" rel="noopener noreferrer">
                FloWrestling
                <ExternalLink className="h-3.5 w-3.5 ml-1" />
              </a>
            </Button>
            <Button
              asChild
              variant="outline"
              className="flex-1 min-h-[44px] border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white font-semibold"
            >
              <a href={NHSCA_DUALS_PAGE} target="_blank" rel="noopener noreferrer">
                <Trophy className="h-4 w-4 mr-2" />
                Brackets &amp; results
                <ExternalLink className="h-3.5 w-3.5 ml-1" />
              </a>
            </Button>
          </div>
          <p className="text-xs text-white/50 leading-relaxed">
            Archived footage may be available to Flo subscribers after the event — check Flo for replay terms.
          </p>
        </div>
      </article>
    )
  }

  return (
    <Card id="how-to-watch" className="scroll-mt-20 border-2 border-[#002147] overflow-hidden">
      <CardHeader className="bg-[#002147] text-white">
        <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
          <Tv className="h-5 w-5 text-[#CBAF5D]" />
          How to watch
        </CardTitle>
        <CardDescription className="text-white/80">
          FloWrestling streams competition Sat–Mon; brackets on NHSCA.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#B31B1B] px-5 py-5 text-white">
          <div>
            <p className="text-lg font-bold">Watch live on FloWrestling</p>
            <p className="text-sm text-white/90 mt-1">Sat May 23 – Mon May 25, 2026</p>
          </div>
          <Button asChild className="shrink-0 bg-white text-[#B31B1B] hover:bg-gray-100 font-bold">
            <a href={FLO_HOW_TO_WATCH} target="_blank" rel="noopener noreferrer">
              <PlayCircle className="h-4 w-4 mr-2" />
              Watch live
              <ExternalLink className="h-3.5 w-3.5 ml-1 opacity-70" />
            </a>
          </Button>
        </div>
        <div className="p-5 md:p-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-[#002147]/15 bg-[#CBAF5D]/10 p-4">
              <div className="flex gap-3">
                <Tv className="h-5 w-5 text-[#003366] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-[#002147]">On your TV</p>
                  <p className="text-sm text-gray-600 mt-1">FloSports app — Roku, Fire TV, Apple TV, and more.</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-[#002147]/15 bg-[#CBAF5D]/10 p-4">
              <div className="flex gap-3">
                <Smartphone className="h-5 w-5 text-[#003366] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-[#002147]">On your phone</p>
                  <p className="text-sm text-gray-600 mt-1">FloSports app for iOS and Android.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button asChild variant="outline" className="flex-1 border-[#003366] text-[#003366] font-semibold">
              <a href={FLO_HOW_TO_WATCH} target="_blank" rel="noopener noreferrer">
                FloWrestling
                <ExternalLink className="h-3.5 w-3.5 ml-1" />
              </a>
            </Button>
            <Button asChild variant="outline" className="flex-1 border-[#003366] text-[#003366] font-semibold">
              <a href={NHSCA_DUALS_PAGE} target="_blank" rel="noopener noreferrer">
                <Trophy className="h-4 w-4 mr-2" />
                Brackets &amp; results
                <ExternalLink className="h-3.5 w-3.5 ml-1" />
              </a>
            </Button>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">
            Archived footage may be available to Flo subscribers after the event — check Flo for replay terms.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
