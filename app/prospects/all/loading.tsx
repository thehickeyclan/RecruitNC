export default function Loading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-nc-navy-950" />
          <p className="text-sm text-muted-foreground">Loading prospects...</p>
        </div>
      </div>
    </div>
  )
}
