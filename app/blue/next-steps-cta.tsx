import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { BookOpen, Dumbbell, UserPlus } from "lucide-react"

const GOLD = "#D3B574"

const STEPS = [
  {
    id: "learn",
    title: "Learn",
    description: "What Blue is and why it exists.",
    icon: BookOpen,
    links: [
      { href: "#what-is", label: "What Is Blue" },
      { href: "#mission", label: "Mission & Vision" },
    ],
  },
  {
    id: "train",
    title: "Train",
    description: "How we train and where we compete.",
    icon: Dumbbell,
    links: [
      { href: "#training", label: "Training & Partnerships" },
      { href: "#national-team", label: "National Team Pipeline" },
    ],
  },
  {
    id: "join",
    title: "Join",
    description: "How to qualify and express interest.",
    icon: UserPlus,
    links: [
      { href: "#qualification", label: "Qualification" },
      { href: "#state-qualifier", label: "State Qualifier Interest" },
    ],
  },
] as const

export function NextStepsCTA() {
  return (
    <section className="mb-14" aria-label="Next steps">
      <h2 className="mb-1 text-lg font-semibold text-[#03154C]">Next steps</h2>
      <p className="mb-6 text-sm text-[#03154C]/80">
        Choose how you want to explore Blue.
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        {STEPS.map((step) => {
          const Icon = step.icon
          return (
            <Card
              key={step.id}
              className="border-2 border-[#D3B574]/40 transition-colors hover:border-[#D3B574]/70"
            >
              <CardContent className="p-5">
                <div
                  className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${GOLD}20` }}
                >
                  <Icon className="h-5 w-5" style={{ color: GOLD }} />
                </div>
                <h3 className="mb-1 font-bold text-[#03154C]">{step.title}</h3>
                <p className="mb-4 text-sm text-[#03154C]/80">{step.description}</p>
                <ul className="space-y-2">
                  {step.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm font-medium text-[#03154C] hover:underline"
                      >
                        {link.label} →
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </section>
  )
}
