"use client"

import { useCallback, useRef } from "react"

// Debounce hook for search inputs
export function useDebounce<T extends (...args: any[]) => any>(callback: T, delay: number): T {
  const timeoutRef = useRef<NodeJS.Timeout>()

  return useCallback(
    (...args: Parameters<T>) => {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => callback(...args), delay)
    },
    [callback, delay],
  ) as T
}

// Throttle hook for scroll events
export function useThrottle<T extends (...args: any[]) => any>(callback: T, delay: number): T {
  const lastRun = useRef(Date.now())

  return useCallback(
    (...args: Parameters<T>) => {
      if (Date.now() - lastRun.current >= delay) {
        callback(...args)
        lastRun.current = Date.now()
      }
    },
    [callback, delay],
  ) as T
}

// Image preloader utility
export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve()
    img.onerror = reject
    img.src = src
  })
}

// Batch API calls utility
export function batchRequests<T>(requests: (() => Promise<T>)[], batchSize = 5): Promise<T[]> {
  return new Promise(async (resolve, reject) => {
    const results: T[] = []

    try {
      for (let i = 0; i < requests.length; i += batchSize) {
        const batch = requests.slice(i, i + batchSize)
        const batchResults = await Promise.all(batch.map((req) => req()))
        results.push(...batchResults)
      }
      resolve(results)
    } catch (error) {
      reject(error)
    }
  })
}
