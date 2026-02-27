import { NextRequest, NextResponse } from 'next/server'
import type { SearchResult, ApiResponse } from '@/app/lib/wikipedia'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q')

  if (!query) {
    return NextResponse.json(
      {
        success: false,
        error: "Query parameter 'q' is required",
      } as ApiResponse<never>,
      { status: 400 }
    )
  }

  try {
    const url = new URL('https://en.wikipedia.org/w/api.php')
    url.searchParams.set('action', 'opensearch')
    url.searchParams.set('search', query)
    url.searchParams.set('limit', '10')
    url.searchParams.set('format', 'json')

    const response = await fetch(url.toString())
    const data = await response.json()

    // OpenSearch API returns: [query, titles[], descriptions[], urls[]]
    if (!Array.isArray(data) || data.length < 4) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid response from Wikipedia API',
        } as ApiResponse<never>,
        { status: 500 }
      )
    }

    const [, titles, descriptions, urls] = data as [
      string,
      string[],
      string[],
      string[]
    ]

    const results: SearchResult[] = titles.map((title, index) => ({
      title,
      description: descriptions[index] || '',
      url: urls[index] || `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`,
    }))

    return NextResponse.json(
      {
        success: true,
        data: results,
      } as ApiResponse<SearchResult[]>,
      { status: 200 }
    )
  } catch (error) {
    console.error('Wikipedia search error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch suggestions from Wikipedia',
      } as ApiResponse<never>,
      { status: 500 }
    )
  }
}
