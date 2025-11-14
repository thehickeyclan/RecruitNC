interface PlaceholderConfig {
  key: string
  defaultPath: string
  description: string
  category: "logo" | "athlete" | "general"
}

const PLACEHOLDER_CONFIGS: PlaceholderConfig[] = [
  // Logo placeholders
  {
    key: "generic-highschool",
    defaultPath: "/high-school-logo.png",
    description: "Generic high school logo",
    category: "logo",
  },
  {
    key: "generic-college",
    defaultPath: "/generic-college-logo.png",
    description: "Generic college logo",
    category: "logo",
  },
  {
    key: "generic-club",
    defaultPath: "/wrestling-club-logo.png",
    description: "Generic wrestling club logo",
    category: "logo",
  },
  // Athlete placeholders
  {
    key: "male-wrestler",
    defaultPath: "/wrestler-silhouette.png",
    description: "Male wrestler silhouette",
    category: "athlete",
  },
  {
    key: "female-wrestler",
    defaultPath: "/diverse-wrestlers.png",
    description: "Female wrestler placeholder",
    category: "athlete",
  },
  {
    key: "diverse-athletes",
    defaultPath: "/diverse-group-athletes.png",
    description: "Diverse group of athletes",
    category: "athlete",
  },
]

// Cache for media manager URLs
const placeholderCache = new Map<string, string>()

export async function getPlaceholderUrl(key: string): Promise<string> {
  // Check cache first
  if (placeholderCache.has(key)) {
    return placeholderCache.get(key)!
  }

  // Find the config
  const config = PLACEHOLDER_CONFIGS.find((c) => c.key === key)
  if (!config) {
    console.warn(`Unknown placeholder key: ${key}`)
    return "/placeholder.svg"
  }

  try {
    // Try to get from media manager
    const response = await fetch(`/api/placeholder/${key}`)
    if (response.ok) {
      const data = await response.json()
      if (data.success && data.url) {
        placeholderCache.set(key, data.url)
        return data.url
      }
    }
  } catch (error) {
    console.warn(`Failed to fetch placeholder for ${key}:`, error)
  }

  // Fall back to hardcoded default
  placeholderCache.set(key, config.defaultPath)
  return config.defaultPath
}

export function getPlaceholderConfigs() {
  return PLACEHOLDER_CONFIGS
}
