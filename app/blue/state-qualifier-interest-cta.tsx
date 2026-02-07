"use client"

/**
 * CTA for state qualifiers to express interest in Blue.
 * TODO: Wire to State Qualifier Interest form/modal when integration is ready.
 */
export function StateQualifierInterestCTA() {
  const handleClick = () => {
    // TODO: Open interest form modal or navigate to form page
    // Placeholder: alert for now
    alert("State Qualifier Interest form coming soon. Check back after States.")
  }

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center justify-center rounded-md bg-[#001f3f] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#003366] focus-visible:outline focus-visible:ring-2 focus-visible:ring-[#001f3f] focus-visible:ring-offset-2"
    >
      State Qualifier? Express Interest →
    </button>
  )
}
