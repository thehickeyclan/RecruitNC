import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy, Users, Search, Heart } from "lucide-react"

export function AthletesFeaturesGuide() {
  return (
    <div className="mb-8">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Discover North Carolina Wrestling Talent</h2>
        <p className="text-gray-600">Explore profiles, achievements, and commitments from across the state</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="text-center">
          <CardHeader className="pb-2">
            <Trophy className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
            <CardTitle className="text-lg">Achievements</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>View state championships, tournament wins, and career highlights</CardDescription>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardHeader className="pb-2">
            <Users className="h-8 w-8 text-blue-500 mx-auto mb-2" />
            <CardTitle className="text-lg">College Commits</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>Track commitments to NCAA D1, D2, D3, NAIA, and NJCAA programs</CardDescription>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardHeader className="pb-2">
            <Search className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <CardTitle className="text-lg">Advanced Search</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>Filter by graduation year, division, weight class, and more</CardDescription>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardHeader className="pb-2">
            <Heart className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <CardTitle className="text-lg">Follow Athletes</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>Like profiles and stay updated on your favorite wrestlers</CardDescription>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
