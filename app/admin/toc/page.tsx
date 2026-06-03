import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { HardLink } from "@/components/hard-link"
import { Trophy, Users, Mail, Handshake } from "lucide-react"

const LINKS = [
  {
    href: "/admin/toc/nominations",
    title: "Nominations",
    description: "Review public athlete nominations",
    icon: Users,
  },
  {
    href: "/admin/toc/sponsors",
    title: "Sponsors",
    description: "Sponsor inquiry pipeline",
    icon: Handshake,
  },
  {
    href: "/admin/toc/email",
    title: "Email list",
    description: "Subscribers + CSV export",
    icon: Mail,
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
        <p className="text-muted-foreground mt-1">Phase 1 admin — nominations, sponsors, email list</p>
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
                    <Link href={href} className="hover:underline">
                      {title}
                    </Link>
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
                <Link href={href} className="text-sm text-[#B31B1B] font-medium">
                  Manage →
                </Link>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
