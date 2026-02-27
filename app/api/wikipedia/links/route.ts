import { NextRequest, NextResponse } from 'next/server'
import type { ApiResponse } from '@/app/lib/wikipedia'

interface LinksData {
  title: string
  links: string[]
  linkCount: number
  hasMore?: boolean
  continue?: string
}

/**
 * Fetch all internal links from a Wikipedia article
 * Supports pagination for articles with many links
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const title = searchParams.get('title')
  const continueToken = searchParams.get('continue')
  const includeDisambiguation = searchParams.get('includeDisambiguation') === 'true'

  if (!title) {
    return NextResponse.json(
      {
        success: false,
        error: "Query parameter 'title' is required",
      } as ApiResponse<never>,
      { status: 400 }
    )
  }

  try {
    const url = new URL('https://en.wikipedia.org/w/api.php')
    url.searchParams.set('action', 'query')
    url.searchParams.set('format', 'json')
    url.searchParams.set('titles', title)
    url.searchParams.set('prop', 'links')
    url.searchParams.set('pllimit', '500') // Max per page
    url.searchParams.set('redirects', '1') // Follow redirects
    url.searchParams.set('formatversion', '2')

    // Add continuation token if provided
    if (continueToken) {
      url.searchParams.set('plcontinue', continueToken)
    }

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'WikiWiki-PathFinder/1.0 (https://github.com/anomalyco/Claude)',
      },
    })

    // Check HTTP status
    if (!response.ok) {
      console.error(`Wikipedia API returned ${response.status} for title "${title}"`)
      return NextResponse.json(
        {
          success: false,
          error: `Wikipedia API error: ${response.status} ${response.statusText}`,
        } as ApiResponse<never>,
        { status: response.status >= 500 ? 502 : 400 }
      )
    }

    const data = await response.json()

    // Check for errors
    if (data.batchcomplete === false || !data.query) {
      return NextResponse.json(
        {
          success: false,
          error: 'Article not found',
        } as ApiResponse<never>,
        { status: 404 }
      )
    }

    // Get the page (usually only 1 result)
    const pages = Object.values(data.query.pages || {}) as any[]
    if (pages.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Article not found',
        } as ApiResponse<never>,
        { status: 404 }
      )
    }

    const page = pages[0]
    const pageTitle = page.title || title
    const allLinks = page.links || []

    // Filter out non-article links if needed
    let filteredLinks = allLinks
      .filter((link: any) => link.ns === 0) // ns=0 is main namespace (articles)
      .map((link: any) => link.title)

    // Filter disambiguation pages if not included
    if (!includeDisambiguation) {
      filteredLinks = filteredLinks.filter(
        (link: string) => !link.includes('(disambiguation)')
      )
    }

    // Prune duplicates (though shouldn't happen with API)
    filteredLinks = [...new Set(filteredLinks)]

    const linksData: LinksData = {
      title: pageTitle,
      links: filteredLinks,
      linkCount: filteredLinks.length,
    }

    // Check if there are more results
    if (data.continue && data.continue.plcontinue) {
      linksData.hasMore = true
      linksData.continue = data.continue.plcontinue
    }

    return NextResponse.json(
      {
        success: true,
        data: linksData,
      } as ApiResponse<LinksData>,
      { status: 200 }
    )
  } catch (error) {
    console.error('Wikipedia links fetch error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch article links',
      } as ApiResponse<never>,
      { status: 500 }
    )
  }
}
