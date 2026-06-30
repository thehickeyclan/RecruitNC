import type { Metadata } from "next"
import { HardLink } from "@/components/hard-link"
import { TocPatrioticBar, TocVarsityHeading, tocDisplayClass, tocMobileCtaClass } from "@/components/toc/toc-theme"
import { registrationPayPageUrl } from "@/lib/toc/invitation-service"
import { formatTocRegistrationFee, registrationPaymentDueDisplay } from "@/lib/toc/registration-policy"

export const metadata: Metadata = {
  title: "You're In | Tournament of Champions 2026",
  description: "Your spot at the NC United Tournament of Champions is confirmed.",
  robots: { index: false, follow: false },
}

type Props = {
  searchParams: Promise<{ athlete?: string }>
}

export default async function TocConfirmSuccessPage({ searchParams }: Props) {
  const { athlete } = await searchParams
  const payHref = athlete ? registrationPayPageUrl(athlete) : "/tournament-of-champions/register/pay"

  return (
    <section className="min-h-[60vh] bg-[#0B1D3A] text-white flex flex-col">
      <TocPatrioticBar />
      <div className="container mx-auto w-full px-4 sm:px-6 py-16 sm:py-24 max-w-3xl flex-1 flex flex-col justify-center text-center">
        <p className="text-[#CC0000] text-sm tracking-[0.2em] uppercase font-semibold mb-4">Confirmed</p>
        <TocVarsityHeading as="h1" className="text-white text-4xl sm:text-5xl md:text-6xl mb-4">
          You&apos;re in.
        </TocVarsityHeading>
        <p className={`text-2xl sm:text-3xl text-white/90 mb-6 ${tocDisplayClass()}`}>Welcome to the field.</p>
        <p className="text-white/75 text-base sm:text-lg leading-relaxed max-w-xl mx-auto mb-4">
          Your spot is locked in. We sent a confirmation email with your weight class and event details.
        </p>
        <p className="text-white/55 text-sm max-w-xl mx-auto mb-10">
          Registration fee ({formatTocRegistrationFee()} by {registrationPaymentDueDisplay()}) is not due today —{" "}
          <a href={payHref} className="text-white underline hover:text-[#CC0000]">
            pay when you&apos;re ready
          </a>
          .
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <HardLink href="/tournament-of-champions/brackets" className={tocMobileCtaClass("primary")}>
            View brackets
          </HardLink>
          <HardLink href="/tournament-of-champions" className={tocMobileCtaClass("secondary")}>
            Event page
          </HardLink>
        </div>
      </div>
      <TocPatrioticBar />
    </section>
  )
}
