/**
 * Money words (Matt, 31 Oct 2026): "dowe have definitations of pell grans, FAFSA, CSS, loantypes,
 * 529, etc? can't assume familes are educated.." and then "you have to".
 *
 * Every word a family meets on an offer letter, in one or two plain sentences: what it is, who it
 * is for, whether it is paid back, and where to go. Shown as a glossary on the money guide
 * (/recruiting/learn/what-will-we-owe#money-words) and behind a small ⓘ wherever the word appears
 * (components/recruiting/money-word.tsx): the calculator, the guide and the article.
 *
 * The same standard as the rest of the Learn library:
 *
 * - **Every definition is checked against an official page and links to it**: studentaid.gov for
 *   federal aid, the College Board for the CSS Profile, the IRS and the SEC's Investor.gov for 529
 *   plans. The college-athletics words (merit aid, athletic scholarship, renewal, revenue share) are
 *   read from the library itself by heading, so they say exactly what the library says.
 * - **A number that changes every year carries its award year and its source** (`yearly`), or it is
 *   left out. Read on MONEY_CHECKED.
 * - **Never income.** No definition asks about or hints at what a family earns. Where the official
 *   page describes who qualifies by income, we say "financial need", the government's own term.
 *
 * Plain words, short sentences. A definition that needs another definition has failed.
 */
import { type SourceKey } from "./content"
import { section } from "./official-visits"

/** Every definition was read against its source on this date. */
export const MONEY_CHECKED = "2026-10-31"

export type MoneyWordId =
  | "cost-of-attendance"
  | "net-price"
  | "grant-scholarship-loan"
  | "aid-offer"
  | "fafsa"
  | "sai"
  | "pell"
  | "css-profile"
  | "student-loans"
  | "parent-plus"
  | "work-study"
  | "529"
  | "merit-aid"
  | "athletic-scholarship"
  | "renewal"
  | "revenue-share"

export type MoneyWord = {
  id: MoneyWordId
  term: string
  /** One or two plain sentences: what it is and who it is for. */
  means: string
  /** Paid back? Said plainly, because that is the question. */
  paidBack: string
  /** Where to go: an official page a family can act on. */
  go: { label: string; href: string }
  /** A figure that changes every year, with the award year it belongs to. */
  yearly?: { fact: string; year: string }
  sources: SourceKey[]
  /** Read from the Learn library itself, so checked on its date (content.ts CHECKED). */
  library?: true
}

const bullet = (heading: { heading: string; bullets?: string[] }, starts: string) => {
  const b = heading.bullets?.find((x) => x.startsWith(starts))
  if (!b) throw new Error(`No bullet starting "${starts}" in "${heading.heading}"`)
  return b
}

const GRANT = section("questions-families-ask", "What is the difference between a grant and a scholarship?")
const COVERS = section("paying-for-college", "What an athletic scholarship covers, and for how long")
const REVENUE = section("questions-families-ask", "What is revenue sharing?")

const STUDENT_AID = { label: "StudentAid.gov", href: "https://studentaid.gov" }
const FAFSA_FORM = { label: "Fill out the FAFSA at StudentAid.gov", href: "https://studentaid.gov/h/apply-for-aid/fafsa" }
const NET_PRICE = { label: "Find a college's Net Price Calculator", href: "https://collegecost.ed.gov/net-price" }

export const MONEY_WORDS: MoneyWord[] = [
  {
    id: "cost-of-attendance",
    term: "Cost of attendance",
    means: "The college's full price for one year: tuition, fees, housing, food, books and supplies. It is not what you will pay. That is the net price.",
    paidBack: "Not aid. It is the price.",
    go: { label: "Each college's aid offer shows it", href: "https://studentaid.gov/articles/financial-aid-dictionary/" },
    sources: ["aidDictionary"],
  },
  {
    id: "net-price",
    term: "Sticker price and net price",
    means:
      "The sticker price is the cost of attendance before any help. The net price is what is left after grants and scholarships are taken off. On My List, \"after aid\" is the college's average net price, before any athletic scholarship.",
    paidBack: "Not aid. It is what you pay or borrow.",
    go: NET_PRICE,
    sources: ["aidDictionary", "netPrice"],
  },
  {
    id: "grant-scholarship-loan",
    term: "Grant, scholarship or loan",
    means:
      "Grants and scholarships are money you keep. A grant is usually based on financial need. A scholarship can be for grades, talent or need. A loan is money you borrow.",
    paidBack: "Grants and scholarships: no. Loans: yes, with interest.",
    go: { label: "Types of aid at StudentAid.gov", href: "https://studentaid.gov/understand-aid/types" },
    sources: ["aidTypes", "aidDictionary"],
  },
  {
    id: "aid-offer",
    term: "Financial aid offer",
    means:
      "The letter from a college that lists the aid it offers: grants, scholarships, work-study and loans. It comes after the student is admitted. The calculator on My List turns it into what you owe.",
    paidBack: "Some of it. Loans in the offer are paid back.",
    go: { label: "Aid offers at StudentAid.gov", href: "https://studentaid.gov/articles/financial-aid-dictionary/" },
    sources: ["aidDictionary"],
  },
  {
    id: "fafsa",
    term: "FAFSA",
    means:
      "The free federal form that applies for grants, work-study and federal loans. Some states and colleges use it for their own aid too. File it every year of college. It never costs money.",
    paidBack: "Not aid. It is the form that gets you aid.",
    go: FAFSA_FORM,
    yearly: { fact: "The 2027–28 FAFSA is open. It is the one for the 2027–28 school year.", year: "2027–28 award year (July 1, 2027 to June 30, 2028)" },
    sources: ["fafsa", "aidTypes"],
  },
  {
    id: "sai",
    term: "Student Aid Index (SAI)",
    means:
      "A number the FAFSA works out from your form. The college takes it away from the cost of attendance to see how much need-based aid the student can get. It is not a bill, and not what your family must pay. It replaced the Expected Family Contribution (EFC).",
    paidBack: "Not aid. It is a number on your FAFSA results.",
    go: { label: "The SAI explained (StudentAid.gov)", href: "https://studentaid.gov/sites/default/files/sai-explained.pdf" },
    sources: ["aidDictionary", "saiExplained", "fsaReport"],
  },
  {
    id: "pell",
    term: "Pell Grant",
    means: "A federal grant for undergraduates with very high financial need. You apply for it by filing the FAFSA. The college works out the amount.",
    paidBack: "No, except in a few cases, such as leaving school and owing a refund.",
    go: { label: "Pell Grants at StudentAid.gov", href: "https://studentaid.gov/understand-aid/types/grants/pell" },
    yearly: { fact: "The most a student can get is $7,395 a year.", year: "2026–27 (July 1, 2026 to June 30, 2027)" },
    sources: ["pell", "aidTypes"],
  },
  {
    id: "css-profile",
    term: "CSS Profile",
    means:
      "A second aid form, run by the College Board, that some colleges use to hand out their own need-based money. It is separate from the FAFSA. Check whether each college on your list asks for it.",
    paidBack: "Not aid. It is the form some colleges use for their own aid.",
    go: { label: "CSS Profile at the College Board", href: "https://cssprofile.collegeboard.org/" },
    sources: ["cssProfile"],
  },
  {
    id: "student-loans",
    term: "Subsidized and unsubsidized loans",
    means:
      "Federal loans in the student's name. Subsidized loans are for undergraduates with financial need: the government pays the interest while the student is in school at least half-time. Unsubsidized loans need no financial need, and interest grows the whole time, even in school.",
    paidBack: "Yes. Payments start six months after the student leaves school.",
    go: { label: "Federal student loans at StudentAid.gov", href: "https://studentaid.gov/understand-aid/types/loans/subsidized-unsubsidized" },
    sources: ["directLoans", "aidDictionary"],
  },
  {
    id: "parent-plus",
    term: "Parent PLUS loan",
    means:
      "A federal loan a parent takes out, in the parent's own name, for an undergraduate's college costs. There is a credit check. The student files the FAFSA first.",
    paidBack: "Yes, by the parent, with interest. Payments can wait while the student is in school, if you ask, but interest still grows.",
    go: { label: "Parent PLUS loans at StudentAid.gov", href: "https://studentaid.gov/understand-aid/types/loans/plus/parent" },
    yearly: {
      fact: "For a student starting college from July 1, 2026, parents can borrow up to $20,000 a year and $65,000 in total. Interest is 9.07%, fixed, plus a 4.228% fee.",
      year: "Loans first paid out July 1, 2026 to June 30, 2027",
    },
    sources: ["parentPlus", "aidDictionary"],
  },
  {
    id: "work-study",
    term: "Work-study",
    means:
      "A part-time job, on or off campus, for students with financial need. The student earns it by the hour, up to the amount in the offer. Not every college takes part, and funds are limited, so file the FAFSA early.",
    paidBack: "No. It is pay for work done.",
    go: { label: "Work-study at StudentAid.gov", href: "https://studentaid.gov/understand-aid/types/work-study" },
    sources: ["workStudy", "aidDictionary"],
  },
  {
    id: "529",
    term: "529 plan",
    means:
      "A savings account for school costs, run by a state or a college. Money in it grows free of federal tax when it is spent on tuition, fees, books, housing and food. Anyone can open one for any student.",
    paidBack: "Not aid and not a loan. It is your own savings.",
    go: { label: "529 plans at Investor.gov", href: "https://www.investor.gov/introduction-investing/investing-basics/glossary/529-plans" },
    sources: ["irs529", "investor529"],
  },
  {
    id: "merit-aid",
    term: "Merit aid",
    means: bullet(GRANT, "An academic or merit scholarship"),
    paidBack: "No. It is a scholarship.",
    go: { label: "Ask each college's admissions office what earns it", href: "/recruiting/learn/paying-for-college" },
    sources: GRANT.sources,
    library: true,
  },
  {
    id: "athletic-scholarship",
    term: "Athletic scholarship",
    means: bullet(GRANT, "\"Grant-in-aid\" is the NCAA's own term"),
    paidBack: "No. It is a scholarship.",
    go: { label: "What it covers, in the Learn library", href: "/recruiting/learn/paying-for-college" },
    sources: GRANT.sources,
    library: true,
  },
  {
    id: "renewal",
    term: "Renewal",
    means: `Whether an athletic scholarship carries on the next year. ${bullet(COVERS, "In many cases the head coach decides")} ${bullet(COVERS, "If a college plans to reduce")}`,
    paidBack: "Not aid. It is whether the aid continues.",
    go: { label: "Ask the coach, in writing", href: "/recruiting/learn/paying-for-college" },
    sources: COVERS.sources,
    library: true,
  },
  {
    id: "revenue-share",
    term: "Revenue share",
    means: `${REVENUE.intro!} ${bullet(REVENUE, "A college may not put a revenue-share offer in writing")}`,
    paidBack: "No. Count it only if it is in the written offer.",
    go: { label: "NIL and revenue sharing in wrestling", href: "/recruiting/learn/nil" },
    sources: REVENUE.sources,
    library: true,
  },
]

export const moneyWord = (id: MoneyWordId): MoneyWord => {
  const w = MONEY_WORDS.find((x) => x.id === id)
  if (!w) throw new Error(`No money word "${id}"`)
  return w
}

/** Where the glossary lives. */
export const MONEY_WORDS_HREF = "/recruiting/learn/what-will-we-owe#money-words"

/**
 * "First time doing this?" (Matt, 31 Oct 2026): the three things to do, in order, at the top of the
 * guide. Each is the library's own advice; the words link to their definitions.
 */
export const FIRST_TIME: Array<{ title: string; line: string; word: MoneyWordId; href: string; cta: string }> = [
  { title: "File the FAFSA", line: "Free, every year. It is how a college offers grants, work-study and loans.", word: "fafsa", href: FAFSA_FORM.href, cta: "StudentAid.gov" },
  { title: "Run each college's Net Price Calculator", line: "Your own estimate, before any offer. About ten minutes a college.", word: "net-price", href: NET_PRICE.href, cta: "Find calculators" },
  { title: "Ask each coach for the offer in writing", line: "How much, for how many years, and whether it renews. Then put it in the calculator.", word: "renewal", href: "/my-recruiting/colleges#cost", cta: "The calculator" },
]
