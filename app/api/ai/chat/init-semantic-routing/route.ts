/**
 * API endpoint to initialize semantic routing
 * 
 * This endpoint seeds the embeddings table with handler examples.
 * Run this once after deploying semantic routing.
 * 
 * GET /api/ai/chat/init-semantic-routing
 */

import { NextResponse } from "next/server"
import { initializeSemanticRouting } from "../semantic-router"

export async function GET() {
  try {
    // Init when Voyage key is set (preferred) or when OpenAI semantic routing is explicitly enabled
    if (!process.env.VOYAGE_API_KEY && process.env.ENABLE_SEMANTIC_ROUTING !== "true") {
      return NextResponse.json({
        success: false,
        message: "Set VOYAGE_API_KEY (recommended) or ENABLE_SEMANTIC_ROUTING=true to enable semantic routing.",
      })
    }

    console.log("[Init] Starting semantic routing initialization...")
    await initializeSemanticRouting()

    return NextResponse.json({
      success: true,
      message: "Semantic routing initialized successfully. Handler examples have been embedded and stored.",
    })
  } catch (error: any) {
    console.error("[Init] Error initializing semantic routing:", error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Unknown error",
      },
      { status: 500 }
    )
  }
}
