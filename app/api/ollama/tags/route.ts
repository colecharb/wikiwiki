/**
 * Proxy API route to Ollama /api/tags endpoint
 * Allows frontend to bypass CORS restrictions
 * Always uses localhost:11434 for Ollama server
 */

import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // Always use localhost - no configuration needed from frontend
  const ollamaUrl = 'http://localhost:11434'

  try {
    const response = await fetch(`${ollamaUrl}/api/tags`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    console.log(`[Ollama Proxy] Response status: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      return NextResponse.json(
        {
          error: `Ollama returned ${response.status}: ${response.statusText}${errorText ? ` - ${errorText}` : ''}`,
        },
        { status: response.status }
      )
    }

    const data = await response.json()
    console.log(`[Ollama Proxy] Success, found ${data.models?.length || 0} models`)
    return NextResponse.json(data)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`[Ollama Proxy] Error:`, errorMessage)
    
    let userMessage = `Failed to connect to Ollama at ${ollamaUrl}: ${errorMessage}`
    
    // Provide specific guidance for common errors
    if (errorMessage.includes('ECONNREFUSED')) {
      userMessage = `Connection refused - Ollama may not be running. Start it with: OLLAMA_ORIGINS=* ollama serve`
    } else if (errorMessage.includes('ENOTFOUND')) {
      userMessage = `Host not found at ${ollamaUrl}`
    } else if (errorMessage.includes('timeout')) {
      userMessage = `Connection timeout - Ollama server at ${ollamaUrl} is not responding`
    }
    
    return NextResponse.json(
      { error: userMessage },
      { status: 503 }
    )
  }
}
