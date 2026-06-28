import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Format a date object into a user-friendly string
 * @param date The date object to format
 * @returns A formatted date string
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Wrapper class for wide tables on mobile (touch horizontal scroll). */
export const scrollTableXClass =
  "scroll-table-x relative w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain"
