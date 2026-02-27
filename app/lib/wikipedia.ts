export type SearchResult = {
  title: string
  description: string
  url: string
}

export type Article = {
  title: string
  extract: string
  url: string
}

export type ApiResponse<T> = {
  success: boolean
  data?: T
  error?: string
}

/**
 * Search for Wikipedia articles
 */
export async function searchArticles(query: string): Promise<SearchResult[]> {
  if (!query.trim()) {
    return []
  }

  try {
    const response = await fetch(
      `/api/wikipedia/search?q=${encodeURIComponent(query)}`
    )
    const data: ApiResponse<SearchResult[]> = await response.json()

    if (data.success && data.data) {
      return data.data
    }
    return []
  } catch (error) {
    console.error('Failed to search articles:', error)
    return []
  }
}

/**
 * Fetch detailed article information
 */
export async function getArticle(title: string): Promise<Article | null> {
  try {
    const response = await fetch(
      `/api/wikipedia/article?title=${encodeURIComponent(title)}`
    )
    const data: ApiResponse<Article> = await response.json()

    if (data.success && data.data) {
      return data.data
    }
    return null
  } catch (error) {
    console.error('Failed to fetch article:', error)
    return null
  }
}

/**
 * Debounce a function to delay its execution
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout

  return function (...args: Parameters<T>) {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => {
      func(...args)
    }, delay)
  }
}
