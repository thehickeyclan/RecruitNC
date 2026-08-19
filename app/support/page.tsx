import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "App Support",
  description: "Help with the NC United app — alerts, practice sign-up, accounts and data requests.",
}

const FAQ = [
  {
    q: "I'm not getting alerts",
    a: "Open More → Alerts and check they are turned on, then check iOS Settings → Notifications → NC United. Alerts only work on a real device, not a simulator.",
  },
  {
    q: "How do I sign up for a practice?",
    a: "Open Calendar, tap a practice, then Drop in. You'll fill in wrestler and guardian details, accept the waiver, and pay on the next screen. A confirmation email follows.",
  },
  {
    q: "Can I use the app without an account?",
    a: "Yes. Commitments, rankings, the calendar and Data Dawg are all open. You only enter details when reserving a practice spot.",
  },
  {
    q: "A ranking or commitment looks wrong",
    a: "Email us with the athlete's name and what's incorrect and we'll review it.",
  },
  {
    q: "Delete my information",
    a: "Email us from the address you registered with and tell us what to remove. We'll confirm when it's done.",
  },
]

/** Public and unauthenticated on purpose: App Review must reach support without an account. */
export default function AppSupportPage() {
  return (
    <main className="min-h-screen bg-rnc-ink px-6 py-16 text-white">
      <div className="mx-auto max-w-3xl">
        <p className="text-xs font-bold tracking-[0.2em] text-rnc-gold">NC UNITED WRESTLING</p>
        <h1 className="mt-2 text-4xl font-extrabold tracking-tight">App Support</h1>
        <p className="mt-3 text-[15px] text-[#A8BBD1]">
          Questions about the NC United app? Email{" "}
          <a className="text-rnc-gold underline" href="mailto:info@ncwrestlingunited.com">
            info@ncwrestlingunited.com
          </a>{" "}
          and we&apos;ll get back to you.
        </p>

        <div className="mt-10 space-y-6">
          {FAQ.map((item) => (
            <section key={item.q} className="rounded-xl border border-rnc-line bg-rnc-raised p-5">
              <h2 className="font-bold text-white">{item.q}</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-[#D6E1EE]">{item.a}</p>
            </section>
          ))}
        </div>

        <p className="mt-10 text-sm text-[#A8BBD1]">
          See also our{" "}
          <a className="text-rnc-gold underline" href="/privacy">
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </main>
  )
}
