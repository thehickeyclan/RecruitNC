/**
 * NC United Storage Helper
 * Provides utilities for working with Vercel Blob Storage URLs for NC United images
 *
 * Images are stored in Vercel Blob Storage and URLs are stored in the database.
 * This helper ensures URLs are properly formatted and handles backward compatibility.
 */

/**
 * Get the public URL for an image
 * @param imagePath - Can be:
 *   - Full URL (e.g., "https://...") - returns as-is
 *   - Local public folder path (e.g., "/images/ucd-2025-blayden-thompson.png") - returns as-is
 *   - Relative path - returns as-is
 * @returns Public URL or path to the image
 *
 * Note: Images are stored in /public/images/ folder and referenced by path.
 * Next.js automatically serves files from /public/ at the root URL.
 */
export function getStorageImageUrl(imagePath: string): string {
  if (!imagePath) return ""

  // If it's already a full URL, return it as-is
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    return imagePath
  }

  // If it's a public folder path (starts with /images/), return it as-is
  // Next.js will serve it from the public folder
  if (imagePath.startsWith("/images/")) {
    return imagePath
  }

  // For any other path, return as-is (might be relative or already correct)
  return imagePath
}

/**
 * Note: Image uploads are handled through Vercel Blob Storage via the V0 project.
 * This helper is primarily for URL formatting and validation.
 *
 * To upload new images:
 * 1. Upload through V0 project (which automatically stores in Vercel Blob)
 * 2. Copy the Vercel Blob URL
 * 3. Store the full URL in the database image_path field
 */
