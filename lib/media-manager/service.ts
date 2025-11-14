import { createClient } from "@/lib/supabase/server"
import { put, del } from "@vercel/blob"
import { nanoid } from "nanoid"
import type { MediaItem, MediaUploadOptions, MediaSearchFilters, MediaMetadata } from "./types"
import { getMediaManagerConfig } from "./config"

export class MediaManagerService {
  private async getSupabase() {
    return createClient()
  }

  private config = getMediaManagerConfig()

  async uploadMedia(file: File | Blob, options: MediaUploadOptions): Promise<MediaItem> {
    try {
      // Generate unique filename
      const uniqueId = nanoid(12)
      const timestamp = Date.now()
      const extension = this.getFileExtension(file)
      const filename = `media/${options.category}/${uniqueId}-${timestamp}.${extension}`

      // Upload to Vercel Blob
      const blob = await put(filename, file, {
        access: "public",
      })

      // Generate metadata
      const metadata = await this.generateMetadata(file, blob.url)

      // Create media item record
      const insertData = {
        url: blob.url,
        filename,
        original_name: file instanceof File ? file.name : `upload-${timestamp}`,
        mime_type: file.type,
        size_bytes: file.size,
        category: options.category,
        entity_id: options.entityId || null,
        entity_type: options.entityType || null,
        tags: options.tags || [],
        alt_text: options.alt || null,
        caption: options.caption || null,
        metadata: metadata || {},
        is_active: true,
      }

      console.log("Inserting media item:", insertData)

      // Save to database
      const supabase = await this.getSupabase()
      const { data, error } = await supabase.from("media_items").insert(insertData).select().single()

      if (error) {
        console.error("Database insert error:", error)
        // Clean up blob if database insert fails
        await del(blob.url).catch(console.error)
        throw new Error(`Failed to save media item: ${error.message || JSON.stringify(error)}`)
      }

      if (!data) {
        throw new Error("No data returned from database insert")
      }

      return this.mapDatabaseToMediaItem(data)
    } catch (error) {
      console.error("Error uploading media:", error)
      throw error
    }
  }

  async getMediaItem(id: string): Promise<MediaItem | null> {
    try {
      const supabase = await this.getSupabase()
      const { data, error } = await supabase.from("media_items").select("*").eq("id", id).eq("is_active", true).single()

      if (error) {
        console.error("Error getting media item:", error)
        return null
      }

      return data ? this.mapDatabaseToMediaItem(data) : null
    } catch (error) {
      console.error("Error in getMediaItem:", error)
      return null
    }
  }

  async searchMedia(filters: MediaSearchFilters): Promise<MediaItem[]> {
    try {
      const supabase = await this.getSupabase()
      let query = supabase.from("media_items").select("*").eq("is_active", true)

      if (filters.category) {
        query = query.eq("category", filters.category)
      }

      if (filters.entityType) {
        query = query.eq("entity_type", filters.entityType)
      }

      if (filters.entityId) {
        query = query.eq("entity_id", filters.entityId)
      }

      if (filters.tags && filters.tags.length > 0) {
        query = query.overlaps("tags", filters.tags)
      }

      if (filters.mimeType) {
        query = query.eq("mime_type", filters.mimeType)
      }

      if (filters.dateRange) {
        query = query
          .gte("created_at", filters.dateRange.start.toISOString())
          .lte("created_at", filters.dateRange.end.toISOString())
      }

      const { data, error } = await query.order("created_at", { ascending: false }).limit(50)

      if (error) {
        console.error("Search error:", error)
        return []
      }

      return data ? data.map(this.mapDatabaseToMediaItem) : []
    } catch (error) {
      console.error("Error in searchMedia:", error)
      return []
    }
  }

  async deleteMedia(id: string): Promise<boolean> {
    try {
      // Get media item first
      const mediaItem = await this.getMediaItem(id)
      if (!mediaItem) {
        return false
      }

      // Soft delete in database
      const supabase = await this.getSupabase()
      const { error } = await supabase.from("media_items").update({ is_active: false }).eq("id", id)

      if (error) {
        console.error("Error deleting media:", error)
        return false
      }

      return true
    } catch (error) {
      console.error("Error in deleteMedia:", error)
      return false
    }
  }

  async updateMedia(id: string, updates: Partial<MediaItem>): Promise<MediaItem | null> {
    try {
      const updateData: any = {}

      if (updates.alt !== undefined) updateData.alt_text = updates.alt
      if (updates.caption !== undefined) updateData.caption = updates.caption
      if (updates.tags !== undefined) updateData.tags = updates.tags
      if (updates.metadata !== undefined) updateData.metadata = updates.metadata

      const supabase = await this.getSupabase()
      const { data, error } = await supabase.from("media_items").update(updateData).eq("id", id).select().single()

      if (error) {
        console.error("Error updating media:", error)
        return null
      }

      return data ? this.mapDatabaseToMediaItem(data) : null
    } catch (error) {
      console.error("Error in updateMedia:", error)
      return null
    }
  }

  private async generateMetadata(file: File | Blob, url: string): Promise<MediaMetadata> {
    const metadata: MediaMetadata = {}

    // For images, try to get dimensions
    if (file.type.startsWith("image/")) {
      try {
        // Skip dimension detection for now to avoid CORS issues
        // const dimensions = await this.getImageDimensions(url)
        // metadata.width = dimensions.width
        // metadata.height = dimensions.height
        // metadata.aspectRatio = dimensions.width / dimensions.height
      } catch (error) {
        console.warn("Failed to get image dimensions:", error)
      }
    }

    return metadata
  }

  private getFileExtension(file: File | Blob): string {
    if (file instanceof File && file.name) {
      const parts = file.name.split(".")
      return parts.length > 1 ? parts[parts.length - 1] : "jpg"
    }

    // Fallback based on mime type
    const mimeToExt: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/jpg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
    }

    return mimeToExt[file.type] || "jpg"
  }

  private mapDatabaseToMediaItem(data: any): MediaItem {
    return {
      id: data.id,
      url: data.url,
      filename: data.filename,
      originalName: data.original_name,
      mimeType: data.mime_type,
      size: data.size_bytes,
      category: data.category,
      entityId: data.entity_id,
      entityType: data.entity_type,
      tags: data.tags || [],
      alt: data.alt_text,
      caption: data.caption,
      metadata: data.metadata || {},
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }
  }
}

// Singleton instance
export const mediaManager = new MediaManagerService()
