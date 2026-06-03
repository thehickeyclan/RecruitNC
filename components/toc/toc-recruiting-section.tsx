import { TocPatrioticBar, TocVarsityHeading } from "@/components/toc/toc-theme"

export function TocRecruitingSection() {
  return (
    <section className="py-16 bg-[#0B1D3A] text-white relative">
      <div className="container mx-auto px-4 max-w-3xl">
        <TocVarsityHeading as="h2" className="text-4xl text-white mb-4">
          Recruiting experience
        </TocVarsityHeading>
        <p className="text-white/85 text-lg mb-8 border-l-4 border-[#CC0000] pl-4">
          College-bound athletes deserve to be seen in context. Alongside the tournament, NC United hosts recruiting
          education and a college fair — scheduled around wrestling so families don&apos;t miss matches.
        </p>
        <ul className="space-y-4">
          {[
            "College coach panel — programs on stage, Q&A for families",
            "Recruiting workshop — how to build your profile and reach coaches (RecruitNC team)",
            "College fair — programs at tables in the lobby; RSVP by email",
            "RecruitNC booth — athlete profile setup and platform walkthrough",
          ].map((item) => (
            <li key={item} className="flex gap-3">
              <span className="text-[#CC0000] font-bold shrink-0">▸</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p className="mt-8 text-sm text-white/55">
          College programs: email{" "}
          <a href="mailto:recruiting@ncwrestlingunited.com" className="text-white underline hover:text-[#CC0000]">
            recruiting@ncwrestlingunited.com
          </a>{" "}
          to reserve a fair table.
        </p>
      </div>
      <TocPatrioticBar className="absolute bottom-0 left-0 right-0" />
    </section>
  )
}
