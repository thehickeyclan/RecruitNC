/**
 * Family quotes for the sales pages (17 Oct 2026). DRAFTS written for Matt to take to each parent:
 * a quote appears on the site only once `approved` is true, which means that person has read it and
 * agreed to it word for word. Never set it on a guess, and never publish a quote someone has not
 * approved.
 */
export type Testimonial = { quote: string; name: string; detail: string; approved: boolean }

export const TESTIMONIALS: Testimonial[] = [
  {
    quote: "We were guessing at everything: which colleges to look at, when coaches could reach out, what it would really cost. Now we know what to do each month, and we can see which programs are looking at our son.",
    name: "Gemma Amiott",
    detail: "Wrestling parent",
    approved: false,
  },
  {
    quote: "The college map changed how we think about recruiting. We found programs we had never heard of that fit our daughter better than the names we started with.",
    name: "Beth Padgett",
    detail: "Wrestling parent",
    approved: false,
  },
  {
    quote: "Seeing that real college coaches were viewing his profile made it real for our family. The Command Center keeps every college, every coach and every next step in one place.",
    name: "Chad Richards",
    detail: "Wrestling parent",
    approved: false,
  },
]

export const approvedTestimonials = () => TESTIMONIALS.filter((t) => t.approved)
