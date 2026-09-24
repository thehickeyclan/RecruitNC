import { permanentRedirect } from "next/navigation"

type UnifiedProfileRedirectProps = {
  params: Promise<{ id: string }>
}

/**
 * Compatibility route for older links.
 *
 * `/view-profile` is the one canonical athlete profile. Keeping a second renderer here caused
 * the two pages to drift whenever profile sections changed. A permanent redirect preserves every
 * existing shared link while ensuring there is only one interface and one data path to maintain.
 */
export default async function UnifiedProfileRedirect({ params }: UnifiedProfileRedirectProps) {
  const { id } = await params
  permanentRedirect(`/view-profile?id=${encodeURIComponent(id)}`)
}
