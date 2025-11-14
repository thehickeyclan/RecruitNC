"use client"

import { useEffect } from "react"

export function IframeResizer() {
  useEffect(() => {
    // Only run if we're in an iframe
    if (typeof window === "undefined" || window.self === window.top) {
      return
    }

    console.log("[v0] IframeResizer: Detected iframe embedding")

    document.documentElement.classList.add("in-iframe")
    document.body.classList.add("in-iframe")

    // Function to send height to parent
    const sendHeight = () => {
      const height = Math.max(
        document.body.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.clientHeight,
        document.documentElement.scrollHeight,
        document.documentElement.offsetHeight,
      )

      console.log("[v0] IframeResizer: Sending height to parent:", height)

      // Send to parent window using postMessage
      window.parent.postMessage(
        {
          type: "iframe-resize",
          height: height,
        },
        "*", // In production, replace with specific origin for security
      )

      // Also try the Advanced iFrame plugin format (WordPress)
      window.parent.postMessage(
        {
          aiEnableExternalHeightWorkaround: true,
          aiExternalHeight: height,
        },
        "*",
      )
    }

    // Send initial height after a short delay to ensure content is rendered
    setTimeout(sendHeight, 100)
    setTimeout(sendHeight, 500)
    setTimeout(sendHeight, 1000)

    // Watch for content changes using ResizeObserver
    const resizeObserver = new ResizeObserver(() => {
      sendHeight()
    })

    // Observe the body for size changes
    resizeObserver.observe(document.body)

    // Also send height on window resize
    window.addEventListener("resize", sendHeight)

    const mutationObserver = new MutationObserver(() => {
      sendHeight()
    })

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style", "class"],
    })

    // Send height periodically as fallback (every 500ms for first 5 seconds)
    const intervals: NodeJS.Timeout[] = []
    for (let i = 0; i < 10; i++) {
      intervals.push(setTimeout(sendHeight, i * 500))
    }

    // Cleanup
    return () => {
      document.documentElement.classList.remove("in-iframe")
      document.body.classList.remove("in-iframe")
      resizeObserver.disconnect()
      mutationObserver.disconnect()
      window.removeEventListener("resize", sendHeight)
      intervals.forEach(clearTimeout)
    }
  }, [])

  return null
}
