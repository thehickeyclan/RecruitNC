import { createClient } from "@/lib/supabase/server"
import fs from "fs"
import path from "path"

export const dynamic = "force-dynamic"

export default async function HaydenFileTestPage() {
  const supabase = createClient()

  // Fetch Hayden directly from the database
  const { data: hayden, error } = await supabase
    .from("athletes")
    .select("*")
    .eq("id", "dfd4f4e2-f104-47fa-9987-6b5baeb18d7c")
    .single()

  if (error) {
    return <div>Error: {error.message}</div>
  }

  if (!hayden) {
    return <div>Hayden not found</div>
  }

  // Create a new approach - save the data URL to a file and use that
  let imagePath = ""

  try {
    if (hayden.photourl && hayden.photourl.startsWith("data:")) {
      // Extract the base64 data
      const matches = hayden.photourl.match(/^data:([A-Za-z-+/]+);base64,(.+)$/)

      if (matches && matches.length === 3) {
        const type = matches[1]
        const data = matches[2]
        const buffer = Buffer.from(data, "base64")

        // Determine file extension
        let ext = "png"
        if (type.includes("jpeg") || type.includes("jpg")) {
          ext = "jpg"
        } else if (type.includes("gif")) {
          ext = "gif"
        }

        // Save to public directory
        const fileName = `hayden-test.${ext}`
        const publicPath = path.join(process.cwd(), "public", fileName)

        // Write the file
        fs.writeFileSync(publicPath, buffer)

        imagePath = `/${fileName}`
      }
    }
  } catch (err) {
    console.error("Error saving image:", err)
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Hayden File Test</h1>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Approach: Save to file and display</h2>

        {imagePath ? (
          <div>
            <img src={imagePath || "/placeholder.svg"} alt={hayden.name} className="w-64 h-64 object-cover rounded" />
            <p className="mt-2">Image saved to file and displayed from: {imagePath}</p>
          </div>
        ) : (
          <div>
            <p className="text-red-600">Could not save image to file</p>
            <img src="/person-contemplating-nature.png" alt="Placeholder" className="w-64 h-64 object-cover rounded mt-4" />
          </div>
        )}
      </div>

      <div className="mt-8 p-4 bg-gray-100 rounded">
        <h2 className="text-xl font-semibold mb-2">Data URL Info</h2>
        <p>
          <strong>Length:</strong> {hayden.photourl ? hayden.photourl.length : 0} characters
        </p>
        <p>
          <strong>Starts with:</strong> {hayden.photourl ? hayden.photourl.substring(0, 30) + "..." : "N/A"}
        </p>
      </div>
    </div>
  )
}
