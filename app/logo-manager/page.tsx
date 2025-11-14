import LogoManager from "@/components/logo-manager"

export default function LogoManagerPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">🏛️ Logo Management</h1>
        <p className="text-muted-foreground">View and manage all uploaded logos. No more duplicate uploads!</p>
      </div>
      <LogoManager />
    </div>
  )
}
