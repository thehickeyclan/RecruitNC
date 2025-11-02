import Image from "next/image"

export default function ImageTestPage() {
  // List of images to test
  const imagesToTest = [
    { path: "/wrestler-Colt-Campbell.png", name: "Colt Campbell" },
    { path: "/wrestler-lorenzo-alston.png", name: "Lorenzo Alston" },
    { path: "/wrestler-liam-hickey.png", name: "Liam Hickey" },
    { path: "/wrestler-silhouette.png", name: "Wrestler Silhouette" },
    { path: "/diverse-wrestlers.png", name: "Diverse Wrestlers" },
    { path: "/wrestler-profile.png", name: "Wrestler Profile" },
  ]

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Image Test Page</h1>
      <p className="mb-4 text-gray-600">This page tests if the images in the public folder can be loaded correctly.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {imagesToTest.map((image, index) => (
          <div key={index} className="border rounded-lg overflow-hidden">
            <div className="bg-gray-100 p-2 border-b">
              <h2 className="font-semibold">{image.name}</h2>
              <p className="text-sm text-gray-500">{image.path}</p>
            </div>
            <div className="relative h-[300px]">
              <Image
                src={image.path || "/placeholder.svg"}
                alt={image.name}
                fill
                className="object-contain"
                // Removed onError and onLoad handlers that were causing the build error
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
