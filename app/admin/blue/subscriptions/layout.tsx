import { BlueSubscriptionsPortalNav } from "@/components/admin/blue-subscriptions-portal-nav"

export default function BlueSubscriptionsPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen admin-dark-page bg-[#0A1628] text-white">
      <BlueSubscriptionsPortalNav />
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-4 md:px-6">{children}</div>
    </div>
  )
}
