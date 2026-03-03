/**
 * Force checkout routes to be server-rendered on demand.
 * Avoids "location is not defined" during static generation (shipping page
 * or its dependencies can reference browser globals).
 */
export const dynamic = "force-dynamic"

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
