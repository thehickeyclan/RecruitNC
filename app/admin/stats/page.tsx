import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function AdminStatsPage() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="mb-6 text-3xl font-bold">Statistics Dashboard</h1>
      <Card>
        <CardHeader>
          <CardTitle>Portal Statistics</CardTitle>
          <CardDescription>View and analyze portal usage and data</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Statistics dashboard coming soon.</p>
        </CardContent>
      </Card>
    </div>
  )
}
