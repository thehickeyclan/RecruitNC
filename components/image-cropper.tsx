"use client"

import type React from "react"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from "react-image-crop"
import "react-image-crop/dist/ReactCrop.css"
import { RotateCw, ZoomIn, ZoomOut, Check, X } from "lucide-react"

interface ImageCropperProps {
  src: string
  onCropComplete: (croppedImageBlob: Blob) => void
  onCancel: () => void
  aspectRatio?: number
}

export default function ImageCropper({ src, onCropComplete, onCancel, aspectRatio = 1 }: ImageCropperProps) {
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<Crop>()
  const [scale, setScale] = useState(1)
  const [rotate, setRotate] = useState(0)
  const imgRef = useRef<HTMLImageElement>(null)
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { width, height } = e.currentTarget

      const baseCrop = makeAspectCrop(
        {
          unit: "%",
          width: 90,
        },
        aspectRatio,
        width,
        height,
      )

      // For square (headshot) aspect ratio, align crop to top so face/head stays in frame
      const crop =
        aspectRatio === 1
          ? {
              ...baseCrop,
              x: (100 - (baseCrop.width ?? 0)) / 2,
              y: 0,
            }
          : centerCrop(baseCrop, width, height)

      setCrop(crop)
    },
    [aspectRatio],
  )

  const handleComplete = async () => {
    if (!imgRef.current || !completedCrop) return

    // Create a canvas that will become our output
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set proper canvas dimensions before transform & export
    const scaleX = imgRef.current.naturalWidth / imgRef.current.width
    const scaleY = imgRef.current.naturalHeight / imgRef.current.height

    // Calculate pixel values from percentages
    const pixelCrop = {
      x: (completedCrop.x / 100) * imgRef.current.width * scaleX,
      y: (completedCrop.y / 100) * imgRef.current.height * scaleY,
      width: (completedCrop.width / 100) * imgRef.current.width * scaleX,
      height: (completedCrop.height / 100) * imgRef.current.height * scaleY,
    }

    canvas.width = pixelCrop.width
    canvas.height = pixelCrop.height

    // First, draw the image with rotation and scaling
    ctx.save()

    // Move the canvas origin to the center for rotation
    ctx.translate(canvas.width / 2, canvas.height / 2)
    ctx.rotate((rotate * Math.PI) / 180)
    ctx.scale(scale, scale)
    ctx.translate(-canvas.width / 2, -canvas.height / 2)

    // Draw the image at the correct position to crop it
    ctx.drawImage(
      imgRef.current,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height,
    )

    ctx.restore()

    // Convert to blob
    canvas.toBlob(
      (blob) => {
        if (blob) {
          console.log("Crop completed, blob size:", blob.size)
          onCropComplete(blob)
        }
      },
      "image/jpeg",
      0.95,
    )
  }

  return (
    <div className="flex flex-col space-y-4">
      <div className="relative overflow-hidden rounded-lg border">
        <ReactCrop
          crop={crop}
          onChange={(_, percentCrop) => setCrop(percentCrop)}
          onComplete={(_, percentCrop) => setCompletedCrop(percentCrop)}
          aspect={aspectRatio}
          className="max-h-[500px] overflow-auto"
        >
          <img
            ref={imgRef}
            src={src || "/placeholder.svg"}
            alt="Crop preview"
            onLoad={onImageLoad}
            style={{
              transform: `scale(${scale}) rotate(${rotate}deg)`,
              transformOrigin: "center",
              maxWidth: "100%",
            }}
          />
        </ReactCrop>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Zoom</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setScale(Math.max(scale - 0.1, 0.5))}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Slider
              value={[scale * 100]}
              min={50}
              max={300}
              step={5}
              onValueChange={(value) => setScale(value[0] / 100)}
              className="w-[200px]"
            />
            <Button variant="outline" size="icon" onClick={() => setScale(Math.min(scale + 0.1, 3))}>
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Rotate</span>
          <Button variant="outline" onClick={() => setRotate((prev) => (prev + 90) % 360)}>
            <RotateCw className="mr-2 h-4 w-4" />
            Rotate 90°
          </Button>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          <X className="mr-2 h-4 w-4" />
          Cancel
        </Button>
        <Button onClick={handleComplete} disabled={!completedCrop?.width || !completedCrop?.height}>
          <Check className="mr-2 h-4 w-4" />
          Apply Crop
        </Button>
      </div>

      {/* Hidden canvas for preview */}
      <canvas
        ref={previewCanvasRef}
        style={{
          display: "none",
          width: completedCrop?.width ?? 0,
          height: completedCrop?.height ?? 0,
        }}
      />
    </div>
  )
}
