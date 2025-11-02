export interface MediaItem {
  id: string
  url: string
  filename: string
  originalName: string
  mimeType: string
  size: number
  category: MediaCategory
  entityId?: string
  entityType?: EntityType
  tags: string[]
  alt?: string
  caption?: string
  metadata: MediaMetadata
  createdAt: string
  updatedAt: string
}

export interface MediaMetadata {
  width?: number
  height?: number
  aspectRatio?: number
  dominantColor?: string
  isOptimized?: boolean
  thumbnailUrl?: string
  blurDataUrl?: string
}

export type MediaCategory =
  | "athlete-profile"
  | "athlete-commitment"
  | "athlete-headshot"
  | "athlete-action"
  | "college-logo"
  | "highschool-logo"
  | "club-logo"
  | "banner"
  | "announcement"
  | "general"

export type EntityType = "athlete" | "college" | "highschool" | "club"

export interface MediaUploadOptions {
  category: MediaCategory
  entityId?: string
  entityType?: EntityType
  tags?: string[]
  alt?: string
  caption?: string
  generateThumbnail?: boolean
  generateBlurData?: boolean
  optimizeImage?: boolean
}

export interface MediaSearchFilters {
  category?: MediaCategory
  entityType?: EntityType
  entityId?: string
  tags?: string[]
  mimeType?: string
  dateRange?: {
    start: Date
    end: Date
  }
  sizeRange?: {
    min: number
    max: number
  }
}

export interface MediaManagerConfig {
  useNewSystem: boolean
  fallbackToOld: boolean
  enableMigration: boolean
  enableBulkOperations: boolean
  enableAdvancedSearch: boolean
  maxFileSize: number
  allowedMimeTypes: string[]
  generateThumbnails: boolean
  optimizeImages: boolean
}
