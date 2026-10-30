import { PortalShell } from "@/components/portal/portal-shell"
import { LearnTabs } from "@/components/recruiting/learn/learn-tabs"

/**
 * A Learn article inside the Command Center for a signed-in family - the menu and the Learn tabs
 * stay put, so moving between topics never drops them out of the portal (Matt, 29 Oct 2026). A
 * visitor who is not signed in reads the same article on its own, as before.
 */
export function LearnFrame({ signedIn, children }: { signedIn: boolean; children: React.ReactNode }) {
  if (!signedIn) {
    return (
      <main className="min-h-screen bg-[#0A1628] px-4 py-8 text-white sm:px-6">
        <div className="mx-auto max-w-3xl">{children}</div>
      </main>
    )
  }
  return (
    <PortalShell active="learn">
      <div className="mx-auto max-w-7xl text-white">
        <LearnTabs className="mb-6" />
        <div className="max-w-3xl">{children}</div>
      </div>
    </PortalShell>
  )
}
