import { Card, CardContent } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

export default function CardAnalyticsLoading() {
  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mr-3" />
          <span className="text-lg">Loading card analytics...</span>
        </CardContent>
      </Card>
    </div>
  )
}
