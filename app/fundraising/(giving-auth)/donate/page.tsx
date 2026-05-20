import { redirect } from "next/navigation"

/** Legacy URL; training-fund-first landing (named-athlete giving lives under `/fundraising/athletes`; hub pool checkout `/fundraising/training-fund`). */
export default function FundraisingDonateAliasPage() {
  redirect("/fundraising/training-fund")
}
