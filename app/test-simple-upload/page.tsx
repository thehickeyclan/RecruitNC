import SimpleMediaUpload from "@/components/simple-media-upload"

export default function TestSimpleUploadPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Test Simple Upload</h1>
          <p className="text-gray-600 mt-2">Test the upload functionality in isolation</p>
        </div>

        <SimpleMediaUpload />

        <div className="text-center text-sm text-gray-500">
          <p>Open browser console (F12) to see detailed logs</p>
          <p>This page tests the upload functionality separately from the main media manager</p>
        </div>
      </div>
    </div>
  )
}
