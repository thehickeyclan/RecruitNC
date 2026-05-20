import { permanentRedirect } from "next/navigation"

/** Legacy hub checkout URL — consolidated under `/fundraising/training-fund`. */
export default function FundraisingGivePageRedirect() {
  permanentRedirect("/fundraising/training-fund")
}
