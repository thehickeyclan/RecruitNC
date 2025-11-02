import type { Metadata } from "next"
import Link from "next/link"
import { getProspectRankingsByYear } from "@/services/rankings-service"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Edit, Trash2 } from "lucide-react"
import Image from "next/image"

export const metadata: Metadata = {
  title: "Manage Class Rankings | Admin",
  description: "Manage prospect rankings for a specific graduation year",
}

interface YearRankingsPageProps {
  params: { year: string }
}

export default async function YearRankingsPage({ params }: YearRankingsPageProps) {
  const year = Number.parseInt(params.year)
  const rankings = await getProspectRankingsByYear(year)

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Class of {year} Rankings</h1>
          <p className="mt-1 text-gray-600">Manage prospect rankings for the class of {year}</p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href={`/admin/rankings/add?year=${year}`}>Add New Ranking</Link>
          </Button>
        </div>
      </div>

      {rankings.length === 0 ? (
        <Card className="border-dashed p-8 text-center">
          <CardContent>
            <h3 className="text-lg font-medium">No rankings found for {year}</h3>
            <p className="mt-2 text-gray-500">Get started by adding your first prospect ranking for this class.</p>
            <Button className="mt-4" asChild>
              <Link href={`/admin/rankings/add?year=${year}`}>Add First Ranking</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {rankings.map((ranking) => (
            <Card key={ranking.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center">
                  {/* Rank */}
                  <div className="mr-4 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-blue-700">
                    {ranking.overall_rank}
                  </div>

                  {/* Photo */}
                  <div className="relative mr-4 h-14 w-14 flex-shrink-0 overflow-hidden rounded-full border">
                    <Image
                      src={ranking.photo_url || "/wrestler-silhouette.png"}
                      alt={ranking.athlete_name || "Wrestler"}
                      fill
                      className="object-cover"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1">
                    <div className="flex items-center">
                      <h3 className="font-semibold">{ranking.athlete_name}</h3>
                      {ranking.verified && <CheckCircle className="ml-1 h-4 w-4 text-blue-500" />}
                    </div>
                    <div className="text-sm text-gray-500">{ranking.high_school}</div>

                    <div className="mt-1 flex flex-wrap gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {ranking.weight_class} lbs
                      </Badge>
                      {ranking.folkstyle_rank && (
                        <Badge variant="outline" className="text-xs">
                          Folkstyle: #{ranking.folkstyle_rank}
                        </Badge>
                      )}
                      {ranking.freestyle_rank && (
                        <Badge variant="outline" className="text-xs">
                          Freestyle: #{ranking.freestyle_rank}
                        </Badge>
                      )}
                      {ranking.greco_rank && (
                        <Badge variant="outline" className="text-xs">
                          Greco: #{ranking.greco_rank}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="text-red-500 hover:bg-red-50 hover:text-red-600 bg-transparent"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  )
}
