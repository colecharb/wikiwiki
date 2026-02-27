/**
 * Health check endpoint for Ollama proxy
 * Helps users verify their Ollama connection
 */

import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const ollamaUrl = request.nextUrl.searchParams.get('url')

  if (!ollamaUrl) {
    return NextResponse.json(
      { status: 'error', message: 'Missing ollamaUrl parameter' },
      { status: 400 }
    )
  }

  try {
    // Validate URL format
    new URL(ollamaUrl)

    console.log(`[Ollama Health] Checking: ${ollamaUrl}`)

    const response = await fetch(`${ollamaUrl}/api/tags`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (response.ok) {
      const data = await response.json()
      return NextResponse.json({
        status: 'success',
        message: 'Ollama is reachable',
        models: data.models?.length || 0,
      })
    } else {
      return NextResponse.json(
        {
          status: 'error',
          message: `Ollama returned ${response.status}: ${response.statusText}`,
        },
        { status: response.status }
      )
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`[Ollama Health] Error:`, errorMessage)

    return NextResponse.json(
      {
        status: 'error',
        message: `Cannot reach Ollama: ${errorMessage}`,
      },
      { status: 503 }
    )
  }
}
