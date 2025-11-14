import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function SimpleImageTest() {
  const supabase = createClient()

  // Fetch Hayden directly
  const { data: hayden } = await supabase
    .from("athletes")
    .select("id, name, photourl")
    .eq("id", "dfd4f4e2-f104-47fa-9987-6b5baeb18d7c")
    .single()

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Simple Image Test</h1>

      {hayden ? (
        <div>
          <p className="mb-4">Athlete: {hayden.name}</p>

          {hayden.photourl ? (
            <div className="mb-4">
              <p className="mb-2">Direct img tag:</p>
              <img
                src={hayden.photourl || "/placeholder.svg"}
                alt={hayden.name}
                className="w-64 h-64 object-cover border"
                onError={(e) => {
                  console.error("Image failed to load")
                  e.currentTarget.src = "/diverse-group.png"
                }}
              />
            </div>
          ) : (
            <p>No image available</p>
          )}
        </div>
      ) : (
        <p>Athlete not found</p>
      )}
    </div>
  )
}
