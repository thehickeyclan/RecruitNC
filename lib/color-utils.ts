/**
 * Maps color names to hex values for product variants
 */
export function getColorHex(colorName: string): string {
  const colorMap: Record<string, string> = {
    // Blues
    Navy: "#001f3f",
    "Navy Blue": "#002147",
    Blue: "#0074D9",
    "Light Blue": "#7FDBFF",
    "Royal Blue": "#4169E1",
    "Sky Blue": "#87CEEB",

    // Reds
    Red: "#FF4136",
    "Dark Red": "#B31B1B",
    Crimson: "#DC143C",
    Maroon: "#800000",

    // Whites & Grays
    White: "#FFFFFF",
    "Off White": "#F8F8F8",
    Gray: "#AAAAAA",
    Grey: "#AAAAAA",
    "Light Gray": "#D3D3D3",
    "Dark Gray": "#696969",
    Charcoal: "#36454F",

    // Blacks
    Black: "#111111",

    // Greens
    Green: "#2ECC40",
    "Dark Green": "#006400",
    "Forest Green": "#228B22",
    Olive: "#808000",

    // Yellows & Golds
    Yellow: "#FFDC00",
    Gold: "#FFD700",
    Tan: "#D2B48C",

    // Oranges
    Orange: "#FF851B",
    "Burnt Orange": "#CC5500",

    // Purples
    Purple: "#B10DC9",
    Violet: "#8B00FF",

    // Pinks
    Pink: "#FF69B4",
    "Hot Pink": "#FF1493",

    // Browns
    Brown: "#8B4513",
  }

  if (!colorName || typeof colorName !== "string") {
    return "#AAAAAA"
  }

  const normalized = colorName.trim().toLowerCase()

  for (const [key, value] of Object.entries(colorMap)) {
    if (key.toLowerCase() === normalized) {
      return value
    }
  }

  for (const [key, value] of Object.entries(colorMap)) {
    if (
      normalized.includes(key.toLowerCase()) ||
      key.toLowerCase().includes(normalized)
    ) {
      return value
    }
  }

  let hash = 0
  for (let i = 0; i < colorName.length; i++) {
    hash = colorName.charCodeAt(i) + ((hash << 5) - hash)
  }

  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 60%, 50%)`
}
