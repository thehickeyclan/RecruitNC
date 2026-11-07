/**
 * Family quotes for the sales pages.
 *
 * A quote appears on the site only once `approved` is true. Never set it on a guess.
 *
 * The four below (3 Nov 2026) are drawn from messages each parent sent Matt directly, trimmed to
 * the line about the platform and the recruiting, with nothing added. Matt gave the word to
 * publish them. The wording is ours, not theirs, so if a parent asks for a change, change it
 * here first and apologise second.
 *
 * These run on both brands - NC United and recruitwrestlers.com - so they name the platform and
 * the recruiting, never a club, a camp or a weekend. Keep any new one brand-neutral.
 */
export type Testimonial = { quote: string; name: string; detail: string; approved: boolean }

export const TESTIMONIALS: Testimonial[] = [
  {
    quote: "This platform made a huge difference in Brieon's development and recruiting, and we are forever grateful.",
    name: "Brittany Mayfield",
    detail: "Wrestling parent, North Carolina",
    approved: true,
  },
  {
    quote: "You gave these kids a stage to perform on in front of all those coaches, and our kids are reaping the rewards.",
    name: "Gemma Amiott",
    detail: "Wrestling parent, North Carolina",
    approved: true,
  },
  {
    quote: "A lot of good information: some we had thought of and some we hadn't. You've given these young men the opportunity to sharpen their skills and show their talent.",
    name: "Emily Thomas",
    detail: "Wrestling parent, North Carolina",
    approved: true,
  },
  {
    quote: "What you led the wrestling community to was a new standard, and that matters. Kids' lives will change because of what you are doing.",
    name: "Chad Richards",
    detail: "Wrestling parent, North Carolina",
    approved: true,
  },
]

export const approvedTestimonials = () => TESTIMONIALS.filter((t) => t.approved)
