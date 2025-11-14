import SupabaseTest from "./supabase-test"

export default function TestPage() {
  return (
    <div className="container py-10">
      <h1 className="text-2xl font-bold mb-6 text-center">Supabase Connection Test</h1>
      <SupabaseTest />
    </div>
  )
}
