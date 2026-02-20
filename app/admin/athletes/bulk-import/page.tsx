import { redirect } from "next/navigation"

/**
 * Bulk import lives at /admin/test-bulk-import (POST /api/athletes/bulk-import).
 * Redirect so the admin athletes "Bulk Import" link doesn't 404.
 */
export default function BulkImportPage() {
  redirect("/admin/test-bulk-import")
}
