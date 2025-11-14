import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  // Create mock data
  const mockAthletes = [
    {
      id: "1",
      name: "John Doe",
      graduationyear: 2025,
      highschool: "Central High School",
      college: "State University",
      division: "NCAA D1",
      commitmentdate: "2023-05-15",
      achievements: ["State Champion", "All-American"],
      imageurl: "/wrestler-silhouette.png",
    },
    {
      id: "2",
      name: "Jane Smith",
      graduationyear: 2026,
      highschool: "Western High School",
      college: "Tech University",
      division: "NCAA D2",
      commitmentdate: "2023-06-20",
      achievements: ["Regional Champion"],
      imageurl: "/wrestler-silhouette.png",
    },
    {
      id: "3",
      name: "Mike Johnson",
      graduationyear: 2025,
      highschool: "Northern High School",
      college: "Community College",
      division: "NJCAA",
      commitmentdate: "2023-04-10",
      achievements: ["Conference Champion"],
      imageurl: "/wrestler-silhouette.png",
    },
    {
      id: "4",
      name: "Sarah Williams",
      graduationyear: 2026,
      highschool: "Eastern High School",
      college: "Private University",
      division: "NCAA D3",
      commitmentdate: "2023-07-05",
      achievements: ["State Runner-up"],
      imageurl: "/wrestler-silhouette.png",
    },
    {
      id: "5",
      name: "David Brown",
      graduationyear: 2025,
      highschool: "Southern High School",
      college: "Liberal Arts College",
      division: "NCAA D3",
      commitmentdate: "2023-05-25",
      achievements: ["Regional Finalist"],
      imageurl: "/wrestler-silhouette.png",
    },
    {
      id: "6",
      name: "Emily Davis",
      graduationyear: 2026,
      highschool: "Metro High School",
      college: "State College",
      division: "NCAA D1",
      commitmentdate: "2023-06-15",
      achievements: ["National Qualifier"],
      imageurl: "/wrestler-silhouette.png",
    },
  ]

  // Add a small delay to simulate network latency
  await new Promise((resolve) => setTimeout(resolve, 500))

  return NextResponse.json(mockAthletes)
}
