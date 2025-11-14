export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-primary-foreground/20 rounded w-32 mb-6"></div>
            <div className="flex flex-col md:flex-row items-start gap-8">
              <div className="w-32 h-32 bg-primary-foreground/20 rounded-lg"></div>
              <div className="flex-1 space-y-4">
                <div className="h-10 bg-primary-foreground/20 rounded w-64"></div>
                <div className="flex gap-2">
                  <div className="h-6 bg-primary-foreground/20 rounded w-24"></div>
                  <div className="h-6 bg-primary-foreground/20 rounded w-20"></div>
                  <div className="h-6 bg-primary-foreground/20 rounded w-16"></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-5 bg-primary-foreground/20 rounded"></div>
                  <div className="h-5 bg-primary-foreground/20 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="animate-pulse space-y-4">
              <div className="h-32 bg-muted rounded"></div>
              <div className="h-48 bg-muted rounded"></div>
            </div>
          </div>
          <div className="space-y-6">
            <div className="animate-pulse space-y-4">
              <div className="h-24 bg-muted rounded"></div>
              <div className="h-32 bg-muted rounded"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
