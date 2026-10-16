/**
 * The product's name where it is printed in a page: RecruitNC on NC United's address, Guild
 * Recruiting on recruit.wrestlingguild.com, RecruitWrestlers on recruitwrestlers.com. All three
 * are rendered; the address decides which shows (app/recruit-brand.css), so no page flashes the
 * wrong one and NC United's pages are unchanged.
 */
export function BrandName({ ncu = "RecruitNC", guild = "Guild Recruiting", national = "RecruitWrestlers" }: { ncu?: string; guild?: string; national?: string }) {
  return (
    <>
      <span className="ncu-only">{ncu}</span>
      <span className="national-only">{national}</span>
      <span className="guild-only">{guild}</span>
    </>
  )
}
