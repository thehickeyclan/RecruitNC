import { HardLink } from "@/components/hard-link"

export default function AdminScholarshipNewPage() {
  return (
    <div className="max-w-2xl text-gray-900">
      <h1 className="text-2xl font-bold">New scholarship</h1>
      <p className="mt-3 text-sm text-gray-600">
        Creation UI ships next — for now insert or duplicate rows in Supabase after{" "}
        <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">scripts/supabase-scholarships-portal.sql</code>. Keep{" "}
        <strong>slug</strong> URL-safe (lowercase, hyphens).
      </p>
      <HardLink href="/admin/scholarships" className="mt-8 inline-block text-sm font-semibold text-blue-700 underline">
        ← Scholarships admin
      </HardLink>
    </div>
  )
}
