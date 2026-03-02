/**
 * Client-side image compression using Canvas.
 * Use in browser only (e.g. in "use client" components).
 */

const MAX_DIMENSION = 2048
const TARGET_BYTES_PER_MB = 1024 * 1024

export async function compressImage(
  file: File,
  maxSizeMB: number = 4
): Promise<File> {
  const targetBytes = maxSizeMB * TARGET_BYTES_PER_MB
  if (file.size <= targetBytes) return file

  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)
      const w = img.naturalWidth
      const h = img.naturalHeight
      let width = w
      let height = h
      if (w > MAX_DIMENSION || h > MAX_DIMENSION) {
        if (w >= h) {
          width = MAX_DIMENSION
          height = Math.round((h * MAX_DIMENSION) / w)
        } else {
          height = MAX_DIMENSION
          width = Math.round((w * MAX_DIMENSION) / h)
        }
      }

      const canvas = document.createElement("canvas")
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext("2d")
      if (!ctx) {
        reject(new Error("Canvas not supported"))
        return
      }
      ctx.drawImage(img, 0, 0, width, height)

      const mime = file.type === "image/png" ? "image/png" : "image/jpeg"
      let quality = 0.85

      const tryBlob = () => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Failed to compress image"))
              return
            }
            if (blob.size <= targetBytes || quality <= 0.2) {
              const name = file.name.replace(/\.[^.]+$/, "") + (mime === "image/jpeg" ? ".jpg" : ".png")
              resolve(new File([blob], name, { type: mime }))
              return
            }
            quality = Math.max(0.2, quality - 0.15)
            tryBlob()
          },
          mime,
          quality
        )
      }
      tryBlob()
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("Failed to load image"))
    }
    img.src = url
  })
}
