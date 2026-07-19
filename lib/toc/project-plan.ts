export const TOC_PROJECT_STATUSES = ["todo", "in_progress", "blocked", "done"] as const
export type TocProjectStatus = (typeof TOC_PROJECT_STATUSES)[number]

export type TocTaskAssignee = {
  name: string
  email?: string | null
  userId?: string | null
}

export type TocTaskLink = {
  label: string
  url: string
}

export type TocTaskAttachment = {
  name: string
  url: string
  path?: string | null
  type?: string | null
  size?: number | null
  uploadedAt: string
  uploadedBy?: string | null
}

export type TocProjectTask = {
  id: string
  category: string
  title: string
  status: TocProjectStatus
  priority: "low" | "normal" | "high" | "urgent"
  sort_order: number
  budget_amount: number | null
  actual_amount: number | null
  due_date: string | null
  notes: string | null
  assignees: TocTaskAssignee[]
  links: TocTaskLink[]
  attachments: TocTaskAttachment[]
  created_at?: string
  updated_at?: string
}

export const TOC_PROJECT_CATEGORIES = [
  { name: "Venue & Operations", color: "bg-blue-50 border-blue-200 text-blue-900", accent: "bg-blue-600" },
  { name: "Competition", color: "bg-red-50 border-red-200 text-red-900", accent: "bg-red-600" },
  { name: "Awards & Apparel", color: "bg-amber-50 border-amber-200 text-amber-900", accent: "bg-amber-500" },
  { name: "Branding & Signage", color: "bg-purple-50 border-purple-200 text-purple-900", accent: "bg-purple-600" },
  { name: "Fan Experience", color: "bg-emerald-50 border-emerald-200 text-emerald-900", accent: "bg-emerald-600" },
  { name: "Recruiting", color: "bg-indigo-50 border-indigo-200 text-indigo-900", accent: "bg-indigo-600" },
  { name: "Marketing", color: "bg-pink-50 border-pink-200 text-pink-900", accent: "bg-pink-600" },
  { name: "Special Events", color: "bg-orange-50 border-orange-200 text-orange-900", accent: "bg-orange-600" },
] as const

const seedTitlesByCategory: Record<string, string[]> = {
  "Venue & Operations": [
    "Negotiate & sign venue contract",
    "Hire Tournament Operations Director",
    "Order wrestling mats",
    "Secure scales",
    "Hire officials",
    "Hire athletic trainer / medical staff",
    "Recruit setup & teardown volunteers (mats, taping, venue setup)",
    "Recruit table workers",
    "Recruit general event volunteers",
    "Plan VIP Lounge",
  ],
  Competition: [
    "Select & invite Top 88 wrestlers",
    "Finalize 11 brackets",
    "Select bracketing platform (Trackwrestling or FloArena)",
  ],
  "Awards & Apparel": [
    "Design & order Tournament of Champions jackets",
    "Order medals",
    "Order championship hammers",
    "Finalize event apparel",
  ],
  "Branding & Signage": [
    "Design & print event posters",
    "Design venue signage & directional signs",
    "Produce sponsor signage",
    "Order NC United tablecloths",
    "Order Wrestling Guild tablecloths",
    "Design recruiting/vendor booth displays",
  ],
  "Fan Experience": [
    "Secure ticketing vendor",
    "Order access wristbands (by attendee type)",
    "Finalize concessions & food vendors",
    "Secure FloWrestling streaming",
    "Confirm commentators",
    "Identify Master of Ceremonies (MC)",
    "National Anthem",
    "Opening Prayer",
    "Plan Parade of Champions",
  ],
  Recruiting: ["Recruit college coaches", "Organize Coaches Lounge / VIP area"],
  Marketing: [
    "Launch Tournament website & registration portal",
    "Build all online forms",
    "Launch social media campaign",
    "Secure sponsors",
  ],
  "Special Events": ["Plan Wrestlers in Business Network event", "Organize Caden Perry Scholarship presentation"],
}

export function tocProjectSeedTasks(): TocProjectTask[] {
  let order = 10
  return Object.entries(seedTitlesByCategory).flatMap(([category, titles]) =>
    titles.map((title, idx) => {
      const task: TocProjectTask = {
        id: `seed-${category.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${idx}`,
        category,
        title,
        status: "todo",
        priority: title.includes("contract") || title.includes("Top 88") || title.includes("sponsors") ? "high" : "normal",
        sort_order: order,
        budget_amount: null,
        actual_amount: null,
        due_date: null,
        notes: null,
        assignees: [],
        links: [],
        attachments: [],
      }
      order += 10
      return task
    }),
  )
}

export function sanitizeProjectStatus(value: unknown): TocProjectStatus {
  return TOC_PROJECT_STATUSES.includes(value as TocProjectStatus) ? (value as TocProjectStatus) : "todo"
}
