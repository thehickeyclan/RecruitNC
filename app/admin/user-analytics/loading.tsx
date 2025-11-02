import { Card, CardContent } from "@/components/ui/card"

export default function Loading() {
  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardContent className="p-8">
          <div className="text-center">Loading user analytics...</div>
        </CardContent>
      </Card>
    </div>
  )
}
