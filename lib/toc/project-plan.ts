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

export type TocTaskComment = {
  id: string
  body: string
  createdAt: string
  createdBy: {
    userId?: string | null
    email: string
    name?: string | null
  }
}

export type TocProjectDocument = {
  id: string
  title: string
  category: string | null
  description: string | null
  amount: number | null
  url: string
  path?: string | null
  file_name: string
  file_type: string | null
  file_size: number | null
  uploaded_by: string | null
  created_at: string
}

export type TocProjectChatMessage = {
  id: string
  body: string
  author_email: string
  author_user_id: string | null
  created_at: string
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
  comments: TocTaskComment[]
  created_at?: string
  updated_at?: string
}

export const TOC_PROJECT_CATEGORIES = [
  { name: "Venue & Operations", color: "bg-white border-gray-200 text-gray-900", accent: "bg-sky-500" },
  { name: "Competition", color: "bg-white border-gray-200 text-gray-900", accent: "bg-rose-500" },
  { name: "Awards & Apparel", color: "bg-white border-gray-200 text-gray-900", accent: "bg-yellow-500" },
  { name: "Branding & Signage", color: "bg-white border-gray-200 text-gray-900", accent: "bg-violet-500" },
  { name: "Fan Experience", color: "bg-white border-gray-200 text-gray-900", accent: "bg-emerald-500" },
  { name: "Recruiting", color: "bg-white border-gray-200 text-gray-900", accent: "bg-indigo-500" },
  { name: "Marketing", color: "bg-white border-gray-200 text-gray-900", accent: "bg-pink-500" },
  { name: "Special Events", color: "bg-white border-gray-200 text-gray-900", accent: "bg-orange-500" },
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
        comments: [],
      }
      order += 10
      return task
    }),
  )
}

export function sanitizeProjectStatus(value: unknown): TocProjectStatus {
  return TOC_PROJECT_STATUSES.includes(value as TocProjectStatus) ? (value as TocProjectStatus) : "todo"
}
