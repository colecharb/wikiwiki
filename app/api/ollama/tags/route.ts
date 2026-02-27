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
    let url: URL
    try {
      url = new URL(ollamaUrl)
    } catch {
      return NextResponse.json(
        { error: `Invalid URL format: ${ollamaUrl}. Use http://ip:port or https://ip:port` },
        { status: 400 }
      )
    }

    console.log(`[Ollama Proxy] Connecting to: ${ollamaUrl}/api/tags`)

    const response = await fetch(`${ollamaUrl}/api/tags`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Allow self-signed certificates
      ...(url.protocol === 'https:' && {
        // Node.js will still validate, but we handle errors gracefully
      }),
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
    
    let userMessage = `Failed to connect to Ollama: ${errorMessage}`
    
    // Provide specific guidance for common errors
    if (errorMessage.includes('ECONNREFUSED')) {
      userMessage = 'Connection refused - Ollama may not be running or listening on that address'
    } else if (errorMessage.includes('ENOTFOUND')) {
      userMessage = 'Host not found - Check your IP address is correct'
    } else if (errorMessage.includes('timeout')) {
      userMessage = 'Connection timeout - Ollama server is not responding'
    } else if (errorMessage.includes('certificate')) {
      userMessage = 'SSL certificate error - May need to accept self-signed cert'
    }
    
    return NextResponse.json(
      { error: userMessage },
      { status: 503 }
    )
  }
}
