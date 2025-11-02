import type { MediaManagerConfig } from "./types"

// Feature flags for gradual rollout
export const MEDIA_MANAGER_CONFIG: MediaManagerConfig = {
  useNewSystem: false, // Start with false, gradually enable
  fallbackToOld: true, // Always fallback to old system if new fails
  enableMigration: true, // Allow migration tools
  enableBulkOperations: false, // Enable later
  enableAdvancedSearch: false, // Enable later
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"],
  generateThumbnails: true,
  optimizeImages: true,
}

// Environment-based overrides
export function getMediaManagerConfig(): MediaManagerConfig {
  const config = { ...MEDIA_MANAGER_CONFIG }

  // Override based on environment variables
  if (process.env.NEXT_PUBLIC_USE_NEW_MEDIA_MANAGER === "true") {
    config.useNewSystem = true
  }

  if (process.env.NEXT_PUBLIC_ENABLE_BULK_OPERATIONS === "true") {
    config.enableBulkOperations = true
  }

  if (process.env.NEXT_PUBLIC_ENABLE_ADVANCED_SEARCH === "true") {
    config.enableAdvancedSearch = true
  }

  return config
}

// Feature flag helpers
export function shouldUseNewMediaManager(): boolean {
  return getMediaManagerConfig().useNewSystem
}

export function shouldFallbackToOld(): boolean {
  return getMediaManagerConfig().fallbackToOld
}
