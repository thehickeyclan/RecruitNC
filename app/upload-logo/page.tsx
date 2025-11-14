import SimpleLogoUploader from "@/components/simple-logo-uploader"

export default function UploadLogoPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Simple Logo Upload</h1>
        <p className="text-muted-foreground">
          Upload your Appalachian State logo directly - no database setup required!
        </p>
      </div>
      <SimpleLogoUploader />
    </div>
  )
}
