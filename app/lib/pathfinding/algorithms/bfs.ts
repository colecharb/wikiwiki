import { BasePathfinder } from './base'
import type {
  PathResult,
  PathNode,
  PathfindingOptions,
  ArticleCrawler,
} from '@/app/lib/pathfinding/types'

/**
 * Breadth-First Search pathfinding algorithm
 * Guarantees shortest path in unweighted graphs
 */
export class BFSPathfinder extends BasePathfinder {
  async findPath(
    startTitle: string,
    endTitle: string,
    crawler: ArticleCrawler,
    options?: PathfindingOptions
  ): Promise<PathResult> {
    const startTime = Date.now()
    const timeout = options?.timeout || 60000

    // Validate inputs
    if (!startTitle.trim() || !endTitle.trim()) {
      return this.createErrorResult(
        startTitle,
        endTitle,
        'invalid_start',
        'bfs',
        Date.now() - startTime
      )
    }

    if (startTitle === endTitle) {
      return this.createErrorResult(
        startTitle,
        endTitle,
        'same_article',
        'bfs',
        Date.now() - startTime
      )
    }

    return this.bfs(startTitle, endTitle, crawler, timeout)
  }

  private async bfs(
    startTitle: string,
    endTitle: string,
    crawler: ArticleCrawler,
    timeout: number
  ): Promise<PathResult> {
    const startTime = Date.now()

    // Initialize data structures
    const queue: string[] = [startTitle]
    const visited = new Set<string>([startTitle])
    const nodes = new Map<string, PathNode>([
      [startTitle, { title: startTitle, distance: 0 }],
    ])

    while (queue.length > 0) {
      // Check timeout
      if (!this.checkTimeout(startTime, timeout)) {
        return this.createErrorResult(
          startTitle,
          endTitle,
          'timeout',
          'bfs',
          Date.now() - startTime
        )
      }

      // Dequeue next article to process
      const current = queue.shift()!

      // Check if we found the target
      if (current === endTitle) {
        const path = this.reconstructPath(nodes, endTitle)
        return {
          found: true,
          path,
          nodes,
          distance: path.length - 1,
          startTitle,
          endTitle,
          duration: Date.now() - startTime,
          algorithm: 'bfs',
        }
      }

      // Crawl current article to get its links
      let links: string[] = []
      try {
        const crawlResult = await crawler.crawl(current)
        links = crawlResult.links || []
      } catch (error) {
        console.error(`Failed to crawl ${current}:`, error)
        // Continue with empty links
        continue
      }

      // Get current distance for next iteration
      const currentDistance = nodes.get(current)?.distance || 0

      // Process each link
      for (const link of links) {
        // Skip if already visited (prevents cycles)
        if (visited.has(link)) {
          continue
        }

        // Mark as visited
        visited.add(link)

        // Add to nodes map
        nodes.set(link, {
          title: link,
          distance: currentDistance + 1,
          parent: current,
        })

        // Add to queue for processing
        queue.push(link)

        // Early exit if we find the target
        if (link === endTitle) {
          const path = this.reconstructPath(nodes, endTitle)
          return {
            found: true,
            path,
            nodes,
            distance: path.length - 1,
            startTitle,
            endTitle,
            duration: Date.now() - startTime,
            algorithm: 'bfs',
          }
        }
      }
    }

    // Queue exhausted without finding target
    return this.createErrorResult(
      startTitle,
      endTitle,
      'not_found',
      'bfs',
      Date.now() - startTime
    )
  }
}

export const bfsPathfinder = new BFSPathfinder()
