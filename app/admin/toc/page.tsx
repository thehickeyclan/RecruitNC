import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { HardLink } from "@/components/hard-link"
import { Trophy, Users, Mail, Handshake, UserCheck, LayoutGrid, Scale, HandHeart, Newspaper } from "lucide-react"

const LINKS = [
  {
    href: "/admin/toc/invitations",
    title: "Invitations",
    description: "Invite athletes, track who hasn’t accepted, mark declined, refresh confirm windows",
    icon: UserCheck,
  },
  {
    href: "/admin/toc/field",
    title: "Field & brackets",
    description: "Track wrestlers by weight, seed, publish official draws",
    icon: LayoutGrid,
  },
  {
    href: "/admin/toc/compare",
    title: "Athlete compare",
    description: "Head-to-head, state, NHSCA, Duals, Super32 — seeding recommendation",
    icon: Scale,
  },
  {
    href: "/admin/toc/nominations",
    title: "Prospect interest",
    description: "Athlete interest forms — name, weight, school, club",
    icon: Users,
  },
  {
    href: "/admin/toc/sponsors",
    title: "Sponsors",
    description: "Sponsor inquiry pipeline",
    icon: Handshake,
  },
  {
    href: "/admin/toc/media",
    title: "Media requests",
    description: "Credentials & coverage pipeline",
    icon: Newspaper,
  },
  {
    href: "/admin/toc/volunteers",
    title: "Volunteers",
    description: "Volunteer interest signups",
    icon: HandHeart,
  },
  {
    href: "/admin/toc/email",
    title: "Email list",
    description: "Subscribers + CSV export",
    icon: Mail,
  },
  {
    href: "/tournament-of-champions/brackets",
    title: "Public brackets",
    description: "Published weight-class draws",
    icon: LayoutGrid,
    external: true,
  },
  {
    href: "/tournament-of-champions",
    title: "Public page",
    description: "View marketing landing page",
    icon: Trophy,
    external: true,
  },
]

export default function TocAdminHubPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tournament of Champions</h1>
        <p className="text-muted-foreground mt-1">Invitations, field, athlete compare, prospect interest, sponsors, media, volunteers, email list</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {LINKS.map(({ href, title, description, icon: Icon, external }) => (
          <Card key={href} className="hover:border-[#002147]/30 transition-colors">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Icon className="h-5 w-5 text-[#002147]" />
                <CardTitle className="text-lg">
                  {external ? (
                    <HardLink href={href} className="hover:underline">
                      {title}
                    </HardLink>
                  ) : (
                    <HardLink href={href} className="hover:underline">
                      {title}
                    </HardLink>
                  )}
                </CardTitle>
              </div>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
              {external ? (
                <HardLink href={href} className="text-sm text-[#B31B1B] font-medium">
                  Open →
                </HardLink>
              ) : (
                <HardLink href={href} className="text-sm text-[#B31B1B] font-medium">
                  Manage →
                </HardLink>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
