'use client'

import type { CacheStore, CrawlResult, ArticleCrawler } from '@/app/lib/pathfinding/types'

/**
 * In-memory cache implementation
 * Fast, no persistence, good for development
 */
export class MemoryCache implements CacheStore {
  private store: Map<string, CrawlResult> = new Map()

  get(key: string): CrawlResult | undefined {
    return this.store.get(key)
  }

  set(key: string, value: CrawlResult): void {
    this.store.set(key, value)
  }

  has(key: string): boolean {
    return this.store.has(key)
  }

  clear(): void {
    this.store.clear()
  }

  size(): number {
    return this.store.size
  }
}

/**
 * LocalStorage-based cache implementation
 * Persists across browser sessions, respects quota limits
 */
export class LocalStorageCache implements CacheStore {
  private prefix = 'wiki_cache_'
  private maxCacheSize = 100 // Max entries to store
  private ttl = 24 * 60 * 60 * 1000 // 24 hour TTL

  private getMetadataKey(): string {
    return `${this.prefix}metadata`
  }

  private getCacheKey(key: string): string {
    return `${this.prefix}${key}`
  }

  private getMetadata(): Map<string, number> {
    try {
      const data = localStorage.getItem(this.getMetadataKey())
      if (!data) return new Map()
      return new Map(JSON.parse(data))
    } catch {
      return new Map()
    }
  }

  private saveMetadata(metadata: Map<string, number>): void {
    try {
      localStorage.setItem(this.getMetadataKey(), JSON.stringify(Array.from(metadata)))
    } catch (error) {
      console.warn('Failed to save cache metadata:', error)
    }
  }

  get(key: string): CrawlResult | undefined {
    try {
      const cacheKey = this.getCacheKey(key)
      const data = localStorage.getItem(cacheKey)
      if (!data) return undefined

      const parsed = JSON.parse(data) as CrawlResult & { timestamp: number }
      const now = Date.now()

      // Check if expired
      if (now - parsed.timestamp > this.ttl) {
        this.delete(key)
        return undefined
      }

      // Return without timestamp
      const { timestamp, ...crawlResult } = parsed
      return crawlResult
    } catch (error) {
      console.warn('Failed to get cache entry:', error)
      return undefined
    }
  }

  set(key: string, value: CrawlResult): void {
    try {
      const cacheKey = this.getCacheKey(key)
      const metadata = this.getMetadata()

      // Check if we need to evict old entries
      if (metadata.size >= this.maxCacheSize) {
        // Find oldest entry
        let oldestKey = key
        let oldestTime = Date.now()

        for (const [k, time] of metadata) {
          if (time < oldestTime) {
            oldestTime = time
            oldestKey = k
          }
        }

        // Delete oldest if it's not the current key
        if (oldestKey !== key) {
          localStorage.removeItem(this.getCacheKey(oldestKey))
          metadata.delete(oldestKey)
        }
      }

      // Store with timestamp
      const dataToStore = {
        ...value,
        timestamp: Date.now(),
      }

      localStorage.setItem(cacheKey, JSON.stringify(dataToStore))

      // Update metadata
      metadata.set(key, Date.now())
      this.saveMetadata(metadata)
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        // Gracefully handle quota exceeded - clear old entries
        console.warn('LocalStorage quota exceeded, clearing old cache entries')
        this.clear()
        this.set(key, value) // Retry
      } else {
        console.warn('Failed to set cache entry:', error)
      }
    }
  }

  has(key: string): boolean {
    return this.get(key) !== undefined
  }

  clear(): void {
    try {
      const metadata = this.getMetadata()
      for (const key of metadata.keys()) {
        localStorage.removeItem(this.getCacheKey(key))
      }
      localStorage.removeItem(this.getMetadataKey())
    } catch (error) {
      console.warn('Failed to clear cache:', error)
    }
  }

  size(): number {
    try {
      const metadata = this.getMetadata()
      return metadata.size
    } catch {
      return 0
    }
  }

  private delete(key: string): void {
    try {
      const cacheKey = this.getCacheKey(key)
      localStorage.removeItem(cacheKey)

      const metadata = this.getMetadata()
      metadata.delete(key)
      this.saveMetadata(metadata)
    } catch (error) {
      console.warn('Failed to delete cache entry:', error)
    }
  }
}

/**
 * Wrapper to add caching to any crawler implementation
 */
export class CachedCrawler implements ArticleCrawler {
  constructor(
    private crawler: ArticleCrawler,
    private cache: CacheStore
  ) {}

  async crawl(title: string): Promise<CrawlResult> {
    // Check cache first
    const cached = this.cache.get(title)
    if (cached) {
      return cached
    }

    // Crawl if not cached
    const result = await this.crawler.crawl(title)

    // Store in cache
    this.cache.set(title, result)

    return result
  }

  async batchCrawl(titles: string[]): Promise<CrawlResult[]> {
    const results: CrawlResult[] = []
    const titlesToFetch: string[] = []
    const fetchIndices: number[] = []

    // Check cache for each title
    for (let i = 0; i < titles.length; i++) {
      const cached = this.cache.get(titles[i])
      if (cached) {
        results[i] = cached
      } else {
        titlesToFetch.push(titles[i])
        fetchIndices.push(i)
      }
    }

    // Fetch uncached items in batch
    if (titlesToFetch.length > 0) {
      const fetchedResults = await this.crawler.batchCrawl(titlesToFetch)

      // Store fetched results in cache and results array
      for (let i = 0; i < fetchedResults.length; i++) {
        const result = fetchedResults[i]
        const resultIndex = fetchIndices[i]
        results[resultIndex] = result
        this.cache.set(result.title, result)
      }
    }

    return results
  }

  /**
   * Get article extract - delegate to underlying crawler
   * This is used by A* for semantic similarity scoring
   */
  async getExtract(title: string): Promise<string> {
    return (this.crawler as any).getExtract(title)
  }

  clearCache(): void {
    this.cache.clear()
  }
}

// Export singleton instances
export const defaultMemoryCache = new MemoryCache()
export const defaultLocalStorageCache =
  typeof window !== 'undefined' ? new LocalStorageCache() : new MemoryCache()
