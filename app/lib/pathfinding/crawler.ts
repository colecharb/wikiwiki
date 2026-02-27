import type { ArticleCrawler, CrawlResult } from '@/app/lib/pathfinding/types'

/**
 * Default Wikipedia crawler - fetches links from articles via API
 */
export class WikipediaCrawler implements ArticleCrawler {
  async crawl(title: string): Promise<CrawlResult> {
    try {
      const response = await fetch(
        `/api/wikipedia/links?title=${encodeURIComponent(title)}`
      )
      const data = await response.json()

      if (data.success && data.data) {
        return data.data
      }

      // Log error for debugging
      if (!data.success) {
        console.warn(`Failed to fetch links for "${title}": ${data.error}`)
      }

      // Return empty result on error (prevents path-finding from failing)
      return {
        title,
        links: [],
        linkCount: 0,
      }
    } catch (error) {
      console.error(`Failed to crawl ${title}:`, error)
      return {
        title,
        links: [],
        linkCount: 0,
      }
    }
  }

  async batchCrawl(titles: string[]): Promise<CrawlResult[]> {
    // Fetch all articles in parallel
    const promises = titles.map((title) => this.crawl(title))
    return Promise.all(promises)
  }
}

/**
 * Mock crawler for testing - returns predefined results
 */
export class MockCrawler implements ArticleCrawler {
  private mockData: Map<string, CrawlResult> = new Map([
    [
      'Albert Einstein',
      {
        title: 'Albert Einstein',
        links: ['Physics', 'Relativity', 'Quantum mechanics', 'Nobel Prize'],
        linkCount: 4,
      },
    ],
    [
      'Physics',
      {
        title: 'Physics',
        links: ['Science', 'Matter', 'Energy', 'Einstein'],
        linkCount: 4,
      },
    ],
    [
      'Relativity',
      {
        title: 'Relativity',
        links: ['Physics', 'Space', 'Time', 'Einstein'],
        linkCount: 4,
      },
    ],
    [
      'Science',
      {
        title: 'Science',
        links: ['Knowledge', 'Physics', 'Biology'],
        linkCount: 3,
      },
    ],
    [
      'Philosophy',
      {
        title: 'Philosophy',
        links: ['Knowledge', 'Ethics', 'Logic'],
        linkCount: 3,
      },
    ],
    [
      'Knowledge',
      {
        title: 'Knowledge',
        links: ['Philosophy', 'Science', 'Epistemology'],
        linkCount: 3,
      },
    ],
  ])

  async crawl(title: string): Promise<CrawlResult> {
    return (
      this.mockData.get(title) || {
        title,
        links: [],
        linkCount: 0,
      }
    )
  }

  async batchCrawl(titles: string[]): Promise<CrawlResult[]> {
    return Promise.all(titles.map((t) => this.crawl(t)))
  }
}

// Export default instance
export const defaultCrawler = new WikipediaCrawler()
