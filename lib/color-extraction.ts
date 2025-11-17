/**
 * Client-side color extraction from images using Canvas API
 */

export interface ColorPalette {
  primary: string
  secondary: string
}

/**
 * Extract dominant colors from an image URL
 * Uses Canvas API to analyze pixel data and find the most prominent colors
 */
export async function extractColorsFromImage(imageUrl: string): Promise<ColorPalette> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          reject(new Error("Could not get canvas context"))
          return
        }

        // Set canvas size (resize for performance if image is large)
        const maxSize = 200
        const scale = Math.min(maxSize / img.width, maxSize / img.height, 1)
        canvas.width = img.width * scale
        canvas.height = img.height * scale

        // Draw image to canvas
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const pixels = imageData.data

        // Extract colors and count frequencies
        const colorMap = new Map<string, number>()
        const colors: Array<{ r: number; g: number; b: number; count: number }> = []

        // Sample pixels (every 4th pixel for performance)
        for (let i = 0; i < pixels.length; i += 16) {
          const r = pixels[i]
          const g = pixels[i + 1]
          const b = pixels[i + 2]
          const a = pixels[i + 3]

          // Skip transparent pixels
          if (a < 128) continue

          // Skip very light/white pixels (likely background)
          if (r > 240 && g > 240 && b > 240) continue

          // Skip very dark/black pixels (likely text/outline)
          if (r < 20 && g < 20 && b < 20) continue

          const key = `${r},${g},${b}`
          const count = (colorMap.get(key) || 0) + 1
          colorMap.set(key, count)
        }

        // Convert to array and sort by frequency
        colorMap.forEach((count, key) => {
          const [r, g, b] = key.split(",").map(Number)
          colors.push({ r, g, b, count })
        })

        colors.sort((a, b) => b.count - a.count)

        // Get top 2 most frequent colors
        const primary = colors[0] || { r: 59, g: 130, b: 246 } // Default blue
        const secondary = colors[1] || colors[0] || { r: 0, g: 0, b: 0 } // Default black

        // Convert to hex
        const primaryHex = rgbToHex(primary.r, primary.g, primary.b)
        const secondaryHex = rgbToHex(secondary.r, secondary.g, secondary.b)

        resolve({
          primary: primaryHex,
          secondary: secondaryHex,
        })
      } catch (error) {
        reject(error)
      }
    }

    img.onerror = () => {
      reject(new Error("Failed to load image"))
    }

    img.src = imageUrl
  })
}

/**
 * Convert RGB values to hex color
 */
function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("")
}

/**
 * Validate hex color format
 */
export function isValidHexColor(color: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)
}

/**
 * Format hex color (ensure # prefix and uppercase)
 */
export function formatHexColor(color: string): string {
  if (!color) return ""
  const cleaned = color.replace("#", "").toUpperCase()
  if (cleaned.length === 3) {
    // Expand shorthand hex (e.g., #F00 -> #FF0000)
    return "#" + cleaned.split("").map((c) => c + c).join("")
  }
  return "#" + cleaned
}

