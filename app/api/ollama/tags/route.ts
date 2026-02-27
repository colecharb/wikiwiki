/**
 * Proxy API route to Ollama /api/tags endpoint
 * Allows frontend to bypass CORS restrictions
 */

import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const ollamaUrl = request.nextUrl.searchParams.get('url')

  if (!ollamaUrl) {
    return NextResponse.json(
      { error: 'Missing ollamaUrl parameter' },
      { status: 400 }
    )
  }

  try {
    // Validate URL format
    new URL(ollamaUrl)

    const response = await fetch(`${ollamaUrl}/api/tags`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `Ollama returned ${response.status}: ${response.statusText}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: `Failed to connect to Ollama: ${errorMessage}` },
      { status: 503 }
    )
  }
}
