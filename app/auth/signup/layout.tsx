import { shareMetadata } from "@/lib/share-metadata"

export const metadata = shareMetadata({
  title: "Create your free account",
  description: "Wrestlers, families and college coaches: join NC United and RecruitNC.",
  path: "/auth/signup",
  kicker: "NC United · RecruitNC",
})

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children
}
