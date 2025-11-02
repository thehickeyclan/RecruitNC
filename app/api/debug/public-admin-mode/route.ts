export async function GET() {
  const publicAdminMode = process.env.IS_PUBLIC_ADMIN_MODE === "1"
  return Response.json({
    publicAdminMode,
    note: publicAdminMode
      ? "Public Admin Mode is ENABLED. Admin endpoints may be open to all users."
      : "Public Admin Mode is DISABLED. Admin endpoints require proper auth.",
  })
}
