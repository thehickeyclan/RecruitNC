export type ImageCategory = "athlete" | "highschool" | "college" | "club"

export interface BlobFile {
  url: string
  pathname: string
  size: number
  uploadedAt: Date
  downloadUrl?: string
}

export async function uploadImage(
  file: File,
  category: ImageCategory,
  name?: string,
  entityName?: string,
): Promise<string> {
  const formData = new FormData()
  formData.append("file", file)
  formData.append("category", category)

  if (name) {
    formData.append("name", name)
  }

  if (entityName) {
    formData.append("entityName", entityName)
  }

  const response = await fetch("/api/blob-upload", {
    method: "POST",
    body: formData,
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || "Upload failed")
  }

  const data = await response.json()
  return data.url
}

export async function deleteImage(url: string): Promise<void> {
  const response = await fetch("/api/blob/delete", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url }),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || "Delete failed")
  }
}

export async function listImages(category?: ImageCategory) {
  try {
    const url = category ? `/api/blob/list?prefix=${category}/` : "/api/blob/list"
    const response = await fetch(url)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Failed to list images")
    }

    return await response.json()
  } catch (error) {
    console.error("Error listing images from Blob storage:", error)
    throw new Error("Failed to list images")
  }
}

// Legacy functions for backward compatibility
export async function uploadToBlob(file: File, pathname?: string): Promise<BlobFile> {
  try {
    const filename = pathname || `${Date.now()}-${file.name}`
    const response = await fetch("/api/blob-upload", {
      method: "POST",
      body: (() => {
        const formData = new FormData()
        formData.append("file", file)
        formData.append("pathname", filename)
        return formData
      })(),
    })

    if (!response.ok) {
      throw new Error("Upload failed")
    }

    const data = await response.json()
    return {
      url: data.url,
      pathname: data.pathname || filename,
      size: file.size,
      uploadedAt: new Date(),
      downloadUrl: data.url,
    }
  } catch (error) {
    console.error("Error uploading to blob:", error)
    throw new Error("Failed to upload file")
  }
}

export async function deleteFromBlob(url: string): Promise<void> {
  return deleteImage(url)
}

export async function listBlobFiles(): Promise<BlobFile[]> {
  try {
    const response = await fetch("/api/blob/list")
    if (!response.ok) {
      throw new Error("Failed to list files")
    }
    const data = await response.json()
    return data.blobs || []
  } catch (error) {
    console.error("Error listing blob files:", error)
    throw new Error("Failed to list files")
  }
}
