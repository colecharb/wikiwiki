import type {
  PathfindingAlgorithm,
  PathfindingOptions,
  PathResult,
  PathNode,
  ArticleCrawler,
} from '@/app/lib/pathfinding/types'

/**
 * Base class for pathfinding algorithms
 * Provides common functionality like timeout checking and path reconstruction
 */
export abstract class BasePathfinder implements PathfindingAlgorithm {
  abstract findPath(
    startTitle: string,
    endTitle: string,
    crawler: ArticleCrawler,
    options?: PathfindingOptions
  ): Promise<PathResult>

  /**
   * Reconstruct path from nodes using parent pointers
   */
  protected reconstructPath(nodes: Map<string, PathNode>, endTitle: string): string[] {
    const path: string[] = []
    let current: string | undefined = endTitle

    while (current !== undefined) {
      path.unshift(current)
      const node = nodes.get(current)
      current = node?.parent
    }

    return path
  }

  /**
   * Check if we should continue searching (not timed out)
   */
  protected checkTimeout(startTime: number, timeout: number): boolean {
    return Date.now() - startTime < timeout
  }

  /**
   * Create error result for various failure scenarios
   */
  protected createErrorResult(
    startTitle: string,
    endTitle: string,
    errorType: string,
    algorithm: 'bfs' | 'dijkstra',
    duration: number,
    message?: string
  ): PathResult {
    const errorMessages: Record<string, string> = {
      'not_found': 'No path found. These articles might not be connected.',
      'timeout': 'Search timed out after 60 seconds. Try articles closer together.',
      'crawl_error': 'Error fetching article links. Please try again.',
      'invalid_start': 'Starting article not found on Wikipedia.',
      'invalid_end': 'Target article not found on Wikipedia.',
      'both_invalid': 'Both articles not found on Wikipedia.',
      'same_article': 'Start and target articles are the same!',
    }

    return {
      found: false,
      path: [],
      nodes: new Map(),
      distance: 0,
      startTitle,
      endTitle,
      duration,
      algorithm,
      error: message || errorMessages[errorType] || 'Unknown error',
      errorType: errorType as any,
    }
  }
}
