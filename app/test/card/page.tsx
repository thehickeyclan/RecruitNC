import { ProfessionalCommitmentCard } from "@/components/professional-commitment-card"

export default function TestCardPage() {
  // Sample athlete data
  const athlete = {
    id: "test-athlete",
    name: "John Wrestler",
    graduationyear: "2025",
    highschool: "Cary High School",
    club: "Cap City Wrestling",
    college: "NC State",
    division: "NCAA D1",
    weightclass: "165",
    achievements: ["State Champion", "Regional Champion", "Conference Champion", "All-American"],
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-8 text-center">Card Test Page</h1>
      <div className="max-w-md mx-auto">
        <ProfessionalCommitmentCard athlete={athlete} />
      </div>
    </div>
  )
}
