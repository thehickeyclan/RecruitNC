import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function AdminCollegesPage() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="mb-6 text-3xl font-bold">College Management</h1>
      <Card>
        <CardHeader>
          <CardTitle>Colleges</CardTitle>
          <CardDescription>Manage college information and logos</CardDescription>
        </CardHeader>
        <CardContent>
          <p>College management functionality coming soon.</p>
        </CardContent>
      </Card>
    </div>
  )
}
