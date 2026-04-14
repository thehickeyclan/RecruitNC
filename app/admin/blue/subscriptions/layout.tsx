import { BlueSubscriptionsPortalNav } from "@/components/admin/blue-subscriptions-portal-nav"

export default function BlueSubscriptionsPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50/90">
      <BlueSubscriptionsPortalNav />
      <div className="mx-auto max-w-7xl px-4 pt-6 md:px-8 md:pt-8">{children}</div>
    </div>
  )
}
