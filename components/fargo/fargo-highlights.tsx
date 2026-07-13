import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { HardLink } from "@/components/hard-link"
import type { FargoHighlight } from "@/lib/fargo-archive"
import type { FargoArchiveWrestler } from "@/lib/fargo-archive-fetch"
import { ProfileScrollTable } from "@/components/profile-scroll-table"

export function FargoHighlightsSection({
  title,
  items,
  variant = "aa",
}: {
  title: string
  items: FargoHighlight[]
  variant?: "aa" | "top" | "near"
}) {
  if (!items.length) return null
  const border =
    variant === "aa" ? "border-[#CBAF5D]" : variant === "near" ? "border-[#002147]/20" : "border-[#B31B1B]/30"
  return (
    <Card className={`border-2 ${border}`}>
      <CardHeader className="bg-[#002147] text-white py-4">
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0 divide-y">
        {items.map((item) => (
          <div key={`${item.athleteName}-${item.weight}`} className="p-4 sm:p-5">
            <div className="flex flex-wrap items-baseline gap-2 mb-1">
              <span className="font-bold text-[#002147] text-lg">{item.athleteName}</span>
              <span className="text-muted-foreground">{item.weight} lbs</span>
              <Badge variant="outline" className="font-mono">{item.record}</Badge>
              {item.placement ? (
                <Badge className="bg-[#CBAF5D] text-[#002147] hover:bg-[#CBAF5D]">{item.placement} All-American</Badge>
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground">{item.blurb}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export function FargoWrestlersTable({
  title,
  rows,
  emptyMessage,
}: {
  title: string
  rows: FargoArchiveWrestler[]
  emptyMessage?: string
}) {
  return (
    <Card className="border border-[#002147]/15">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg text-[#002147]">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0 sm:p-0">
        {rows.length === 0 ? (
          <p className="px-4 pb-4 text-sm text-muted-foreground">
            {emptyMessage ?? "Individual wrestler records for this division are not loaded yet."}
          </p>
        ) : (
          <ProfileScrollTable minWidthPx={640}>
            <thead>
              <tr className="border-b bg-muted/40 text-left">
                <th className="px-4 py-3 font-semibold">Wrestler</th>
                <th className="px-4 py-3 font-semibold">School</th>
                <th className="px-4 py-3 font-semibold">Wt</th>
                <th className="px-4 py-3 font-semibold">Record</th>
                <th className="px-4 py-3 font-semibold">Result</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">
                    {row.profileHref ? (
                      <HardLink href={row.profileHref} className="text-[#002147] hover:underline">
                        {row.athlete_name}
                      </HardLink>
                    ) : (
                      row.athlete_name
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{row.high_school ?? "—"}</td>
                  <td className="px-4 py-3">{row.weight_class}</td>
                  <td className="px-4 py-3 font-mono">{row.record}</td>
                  <td className="px-4 py-3">
                    {row.placement ? (
                      <Badge className={row.is_all_american ? "bg-[#CBAF5D] text-[#002147] hover:bg-[#CBAF5D]" : ""}>
                        {row.placement}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </ProfileScrollTable>
        )}
      </CardContent>
    </Card>
  )
}
