/** Formats "HH:MM" or "HH:MM:SS" to 12-hour with AM/PM */
export function formatTime(time: string): string {
  if (!time) return ""
  try {
    const [hours, minutes] = time.split(":").map(Number)
    if (Number.isNaN(hours) || Number.isNaN(minutes)) {
      return time
    }
    const period = hours >= 12 ? "PM" : "AM"
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`
  } catch {
    return time
  }
}
