import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function DivisionToolsPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Division Management Tools</h1>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>View Divisions</CardTitle>
            <CardDescription>View all athletes and their current division values</CardDescription>
          </CardHeader>
          <CardContent>
            <p>
              This tool shows all athletes grouped by college, with their current division values. Use this to identify
              inconsistencies and athletes that need updates.
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <a href="/debug/view-divisions">View Divisions</a>
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Standardize Divisions</CardTitle>
            <CardDescription>Automatically standardize all division values</CardDescription>
          </CardHeader>
          <CardContent>
            <p>
              This tool automatically converts all division values to the standard format (D1, D2, D3, NAIA, NJCAA). Use
              this to fix inconsistent formatting across the database.
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <a href="/debug/standardize-divisions">Standardize Divisions</a>
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Update College Division</CardTitle>
            <CardDescription>Update all athletes at a specific college</CardDescription>
          </CardHeader>
          <CardContent>
            <p>
              This tool updates the division for all athletes at a specific college. Use this to quickly fix all
              athletes from the same college.
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <a href="/debug/update-college-division">Update College Division</a>
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Update Individual Athlete</CardTitle>
            <CardDescription>Update a single athlete's division</CardDescription>
          </CardHeader>
          <CardContent>
            <p>
              This tool updates the division for a single athlete by ID. Use this for individual athletes that need
              specific updates.
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <a href="/debug/update-division">Update Individual Athlete</a>
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Division Counts</CardTitle>
            <CardDescription>View current division counts and statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <p>
              This tool shows the current division counts and statistics. Use this to verify that your changes are
              reflected in the stats.
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <a href="/debug/division-counts">View Division Counts</a>
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Homepage</CardTitle>
            <CardDescription>View the public-facing stats</CardDescription>
          </CardHeader>
          <CardContent>
            <p>
              Go to the homepage to see the public-facing division stats. This shows what visitors to the site will see.
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full" variant="outline">
              <a href="/">Go to Homepage</a>
            </Button>
          </CardFooter>
        </Card>
      </div>

      <div className="mt-8 bg-blue-50 p-6 rounded-lg">
        <h2 className="text-xl font-bold mb-4">Recommended Workflow</h2>
        <ol className="list-decimal pl-5 space-y-3">
          <li>
            <strong>First, standardize all divisions</strong> - Use the Standardize Divisions tool to automatically
            convert all division values to the standard format (D1, D2, D3, NAIA, NJCAA).
          </li>
          <li>
            <strong>View the divisions</strong> - Check the View Divisions page to see if there are any remaining
            inconsistencies or missing values.
          </li>
          <li>
            <strong>Update college divisions</strong> - For any colleges with incorrect divisions, use the Update
            College Division tool to fix all athletes at that college at once.
          </li>
          <li>
            <strong>Fix individual athletes</strong> - For any remaining athletes with incorrect divisions, use the
            Update Individual Athlete tool to fix them one by one.
          </li>
          <li>
            <strong>Verify the counts</strong> - Check the Division Counts page to make sure the counts are correct, and
            then check the homepage to see the public-facing stats.
          </li>
        </ol>
      </div>
    </div>
  )
}
