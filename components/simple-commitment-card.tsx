import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Athlete } from "@/types/athlete"
import { SimpleEntityLogo } from "@/components/simple-entity-logo"
import { formatDate } from "@/lib/utils"

interface SimpleCommitmentCardProps {
  athlete: Athlete
}

export function SimpleCommitmentCard({ athlete }: SimpleCommitmentCardProps) {
  // Format the commitment date
  const formattedDate = athlete.commitmentdate ? formatDate(new Date(athlete.commitmentdate)) : "Unknown"

  return (
    <Card className="overflow-hidden border border-gray-200 transition-all hover:shadow-md">
      <CardContent className="p-0">
        <div className="flex flex-col">
          {/* Header with college logo */}
          <div className="flex items-center justify-between bg-gray-50 p-4">
            <div className="flex items-center gap-3">
              <SimpleEntityLogo
                entityType="college"
                entityName={athlete.college || "Unknown"}
                className="h-10 w-10 rounded-full border border-gray-200 bg-white object-contain p-1"
              />
              <div>
                <h3 className="font-semibold">{athlete.college || "Unknown College"}</h3>
                <Badge variant="outline" className="text-xs">
                  {athlete.division || "Unknown Division"}
                </Badge>
              </div>
            </div>
          </div>

          {/* Athlete info */}
          <div className="p-4">
            <h4 className="text-lg font-bold">{athlete.name}</h4>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-500">High School:</span>
                <p className="truncate font-medium">{athlete.highschool || "Unknown"}</p>
              </div>
              <div>
                <span className="text-gray-500">Class:</span>
                <p className="font-medium">{athlete.graduationyear || "Unknown"}</p>
              </div>
              <div>
                <span className="text-gray-500">Weight:</span>
                <p className="font-medium">{athlete.weightclass || "Unknown"}</p>
              </div>
              <div>
                <span className="text-gray-500">Committed:</span>
                <p className="font-medium">{formattedDate}</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
