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
 * What a claimed profile shows when college coaches look - a made-up example, never a real
 * wrestler's views (Matt asked for "a screenshot with the name blurred"; a real one still identifies
 * the kid by school and results, and coach interest is private). Same look as the profile's panel.
 */
/** What a free account sees: when, and how often. Program names and levels unlock with a plan. */
const EXAMPLE_VISITS: Array<[string, string]> = [
  ["Viewed 3 times", "Today"],
  ["Viewed once", "Yesterday"],
  ["Viewed 2 times", "3 days ago"],
  ["Viewed once", "Last week"],
]

function ExampleViews() {
  return (
    <div className="mt-5 rounded-xl border border-[#D3B574] bg-[#0f1c2e] p-4" aria-label="Example of the college coach views panel">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#D3B574]">Example · on your profile</p>
        <p className="text-[11px] text-white/45">Sample, not a real wrestler</p>
      </div>
      <p className="mt-2 text-lg font-black">6 college programs viewed this profile</p>
      <ul className="mt-3 space-y-2">
        {EXAMPLE_VISITS.map(([label, when]) => (
          <li key={label} className="flex items-center gap-3 rounded-lg border border-white/10 bg-[#0A1628] px-3 py-2">
            <span className="h-8 w-8 shrink-0 rounded-full bg-white/15 blur-[2px]" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block select-none text-sm font-bold text-white/80 blur-[5px]" aria-hidden>College Program Name</span>
              <span className="block text-xs text-white/50">{label}</span>
            </span>
            <span className="shrink-0 text-xs text-white/60">{when}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-white/55">Claim your profile to see when college coaches look at it.</p>
    </div>
  )
}

export function ClaimExplainer() {
  const video = CLAIM_VIDEO_URL ? embedUrl(CLAIM_VIDEO_URL) : null
  return (
    <section className="mx-auto mb-6 w-full max-w-xl text-white">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D3B574]">RecruitNC · Free for every wrestler</p>
      <h1 className="mt-2 text-2xl font-black leading-tight sm:text-3xl">College coaches recruit North Carolina wrestlers here.</h1>
      <p className="mt-3 text-white/75">
        Men&apos;s and women&apos;s college programs use RecruitNC to find wrestlers. Claim your profile so they can reach
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
        coach sends.
      </p>
    </section>
  )
}
