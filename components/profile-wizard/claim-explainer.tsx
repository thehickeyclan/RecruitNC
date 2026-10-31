import { BrandName } from "@/components/recruiting/brand-name"
/**
 * Why claim, above the name search on /create-profile.
 *
 * Families sent here cold did not know what the site was or what claiming did (Lillie Palmer,
 * 22 October 2026), so the page now says it before asking for a name: what RecruitNC is, the three
 * steps, and who sees the private details.
 */

/** Lillie's how-to-claim video. Paste a YouTube, Vimeo or .mp4 link here and it appears on the page. */
export const CLAIM_VIDEO_URL: string | null = null

function embedUrl(url: string): { kind: "iframe" | "video"; src: string } {
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([\w-]{6,})/)
  if (yt) return { kind: "iframe", src: `https://www.youtube.com/embed/${yt[1]}` }
  const vimeo = url.match(/vimeo\.com\/(\d+)/)
  if (vimeo) return { kind: "iframe", src: `https://player.vimeo.com/video/${vimeo[1]}` }
  return { kind: "video", src: url }
}

const STEPS: Array<[string, string]> = [
  ["Find your name", "Your state and national results are probably already on a profile."],
  ["Claim it, free", "Tap “That’s me” and make a free account."],
  ["Add how coaches reach you", "A cell number (yours or a parent’s), your GPA, and add a parent."],
]

/**
 * What a claimed profile shows when college coaches look: the real Profile Views panel, screenshotted
 * with an invented wrestler and invented views (scripts/command-center-screens). Matt, 29 Oct 2026:
 * the blurred mock-up was not impactful; the real screen is. Never a real wrestler's views.
 */
function ExampleViews() {
  return (
    <figure className="mt-5 overflow-hidden rounded-xl border border-white/10 bg-[#0f1c2e]">
      {/* Each site's own panel, in its own theme. */}
      <span className="ncu-only">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/screens/ncu/views.jpg" alt="The profile views panel: six college programs viewed the example wrestler, with logos, view counts and dates, and a bar of views per week" loading="lazy" className="block w-full" />
      </span>
      <span className="national-only">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/screens/rw/views.jpg" alt="The profile views panel: six college programs viewed the example wrestler, with logos, view counts and dates, and a bar of views per week" loading="lazy" className="block w-full" />
      </span>
      <figcaption className="px-4 py-2 text-[11px] text-white/50">
        The real panel, with an example wrestler. Free accounts see when and how often; programs are named with a membership.
      </figcaption>
    </figure>
  )
}

export function ClaimExplainer() {
  const video = CLAIM_VIDEO_URL ? embedUrl(CLAIM_VIDEO_URL) : null
  return (
    <section className="mx-auto mb-6 w-full max-w-xl text-white">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D3B574]"><BrandName /> · Free for every wrestler</p>
      <h1 className="mt-2 text-2xl font-black leading-tight sm:text-3xl">College coaches recruit <BrandName ncu="North Carolina wrestlers" national="wrestlers" /> here.</h1>
      <p className="mt-3 text-white/75">
        Men&apos;s and women&apos;s college programs use <BrandName /> to find wrestlers. Claim your profile so they can reach
        you, and see when they look.
      </p>

      {video ? (
        <div className="mt-5 overflow-hidden rounded-xl border border-white/10 bg-black">
          {video.kind === "iframe" ? (
            <iframe
              src={video.src}
              title="How to claim your RecruitNC profile"
              className="aspect-video w-full"
              allow="accelerometer; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <video src={video.src} controls playsInline className="aspect-video w-full" />
          )}
        </div>
      ) : null}
    </section>
  )
}

/** Below the search: what claiming gets you, the three steps, and who sees the private details. */
export function ClaimDetails() {
  return (
    <section className="mx-auto mt-6 w-full max-w-xl text-white">
      <ExampleViews />

      <ol className="mt-5 grid gap-2 sm:grid-cols-3">
        {STEPS.map(([title, body], i) => (
          <li key={title} className="rounded-xl border border-white/10 bg-[#0f1c2e] p-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#D3B574] text-xs font-black text-[#0A1628]">{i + 1}</span>
            <p className="mt-2 text-sm font-bold">{title}</p>
            <p className="mt-1 text-xs leading-relaxed text-white/65">{body}</p>
          </li>
        ))}
      </ol>

      <p className="mt-4 text-xs leading-relaxed text-white/55">
        Only verified college coaches see contact info and academics, never the public. Parents see every message a
        coach sends. A high school wrestler&apos;s public profile (name, school, class, results) can be found on Google
        so college coaches can find it; you can hide it from search at any time on the profile.{" "}
        <a href="/privacy" className="underline">Privacy</a>
      </p>
    </section>
  )
}
