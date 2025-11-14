import { MediaManagerService } from "./service"
import { uploadImage as legacyUploadImage, deleteImage as legacyDeleteImage } from "@/lib/blob-storage"
import { shouldUseNewMediaManager, shouldFallbackToOld } from "./config"
import type { MediaUploadOptions, MediaItem } from "./types"

/**
 * Hybrid service that can use either the new media manager or fall back to the legacy system
 */
export class HybridMediaService {
  private newService = new MediaManagerService()

  async uploadImage(
    file: File | Blob,
    category: string,
    entityName?: string,
    options?: Partial<MediaUploadOptions>,
  ): Promise<string> {
    const useNew = shouldUseNewMediaManager()

    if (useNew) {
      try {
        const uploadOptions: MediaUploadOptions = {
          category: this.mapLegacyCategoryToNew(category),
          entityId: options?.entityId,
          entityType: options?.entityType,
          tags: options?.tags || [],
          alt: options?.alt,
          caption: options?.caption,
          ...options,
        }

        const mediaItem = await this.newService.uploadMedia(file, uploadOptions)
        return mediaItem.url
      } catch (error) {
        console.error("New media manager failed, falling back to legacy:", error)

        if (shouldFallbackToOld()) {
          return this.fallbackToLegacy(file, category, entityName)
        }

        throw error
      }
    }

    return this.fallbackToLegacy(file, category, entityName)
  }

  async deleteImage(url: string): Promise<void> {
    const useNew = shouldUseNewMediaManager()

    if (useNew) {
      try {
        // Try to find the media item by URL
        const mediaItems = await this.newService.searchMedia({
          // We'd need to add URL search to the service
        })

        const mediaItem = mediaItems.find((item) => item.url === url)
        if (mediaItem) {
          await this.newService.deleteMedia(mediaItem.id)
          return
        }
      } catch (error) {
        console.error("New media manager delete failed, falling back to legacy:", error)
      }
    }

    // Fallback to legacy
    await legacyDeleteImage(url)
  }

  async getMediaForEntity(entityType: string, entityId: string): Promise<MediaItem[]> {
    const useNew = shouldUseNewMediaManager()

    if (useNew) {
      try {
        return await this.newService.searchMedia({
          entityType: entityType as any,
          entityId,
        })
      } catch (error) {
        console.error("Failed to get media from new system:", error)
        return []
      }
    }

    return []
  }

  private async fallbackToLegacy(file: File | Blob, category: string, entityName?: string): Promise<string> {
    return await legacyUploadImage(file as File, category as any, entityName)
  }

  private mapLegacyCategoryToNew(category: string): any {
    const mapping: Record<string, any> = {
      athlete: "athlete-profile",
      college: "college-logo",
      highschool: "highschool-logo",
      club: "club-logo",
    }

    return mapping[category] || "general"
  }
}

// Export singleton
export const hybridMediaService = new HybridMediaService()
