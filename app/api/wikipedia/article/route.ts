import { NextRequest, NextResponse } from 'next/server'
import type { Article, ApiResponse } from '@/app/lib/wikipedia'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const title = searchParams.get('title')

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
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`

    const response = await fetch(url)

    if (response.status === 404) {
      return NextResponse.json(
        {
          success: false,
          error: 'Article not found',
        } as ApiResponse<never>,
        { status: 404 }
      )
    }

    if (!response.ok) {
      throw new Error(`Wikipedia API error: ${response.statusText}`)
    }

    const data = await response.json()

    const article: Article = {
      title: data.title || title,
      extract: data.extract || data.description || '',
      url: data.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`,
    }

    return NextResponse.json(
      {
        success: true,
        data: article,
      } as ApiResponse<Article>,
      { status: 200 }
    )
  } catch (error) {
    console.error('Wikipedia article fetch error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch article details',
      } as ApiResponse<never>,
      { status: 500 }
    )
  }
}
