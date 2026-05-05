import { redirect } from "next/navigation"

/** Legacy URL; training-fund-first landing (named-athlete giving lives under /fundraising/give and /fundraising/athletes). */
export default function FundraisingDonateAliasPage() {
  redirect("/fundraising/training-fund")
}
