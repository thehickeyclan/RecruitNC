export class ClientMediaService {
  async uploadMedia(
    file: File,
    options: {
      category?: string
      entityType?: string
      entityName?: string
      alt?: string
      caption?: string
      tags?: string[]
    } = {},
  ) {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("category", options.category || "general")
    formData.append("entityType", options.entityType || "")
    formData.append("entityName", options.entityName || "")
    formData.append("alt", options.alt || "")
    formData.append("caption", options.caption || "")
    formData.append("tags", options.tags?.join(",") || "")

    const response = await fetch("/api/media-manager/upload", {
      method: "POST",
      body: formData,
    })

    const result = await response.json()

    if (!result.success) {
      throw new Error(result.error || "Upload failed")
    }

    return result
  }

  async deleteMedia(id: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/media-manager/delete/${id}`, {
        method: "DELETE",
      })

      const result = await response.json()
      return result.success
    } catch (error) {
      console.error("Delete failed:", error)
      return false
    }
  }

  async setupDatabase() {
    try {
      const response = await fetch("/api/media-manager/setup-database", {
        method: "POST",
      })

      const result = await response.json()
      return result
    } catch (error) {
      console.error("Setup failed:", error)
      return { success: false, error: "Setup failed" }
    }
  }

  async updateMediaName(id: string, name: string) {
    try {
      const response = await fetch("/api/media-manager/update-name", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, name }),
      })

      const result = await response.json()
      return result
    } catch (error) {
      console.error("Update name failed:", error)
      return { success: false, error: "Update failed" }
    }
  }

  async getMediaItems(
    filters: {
      category?: string
      entityType?: string
      entityName?: string
      limit?: number
      offset?: number
    } = {},
  ) {
    try {
      const params = new URLSearchParams()

      if (filters.category) params.append("category", filters.category)
      if (filters.entityType) params.append("entityType", filters.entityType)
      if (filters.entityName) params.append("entityName", filters.entityName)
      if (filters.limit) params.append("limit", filters.limit.toString())
      if (filters.offset) params.append("offset", filters.offset.toString())

      const response = await fetch(`/api/media-manager/items?${params}`)
      const result = await response.json()
      return result
    } catch (error) {
      console.error("Get items failed:", error)
      return { success: false, error: "Failed to get items", data: [] }
    }
  }

  async searchMedia(category?: string, search?: string) {
    try {
      const params = new URLSearchParams()
      if (category && category !== "all") params.append("category", category)
      if (search) params.append("search", search)

      const response = await fetch(`/api/media-manager/search?${params}`)
      const result = await response.json()
      return result
    } catch (error) {
      console.error("Search failed:", error)
      return { success: false, error: "Search failed", data: [] }
    }
  }
}

export const clientMediaService = new ClientMediaService()
