import DuplicateCleanup from "@/components/duplicate-cleanup"

export default function CleanupDuplicatesPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">🗑️ Duplicate Logo Cleanup</h1>
        <p className="text-muted-foreground">
          Clean up duplicate uploads and get the correct URLs for your existing logos.
        </p>
      </div>
      <DuplicateCleanup />
    </div>
  )
}
