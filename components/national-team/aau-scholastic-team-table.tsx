import { cn } from "@/lib/utils"
import type { AauScholasticTeamMember } from "@/lib/aau-scholastic-duals-2026-content"
import { aauLinkClass, aauPriceClass } from "@/components/national-team/aau-scholastic-theme"

function TeamCell({ member }: { member: AauScholasticTeamMember }) {
  if (!member.cell?.trim()) {
    return <span className="text-white/35">—</span>
  }
  if (member.cellTel) {
    return (
      <a href={`tel:${member.cellTel}`} className={aauLinkClass}>
        {member.cell}
      </a>
    )
  }
  return <span className="text-white/90">{member.cell}</span>
}

export function AauScholasticTeamTable({
  members,
  className,
}: {
  members: readonly AauScholasticTeamMember[]
  className?: string
}) {
  return (
    <div
      className={cn("overflow-x-auto touch-pan-x rounded-lg border border-[#B31B1B]/25", className)}
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      <table className="w-full text-sm min-w-[320px] border-collapse">
        <thead>
          <tr className="bg-[#B31B1B]/25 text-white">
            <th className="text-left py-3 px-3 font-semibold">Name</th>
            <th className="text-left py-3 px-3 font-semibold">Role</th>
            <th className="text-left py-3 px-3 font-semibold whitespace-nowrap">Cell</th>
          </tr>
        </thead>
        <tbody>
          {members.map((member, i) => (
            <tr
              key={member.name}
              className={cn("border-t border-white/10", i % 2 === 1 && "bg-white/[0.03]")}
            >
              <td className="py-2.5 px-3 font-medium text-white">{member.name}</td>
              <td className={cn("py-2.5 px-3 whitespace-nowrap", aauPriceClass)}>{member.role}</td>
              <td className="py-2.5 px-3">
                <TeamCell member={member} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
