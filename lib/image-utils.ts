import type { ImageCategory } from "./blob-storage"

/**
 * Generate a standardized filename for entity images
 * @param category The category (athlete, college, highschool, club)
 * @param entityName The name of the entity
 * @returns A standardized filename
 */
export function generateImageFilename(category: ImageCategory, entityName: string): string {
  // Sanitize the entity name for use in filenames
  const sanitizedName = entityName.toLowerCase().replace(/[^a-z0-9]/g, "-")
  return `${category}/${sanitizedName}`
}

/**
 * Extract entity name from an image URL
 * @param url The image URL
 * @returns The entity name or null if it can't be determined
 */
export function getEntityNameFromImageUrl(url: string): string | null {
  try {
    // Extract the filename from the URL
    const urlParts = url.split("/")
    const filename = urlParts[urlParts.length - 1]

    // Remove timestamp and extension
    const nameWithTimestamp = filename.split(".")[0]
    const name = nameWithTimestamp.split("-").slice(0, -1).join("-")

    return name || null
  } catch (error) {
    return null
  }
}

/**
 * Find the logo URL for a specific entity
 * @param entityName The name of the entity
 * @param images Array of image objects
 * @returns The URL of the matching logo or null if not found
 */
export function findLogoForEntity(entityName: string, images: { url: string; pathname: string }[]): string | null {
  if (!entityName || !images || images.length === 0) return null

  // Normalize the search name - remove all non-alphanumeric characters and convert to lowercase
  const normalizedSearchName = entityName.toLowerCase().replace(/[^a-z0-9]/g, "")

  // Special case for UNC Chapel Hill
  if (normalizedSearchName === "uncchapelhill" || normalizedSearchName.includes("unc")) {
    // Look specifically for UNC in the filename
    for (const image of images) {
      const filename = image.pathname.toLowerCase()
      if (filename.includes("unc") && filename.includes("chapel")) {
        return image.url
      }
    }
  }

  // First try an exact match on the pathname
  for (const image of images) {
    const pathname = image.pathname.toLowerCase()
    if (pathname.includes(normalizedSearchName)) {
      return image.url
    }
  }

  // Try matching on the filename
  for (const image of images) {
    const filename = image.pathname.split("/").pop() || ""
    const normalizedFilename = filename.toLowerCase().replace(/[^a-z0-9]/g, "")

    if (normalizedFilename.includes(normalizedSearchName) || normalizedSearchName.includes(normalizedFilename)) {
      return image.url
    }
  }

  // Try matching parts of the name
  const nameParts = normalizedSearchName.split(/[^a-z0-9]+/).filter((part) => part.length > 2)
  for (const part of nameParts) {
    for (const image of images) {
      const filename = image.pathname.split("/").pop() || ""
      const normalizedFilename = filename.toLowerCase().replace(/[^a-z0-9]/g, "")

      if (normalizedFilename.includes(part)) {
        return image.url
      }
    }
  }

  // Special case for common abbreviations
  const abbreviations: Record<string, string[]> = {
    unc: ["university of north carolina", "chapel hill", "tar heels"],
    ncsu: ["north carolina state", "nc state", "wolfpack"],
    app: ["appalachian state", "mountaineers"],
  }

  // Check if any known abbreviation matches
  for (const [abbr, fullNames] of Object.entries(abbreviations)) {
    if (normalizedSearchName.includes(abbr)) {
      // Look for matches with the full names
      for (const fullName of fullNames) {
        for (const image of images) {
          const filename = image.pathname.toLowerCase()
          if (filename.includes(fullName.replace(/\s/g, ""))) {
            return image.url
          }
        }
      }
    }

    // Also check the reverse - if searching for full name, check abbreviation
    if (fullNames.some((name) => normalizedSearchName.includes(name.replace(/\s/g, "")))) {
      for (const image of images) {
        const filename = image.pathname.toLowerCase()
        if (filename.includes(abbr)) {
          return image.url
        }
      }
    }
  }

  // No match found
  return null
}
