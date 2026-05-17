import { NextRequest, NextResponse } from 'next/server'
import * as fal from '@fal-ai/serverless-client'
import { createClient } from '@supabase/supabase-js'

fal.config({
  credentials: process.env.FAL_KEY,
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

interface ProcessedImage {
  imageId: string
  productName: string
  status: 'pending' | 'processing' | 'success' | 'error'
  message?: string
  originalUrl?: string
  newUrl?: string
}

interface StatsEvent {
  stats: {
    total: number
    completed: number
    failed: number
  }
}

async function processImage(imageUrl: string): Promise<string | null> {
  try {
    console.log('[v0] Processing image:', imageUrl)
    const result = await fal.subscribe('fal-ai/birefnet', {
      input: {
        image_url: imageUrl,
      },
    })
    console.log('[v0] Fal result:', JSON.stringify(result))

    return (result as { image?: { url?: string } }).image?.url || null
  } catch (error) {
    console.error('[v0] Error processing image:', error)
    return null
  }
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder()
  let messageId = 0

  const sendMessage = (data: ProcessedImage | StatsEvent) => {
    return encoder.encode(JSON.stringify(data) + '\n')
  }

  const customReadable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        // Fetch all product images
        const { data: images, error: fetchError } = await supabase
          .from('product_images')
          .select('id, url, product_id, created_at')
          .not('url', 'is', null)

        if (fetchError || !images) {
          controller.enqueue(
            sendMessage({
              imageId: 'error',
              productName: 'Error',
              status: 'error',
              message: fetchError?.message || 'Failed to fetch images',
            })
          )
          controller.close()
          return
        }

        const total = images.length
        let completed = 0
        let failed = 0

        // Send initial stats
        controller.enqueue(
          sendMessage({
            stats: { total, completed, failed },
          })
        )

        // Process images in batches of 5 (to avoid overwhelming fal)
        const batchSize = 5
        for (let i = 0; i < images.length; i += batchSize) {
          const batch = images.slice(i, i + batchSize)

          await Promise.all(
            batch.map(async (img) => {
              try {
                // Send processing status
                controller.enqueue(
                  sendMessage({
                    imageId: img.id,
                    productName: `Processing image ${completed + 1}/${total}`,
                    status: 'processing',
                  })
                )

                // Process the image
                const newUrl = await processImage(img.url)

                if (newUrl) {
                  // Update in database
                  const { error: updateError } = await supabase
                    .from('product_images')
                    .update({ url: newUrl })
                    .eq('id', img.id)

                  if (updateError) {
                    controller.enqueue(
                      sendMessage({
                        imageId: img.id,
                        productName: `Image ${completed + 1}/${total}`,
                        status: 'error',
                        message: `Failed to update: ${updateError.message}`,
                        originalUrl: img.url,
                      })
                    )
                    failed++
                  } else {
                    controller.enqueue(
                      sendMessage({
                        imageId: img.id,
                        productName: `Image ${completed + 1}/${total}`,
                        status: 'success',
                        message: 'Background removed successfully',
                        originalUrl: img.url,
                        newUrl,
                      })
                    )
                    completed++
                  }
                } else {
                  controller.enqueue(
                    sendMessage({
                      imageId: img.id,
                      productName: `Image ${completed + 1}/${total}`,
                      status: 'error',
                      message: 'Failed to process with AI',
                      originalUrl: img.url,
                    })
                  )
                  failed++
                }

                // Send updated stats
                controller.enqueue(
                  sendMessage({
                    stats: { total, completed, failed },
                  })
                )
              } catch (error) {
                console.error('Error processing image:', error)
                failed++
                controller.enqueue(
                  sendMessage({
                    imageId: img.id,
                    productName: `Image ${completed + 1}/${total}`,
                    status: 'error',
                    message: error instanceof Error ? error.message : 'Unknown error',
                    originalUrl: img.url,
                  })
                )
              }
            })
          )
        }

        controller.close()
      } catch (error) {
        console.error('Stream error:', error)
        controller.enqueue(
          sendMessage({
            imageId: 'fatal',
            productName: 'Fatal Error',
            status: 'error',
            message: error instanceof Error ? error.message : 'Unknown error',
          })
        )
        controller.close()
      }
    },
  })

  return new NextResponse(customReadable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
