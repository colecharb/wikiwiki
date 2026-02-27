export * from './types'
export * from './crawler'
export * from './algorithms/base'
export * from './algorithms/bfs'
export * from './algorithms/dijkstra'

import { bfsPathfinder } from './algorithms/bfs'
import { dijkstraPathfinder } from './algorithms/dijkstra'
import { defaultCrawler } from './crawler'
import { CachedCrawler, defaultLocalStorageCache } from '@/app/lib/cache'
import type { PathfindingOptions, PathResult } from './types'

/**
 * Find the shortest path between two Wikipedia articles
 * Uses caching and BFS by default for optimal performance
 */
export async function findPathBetweenArticles(
  startTitle: string,
  endTitle: string,
  options: PathfindingOptions = {}
): Promise<PathResult> {
  const {
    timeout = 60000,
    algorithm = 'bfs',
    useCache = true,
    includeDisambiguation = false,
  } = options

  // Setup crawler with caching if enabled
  let crawler = defaultCrawler
  if (useCache) {
    crawler = new CachedCrawler(defaultCrawler, defaultLocalStorageCache)
  }

  // Select algorithm
  const pathfinder = algorithm === 'dijkstra' ? dijkstraPathfinder : bfsPathfinder

  // Find path with timeout
  return pathfinder.findPath(startTitle, endTitle, crawler, {
    timeout,
    algorithm,
    useCache,
    includeDisambiguation,
  })
}

// Export singletons for advanced usage
export { bfsPathfinder, dijkstraPathfinder, defaultCrawler }
export { CachedCrawler, defaultLocalStorageCache, MemoryCache, LocalStorageCache } from '@/app/lib/cache'
