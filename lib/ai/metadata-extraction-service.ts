interface ImageMetadata {
  filename: string
  size: number
  dimensions?: { width: number; height: number }
  format: string
  colorProfile?: string
  hasTransparency: boolean
  suggestedName: string
  category: "logo" | "photo" | "graphic" | "unknown"
  confidence: number
}

export class MetadataExtractionService {
  static async extractMetadata(file: File): Promise<ImageMetadata> {
    const startTime = Date.now()

    try {
      // Basic file info
      const metadata: ImageMetadata = {
        filename: file.name,
        size: file.size,
        format: file.type.split("/")[1] || "unknown",
        hasTransparency: file.type === "image/png",
        suggestedName: this.generateSuggestedName(file.name),
        category: this.categorizeImage(file.name, file.size),
        confidence: 0,
      }

      // Try to get image dimensions
      try {
        const dimensions = await this.getImageDimensions(file)
        metadata.dimensions = dimensions

        // Adjust category based on dimensions
        if (dimensions.width === dimensions.height && dimensions.width <= 512) {
          metadata.category = "logo"
          metadata.confidence = 85
        } else if (dimensions.width > 1000 || dimensions.height > 1000) {
          metadata.category = "photo"
          metadata.confidence = 80
        }
      } catch (error) {
        console.warn("Could not extract image dimensions:", error)
      }

      return metadata
    } catch (error) {
      throw new Error(`Failed to extract metadata: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  private static async getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const url = URL.createObjectURL(file)

      img.onload = () => {
        URL.revokeObjectURL(url)
        resolve({ width: img.naturalWidth, height: img.naturalHeight })
      }

      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error("Failed to load image"))
      }

      img.src = url
    })
  }

  private static categorizeImage(filename: string, size: number): "logo" | "photo" | "graphic" | "unknown" {
    const name = filename.toLowerCase()

    if (name.includes("logo") || name.includes("seal") || name.includes("crest")) {
      return "logo"
    }

    if (name.includes("photo") || name.includes("headshot") || name.includes("portrait")) {
      return "photo"
    }

    if (size < 100000) {
      // Less than 100KB, likely a logo
      return "logo"
    }

    if (size > 1000000) {
      // More than 1MB, likely a photo
      return "photo"
    }

    return "unknown"
  }

  private static generateSuggestedName(filename: string): string {
    // Remove extension
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, "")

    // Convert to kebab-case
    const kebabCase = nameWithoutExt
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")

    return kebabCase
  }
}
