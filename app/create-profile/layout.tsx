import { shareMetadata } from "@/lib/share-metadata"
import { productName } from "@/lib/recruiting/product-name"

/** The page is a client component; the share card lives here so a texted link explains itself. */
export const metadata = shareMetadata({
  title: "Claim your RecruitNC profile",
  description:
    "College coaches recruit North Carolina wrestlers on RecruitNC. Your results are probably already here: find your name and claim it, free.",
  path: "/create-profile",
  kicker: "RecruitNC · Free for every wrestler",
  pageTitle: `Claim your profile | ${productName()}`,
})

export default function CreateProfileLayout({ children }: { children: React.ReactNode }) {
  return children
}
