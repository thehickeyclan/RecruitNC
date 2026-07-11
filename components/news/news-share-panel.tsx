"use client"

import { useMemo, useState, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Link2, Loader2, Share2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  SHARE_PLATFORM_FORMATS,
  SHARE_PLATFORM_LABELS,
  newsArticleShareUrl,
  type NewsShareFormatId,
  type SharePlatform,
} from "@/lib/news-share-formats"
import { shareNewsImageFile, shareResultMessage } from "@/lib/news-share-client"

type NewsSharePanelProps = {
  slug: string
  title: string
  className?: string
}

type ShareStep = "closed" | "platform" | "format"

export function NewsSharePanel({ slug, title, className = "" }: NewsSharePanelProps) {
  const [copied, setCopied] = useState(false)
  const [step, setStep] = useState<ShareStep>("closed")
  const [platform, setPlatform] = useState<SharePlatform | null>(null)
  const [sharingFormat, setSharingFormat] = useState<NewsShareFormatId | null>(null)
  const { toast } = useToast()

  const shareUrl = useMemo(() => {
    if (typeof window !== "undefined") {
      const url = new URL(`${window.location.origin}/news/${slug}`)
      url.searchParams.set("utm_source", "share")
      url.searchParams.set("utm_medium", "social")
      url.searchParams.set("utm_campaign", "news")
      return url.toString()
    }
    return newsArticleShareUrl(slug)
  }, [slug])

  const resetFlow = () => {
    setStep("closed")
    setPlatform(null)
    setSharingFormat(null)
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      toast({ title: "Link copied", description: "Paste into your caption or link sticker." })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast({
        title: "Copy failed",
        description: "Try selecting the URL from the address bar.",
        variant: "destructive",
      })
    }
  }

  const handleShareImage = async (format: NewsShareFormatId) => {
    setSharingFormat(format)
    try {
      const result = await shareNewsImageFile({
        slug,
        format,
        title,
        shareUrl,
        origin: typeof window !== "undefined" ? window.location.origin : undefined,
      })

      let linkCopied = false
      if (result.mode === "download") {
        try {
          await navigator.clipboard.writeText(shareUrl)
          linkCopied = true
        } catch {
          linkCopied = false
        }
      }

      toast(shareResultMessage(result, linkCopied))
      resetFlow()
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        toast({
          title: "Could not share image",
          description: "Try again in a moment.",
          variant: "destructive",
        })
      }
    } finally {
      setSharingFormat(null)
    }
  }

  const handlePlatformPick = (next: SharePlatform) => {
    setPlatform(next)
    setStep("format")
  }

  const formatChoices = platform ? SHARE_PLATFORM_FORMATS[platform] : []

  return (
    <section
      className={`rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5 ${className}`}
      aria-label="Share this article"
    >
      <div className="flex flex-col gap-4">
        {step === "closed" ? (
          <>
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[#13294B]">
                Share this story
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Create a branded image sized for Instagram or Facebook.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                className="bg-[#13294B] text-white hover:bg-[#1a3a5c]"
                onClick={() => setStep("platform")}
              >
                <Share2 className="mr-1.5 h-4 w-4" />
                Share to social
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-slate-600"
                onClick={handleCopyLink}
              >
                <Link2 className="mr-1.5 h-4 w-4" />
                {copied ? "Link copied" : "Copy link"}
              </Button>
            </div>
          </>
        ) : null}

        {step === "platform" ? (
          <ShareStepCard
            title="Where are you posting?"
            onBack={resetFlow}
          >
            <div className="grid gap-2 sm:grid-cols-2">
              {(Object.keys(SHARE_PLATFORM_LABELS) as SharePlatform[]).map((key) => (
                <Button
                  key={key}
                  type="button"
                  variant="outline"
                  className="h-auto min-h-11 justify-start border-[#13294B]/20 py-3 text-left text-[#13294B] hover:bg-white"
                  disabled={sharingFormat !== null}
                  onClick={() => handlePlatformPick(key)}
                >
                  <span className="text-sm font-semibold">{SHARE_PLATFORM_LABELS[key]}</span>
                </Button>
              ))}
            </div>
          </ShareStepCard>
        ) : null}

        {step === "format" && platform ? (
          <ShareStepCard
            title={`${SHARE_PLATFORM_LABELS[platform]} — choose format`}
            onBack={() => {
              setPlatform(null)
              setStep("platform")
            }}
          >
            <div className="grid gap-2">
              {formatChoices.map((choice) => (
                <Button
                  key={choice.format}
                  type="button"
                  variant="outline"
                  className="h-auto min-h-11 flex-col items-start gap-0.5 border-[#13294B]/20 py-3 text-left text-[#13294B] hover:bg-white"
                  disabled={sharingFormat !== null}
                  onClick={() => handleShareImage(choice.format)}
                >
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
                    {sharingFormat === choice.format ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Share2 className="h-4 w-4" />
                    )}
                    {choice.label}
                  </span>
                  <span className="text-xs font-normal text-slate-500">{choice.description}</span>
                </Button>
              ))}
            </div>
          </ShareStepCard>
        ) : null}

        {step !== "closed" ? (
          <p className="text-xs leading-relaxed text-slate-500">
            We&apos;ll generate the image and open your phone&apos;s share menu. Pick{" "}
            {platform === "facebook" ? "Facebook" : "Instagram"} to finish posting.
          </p>
        ) : null}
      </div>
    </section>
  )
}

function ShareStepCard({
  title,
  onBack,
  children,
}: {
  title: string
  onBack: () => void
  children: ReactNode
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-slate-600"
          onClick={onBack}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
        <h2 className="text-sm font-semibold text-[#13294B]">{title}</h2>
      </div>
      {children}
    </div>
  )
}
