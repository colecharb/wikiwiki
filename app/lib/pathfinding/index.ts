export * from './types'
export * from './crawler'
export * from './algorithms/base'
export * from './algorithms/bfs'
export * from './algorithms/dijkstra'
export * from './algorithms/astar'

import { bfsPathfinder } from './algorithms/bfs'
import { dijkstraPathfinder } from './algorithms/dijkstra'
import { AStarPathfinder } from './algorithms/astar'
import { defaultCrawler } from './crawler'
import { CachedCrawler, defaultLocalStorageCache } from '@/app/lib/cache'
import { OllamaClient } from '@/app/lib/ollama'
import type { PathfindingOptions, PathResult } from './types'

/**
 * Find the shortest path between two Wikipedia articles
 * Uses caching and BFS by default for optimal performance
 * Supports A* algorithm with semantic similarity scoring via Ollama
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
    ollamaUrl = 'http://localhost:11434',
    ollamaModel = 'nomic-embed-text',
  } = options

  // Setup crawler with caching if enabled
  let crawler = defaultCrawler
  if (useCache) {
    crawler = new CachedCrawler(defaultCrawler, defaultLocalStorageCache)
  }

  // Select algorithm
  let pathfinder: any
  if (algorithm === 'a*') {
    // For A*, validate Ollama connection before starting search
    try {
      const ollama = new OllamaClient(ollamaUrl, ollamaModel)
      await ollama.healthCheck()
      pathfinder = new AStarPathfinder(ollama)
    } catch (error) {
      const startTime = Date.now()
      return {
        found: false,
        path: [],
        nodes: new Map(),
        distance: 0,
        startTitle,
        endTitle,
        duration: Date.now() - startTime,
        algorithm: 'a*',
        error:
          `A* algorithm requires Ollama at ${ollamaUrl}. ` +
          `Make sure Ollama is running with 'ollama serve'. ` +
          `Use 'bfs' or 'dijkstra' instead if Ollama is unavailable.`,
        errorType: 'ollama_unavailable',
      }
    }
  } else if (algorithm === 'dijkstra') {
    pathfinder = dijkstraPathfinder
  } else {
    pathfinder = bfsPathfinder
  }

  // Find path with timeout
  return pathfinder.findPath(startTitle, endTitle, crawler, {
    timeout,
    algorithm,
    useCache,
    includeDisambiguation,
    ollamaUrl,
    ollamaModel,
  })
}

// Export singletons and utilities for advanced usage
export { bfsPathfinder, dijkstraPathfinder, defaultCrawler, AStarPathfinder }
export { CachedCrawler, defaultLocalStorageCache, MemoryCache, LocalStorageCache } from '@/app/lib/cache'
export { OllamaClient } from '@/app/lib/ollama'
