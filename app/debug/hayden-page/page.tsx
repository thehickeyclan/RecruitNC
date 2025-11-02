import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"

export default async function HaydenDebugPage() {
  // Fetch Hayden directly from the database
  const { data: hayden, error } = await supabase.from("athletes").select("*").eq("name", "Hayden Haynes").single()

  if (error) {
    return (
      <div className="container py-8">
        <h1 className="text-2xl font-bold mb-4">Error Loading Hayden</h1>
        <pre className="bg-red-50 p-4 rounded">{JSON.stringify(error, null, 2)}</pre>
      </div>
    )
  }

  if (!hayden) {
    return (
      <div className="container py-8">
        <h1 className="text-2xl font-bold mb-4">Hayden Not Found</h1>
      </div>
    )
  }

  // Format date
  const formattedDate = new Date(hayden.commitmentdate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  // Determine if the image URL is external
  const isExternalImage = hayden.photourl?.startsWith("http") || hayden.photourl?.startsWith("https")
  const photoUrl = hayden.photourl || "/wrestler-profile.png"

  return (
    <div className="container max-w-4xl py-8">
      <h1 className="text-3xl font-bold mb-6">Hayden Debug Page</h1>

      <div className="mb-6 p-4 bg-gray-100 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Debug Info:</h2>
        <p>
          <strong>Photo URL:</strong> {photoUrl}
        </p>
        <p>
          <strong>Is External:</strong> {isExternalImage ? "Yes" : "No"}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <h2 className="text-xl font-semibold mb-4">Image with Next.js Image:</h2>
          <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg bg-muted mb-6">
            <Image
              src={photoUrl || "/placeholder.svg"}
              alt={hayden.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 33vw"
              priority
            />
          </div>

          <h2 className="text-xl font-semibold mb-4">Image with regular img tag:</h2>
          <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg bg-muted">
            <img src={photoUrl || "/placeholder.svg"} alt={hayden.name} className="w-full h-full object-cover" />
          </div>
        </div>

        <div className="md:col-span-2 space-y-6">
          <div>
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold">{hayden.name}</h1>
              <Badge className="text-sm">{hayden.weightclass}</Badge>
            </div>
            <p className="text-lg text-muted-foreground mt-1">{hayden.highschool}</p>
          </div>

          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4">Commitment Details</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">College</p>
                  <p className="font-medium">{hayden.college}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Division</p>
                  <p className="font-medium">{hayden.division}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Graduation Year</p>
                  <p className="font-medium">{hayden.graduationyear}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Commitment Date</p>
                  <p className="font-medium">{formattedDate}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {hayden.achievements && hayden.achievements.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-3">Achievements</h2>
              <ul className="space-y-2">
                {hayden.achievements.map((achievement: string, index: number) => (
                  <li key={index} className="flex items-center">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary mr-2"></span>
                    <span>{achievement}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {hayden.bio && (
            <div>
              <h2 className="text-xl font-semibold mb-3">Bio</h2>
              <p className="text-muted-foreground">{hayden.bio}</p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 p-4 bg-gray-100 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Raw Database Data:</h2>
        <pre className="text-xs overflow-auto">{JSON.stringify(hayden, null, 2)}</pre>
      </div>
    </div>
  )
}
