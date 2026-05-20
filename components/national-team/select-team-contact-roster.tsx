import { NHSCA_DUALS_2026_SELECT_ROSTER } from "@/lib/nhsca-duals-2026-hub-contact-roster"
import { TeamContactRoster } from "@/components/national-team/team-contact-roster"

/** @deprecated Use TeamContactRoster with rows from hub-contact-roster. */
export function SelectTeamContactRoster({ className }: { className?: string }) {
  return <TeamContactRoster rows={NHSCA_DUALS_2026_SELECT_ROSTER} className={className} />
}
