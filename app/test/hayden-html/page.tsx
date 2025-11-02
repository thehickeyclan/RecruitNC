import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export default async function HaydenHtmlTestPage() {
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

  // Create a simple HTML page with just the image
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Hayden HTML Test</title>
      <style>
        body { font-family: system-ui, sans-serif; padding: 2rem; max-width: 800px; margin: 0 auto; }
        .image-container { margin: 2rem 0; }
        img { max-width: 300px; border: 1px solid #ccc; }
        pre { background: #f1f1f1; padding: 1rem; overflow: auto; font-size: 12px; }
      </style>
    </head>
    <body>
      <h1>Hayden HTML Test</h1>
      
      <div>
        <h2>Basic Information</h2>
        <p><strong>ID:</strong> ${hayden.id}</p>
        <p><strong>Name:</strong> ${hayden.name}</p>
      </div>
      
      <div class="image-container">
        <h2>Image Test</h2>
        <img src="${hayden.photourl}" alt="${hayden.name}" onerror="this.onerror=null; this.src='/system-error-screen.png'; console.error('Image load failed');" />
        <p><small>If no image appears above, there's an issue with the data URL</small></p>
      </div>
      
      <div>
        <h2>Data URL Preview (first 100 characters)</h2>
        <pre>${hayden.photourl ? hayden.photourl.substring(0, 100) + "..." : "No photo URL"}</pre>
      </div>
      
      <div>
        <h2>Full Data URL (for debugging)</h2>
        <details>
          <summary>Click to expand</summary>
          <pre>${hayden.photourl || "No photo URL"}</pre>
        </details>
      </div>
    </body>
    </html>
  `

  return <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
}
