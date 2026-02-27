/**
 * Result of crawling an article for its links
 */
export type CrawlResult = {
  title: string
  links: string[] // All linked article titles
  linkCount: number // Total links found
  hasMore?: boolean // Whether more links available (pagination)
  continue?: string // Continuation token for pagination
}

/**
 * Node in the pathfinding graph
 */
export type PathNode = {
  title: string
  distance: number // Hops from start (BFS) or weighted distance (Dijkstra)
  parent?: string // Previous node title (for path reconstruction)
  linksCount?: number // Number of links in this article
}

/**
 * Article information for UI display
 */
export type ArticleInfo = {
  excerpt: string
  linkCount: number
  url: string
}

/**
 * Final path result returned to UI
 */
export type PathResult = {
  found: boolean
  path: string[] // Ordered titles from start to end
  nodes: Map<string, PathNode> // Full node info for each article
  distance: number // Number of hops
  startTitle: string
  endTitle: string
  duration: number // Time taken in ms
  algorithm: 'bfs' | 'dijkstra'
  error?: string // Error message if found=false
  errorType?: PathfindingErrorType // Specific error type
  nodeInfo?: Map<string, ArticleInfo> // Article info for UI display
}

/**
 * Specific error types for error handling
 */
export type PathfindingErrorType =
  | 'not_found' // No path exists between articles
  | 'timeout' // Search exceeded timeout
  | 'crawl_error' // API error fetching links
  | 'invalid_start' // Start article doesn't exist
  | 'invalid_end' // End article doesn't exist
  | 'both_invalid' // Both articles don't exist
  | 'same_article' // Start === End

/**
 * Options for pathfinding configuration
 */
export type PathfindingOptions = {
  maxDepth?: number // Max hops allowed (unlimited if not set)
  timeout?: number // Timeout in ms (default: 60000)
  algorithm?: 'bfs' | 'dijkstra' // Which algorithm to use (default: 'bfs')
  useCache?: boolean // Use cached links (default: true)
  includeDisambiguation?: boolean // Include disambiguation pages (default: false)
}

/**
 * Pathfinding algorithm interface
 */
export interface PathfindingAlgorithm {
  findPath(
    startTitle: string,
    endTitle: string,
    crawler: ArticleCrawler,
    options?: PathfindingOptions
  ): Promise<PathResult>
}

/**
 * Article crawler interface
 */
export interface ArticleCrawler {
  crawl(title: string): Promise<CrawlResult>
  batchCrawl(titles: string[]): Promise<CrawlResult[]>
}

/**
 * Cache store interface
 */
export interface CacheStore {
  get(key: string): CrawlResult | undefined
  set(key: string, value: CrawlResult): void
  has(key: string): boolean
  clear(): void
  size(): number
}
