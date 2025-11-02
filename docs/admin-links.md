# Admin Links Cheat Sheet

Primary hub (manages both):
- /admin/edit-requests
  - Profile Review Center with two views:
    - Edit Requests (reviews pending/approved/rejected submissions)
    - Confirmations (shows “Looks Good” confirmations)
  - APIs used:
    - /api/admin/edit-requests
    - /api/admin/profile-confirmations

Confirmations-only dashboard:
- /admin/profile-confirmations
  - Focused view of confirmations with totals and last 7 days

User-facing entry points:
- /athletes/[id]
  - Contains the confirm profile button (neutral style)
- /athletes/[id]/edit-request
  - Public form to request changes (achievements, photo, school, etc.)

Setup (only if needed during initialization):
- /admin/setup-athlete-confirmations
  - Ensures policies/structures for confirmations are in place
