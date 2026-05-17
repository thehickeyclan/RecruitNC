'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { AlertCircle, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface ProcessedImage {
  imageId: string
  productName: string
  status: 'pending' | 'processing' | 'success' | 'error'
  message?: string
  originalUrl?: string
  newUrl?: string
}

export default function ProcessImagesPage() {
  const [processing, setProcessing] = useState(false)
  const [results, setResults] = useState<ProcessedImage[]>([])
  const [stats, setStats] = useState({ total: 0, completed: 0, failed: 0 })

  const handleProcessAll = async () => {
    setProcessing(true)
    setResults([])
    setStats({ total: 0, completed: 0, failed: 0 })

    try {
      const response = await fetch('/api/admin/process-all-images', {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to start batch processing')
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.trim()) continue

          try {
            const event = JSON.parse(line) as ProcessedImage & { stats?: typeof stats }
            
            if (event.stats) {
              setStats(event.stats)
            } else {
              setResults(prev => [...prev, event])
            }
          } catch (e) {
            console.error('Failed to parse event:', e)
          }
        }
      }
    } catch (error) {
      console.error('Error processing images:', error)
      setResults(prev => [...prev, {
        imageId: 'error',
        productName: 'Error',
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      }])
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Batch Process Product Images</h1>
        <p className="text-white/60 mt-2">Remove backgrounds from all product images to ensure consistent transparent backgrounds</p>
      </div>

      <Alert className="bg-blue-50 border-blue-200">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-900">
          This process will use AI to remove backgrounds from all product images. Original images will be replaced with transparent versions. This may take several minutes.
        </AlertDescription>
      </Alert>

      <Card className="bg-white/5 border-white/10 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Process All Images</h2>
            <p className="text-sm text-white/60 mt-1">Start batch background removal for all product images</p>
          </div>
          <Button
            onClick={handleProcessAll}
            disabled={processing}
            className="bg-[#D3B574] hover:bg-[#c4a665] text-[#0A1628] font-semibold disabled:opacity-50"
            size="lg"
          >
            {processing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              'Start Processing'
            )}
          </Button>
        </div>
      </Card>

      {stats.total > 0 && (
        <Card className="bg-white/5 border-white/10 p-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/5 rounded-lg p-4">
              <p className="text-white/60 text-sm">Total Images</p>
              <p className="text-2xl font-bold text-white mt-1">{stats.total}</p>
            </div>
            <div className="bg-emerald-500/10 rounded-lg p-4 border border-emerald-500/20">
              <p className="text-emerald-200 text-sm">Completed</p>
              <p className="text-2xl font-bold text-emerald-400 mt-1">{stats.completed}</p>
            </div>
            <div className="bg-red-500/10 rounded-lg p-4 border border-red-500/20">
              <p className="text-red-200 text-sm">Failed</p>
              <p className="text-2xl font-bold text-red-400 mt-1">{stats.failed}</p>
            </div>
          </div>
          <div className="mt-4 w-full bg-white/10 rounded-full h-2">
            <div
              className="bg-[#D3B574] h-2 rounded-full transition-all duration-300"
              style={{ width: `${stats.total > 0 ? (stats.completed / stats.total) * 100 : 0}%` }}
            />
          </div>
        </Card>
      )}

      {results.length > 0 && (
        <Card className="bg-white/5 border-white/10 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Processing Results</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {results.map((result, idx) => (
              <div
                key={`${result.imageId}-${idx}`}
                className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/10"
              >
                {result.status === 'success' && (
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                )}
                {result.status === 'error' && (
                  <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                )}
                {result.status === 'processing' && (
                  <Loader2 className="h-5 w-5 text-[#D3B574] flex-shrink-0 animate-spin mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{result.productName}</p>
                  {result.message && (
                    <p className="text-xs text-white/60 mt-1">{result.message}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
