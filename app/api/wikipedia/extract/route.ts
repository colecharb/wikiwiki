import { NextRequest, NextResponse } from 'next/server'
import type { ApiResponse } from '@/app/lib/wikipedia'

interface ExtractData {
  title: string
  extract: string
}

/**
 * Fetch article extract from Wikipedia
 * Returns first 500 characters of the article for context
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const titles = searchParams.get('titles')

  if (!titles) {
    return NextResponse.json(
      {
        success: false,
        error: "Query parameter 'titles' is required (comma-separated)",
      } as ApiResponse<never>,
      { status: 400 }
    )
  }

  try {
    const url = new URL('https://en.wikipedia.org/w/api.php')
    url.searchParams.set('action', 'query')
    url.searchParams.set('format', 'json')
    url.searchParams.set('titles', titles)
    url.searchParams.set('prop', 'extracts')
    url.searchParams.set('explaintext', '1') // Plain text, no HTML
    url.searchParams.set('exintro', '1') // Only intro section
    url.searchParams.set('exlimit', 'max') // Max number of extracts
    url.searchParams.set('redirects', '1') // Follow redirects
    url.searchParams.set('formatversion', '2')

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'WikiWiki-PathFinder/1.0 (https://github.com/anomalyco/Claude)',
      },
    })

    if (!response.ok) {
      console.error(`Wikipedia API returned ${response.status}`)
      return NextResponse.json(
        {
          success: false,
          error: `Wikipedia API error: ${response.status}`,
        } as ApiResponse<never>,
        { status: 502 }
      )
    }

    const data = await response.json()

    if (!data.query) {
      return NextResponse.json(
        {
          success: true,
          data: {} as Record<string, ExtractData>,
        } as ApiResponse<Record<string, ExtractData>>,
      )
    }

    const pages = data.query.pages || []
    const extracts: Record<string, ExtractData> = {}

    // Map results by title
    for (const page of pages) {
      if (!page.missing) {
        extracts[page.title] = {
          title: page.title,
          extract: page.extract || '',
        }
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: extracts,
      } as ApiResponse<Record<string, ExtractData>>
    )
  } catch (error) {
    console.error('Failed to fetch extracts:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch extracts from Wikipedia',
      } as ApiResponse<never>,
      { status: 500 }
    )
  }
}
