import { BasePathfinder } from './base'
import type {
  PathResult,
  PathNode,
  PathfindingOptions,
  ArticleCrawler,
} from '@/app/lib/pathfinding/types'

/**
 * Dijkstra's algorithm for pathfinding
 * With uniform weights (all links = 1), produces same result as BFS
 * but explores more nodes. Included for future support of weighted graphs.
 */
export class DijkstraPathfinder extends BasePathfinder {
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
        'dijkstra',
        Date.now() - startTime
      )
    }

    if (startTitle === endTitle) {
      return this.createErrorResult(
        startTitle,
        endTitle,
        'same_article',
        'dijkstra',
        Date.now() - startTime
      )
    }

    return this.dijkstra(startTitle, endTitle, crawler, timeout)
  }

  private async dijkstra(
    startTitle: string,
    endTitle: string,
    crawler: ArticleCrawler,
    timeout: number
  ): Promise<PathResult> {
    const startTime = Date.now()

    // Initialize data structures
    const distances = new Map<string, number>([[startTitle, 0]])
    const unvisited = new Set<string>([startTitle])
    const visited = new Set<string>()
    const nodes = new Map<string, PathNode>([
      [startTitle, { title: startTitle, distance: 0 }],
    ])

    while (unvisited.size > 0) {
      // Check timeout
      if (!this.checkTimeout(startTime, timeout)) {
        return this.createErrorResult(
          startTitle,
          endTitle,
          'timeout',
          'dijkstra',
          Date.now() - startTime
        )
      }

      // Find unvisited node with minimum distance
      let current: string | null = null
      let minDistance = Infinity

      for (const node of unvisited) {
        const distance = distances.get(node) || Infinity
        if (distance < minDistance) {
          minDistance = distance
          current = node
        }
      }

      // No unvisited nodes with finite distance (no path exists)
      if (current === null || minDistance === Infinity) {
        return this.createErrorResult(
          startTitle,
          endTitle,
          'not_found',
          'dijkstra',
          Date.now() - startTime
        )
      }

      // Mark as visited
      unvisited.delete(current)
      visited.add(current)

      // Check if we reached the target
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
          algorithm: 'dijkstra',
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

      const currentDistance = distances.get(current) || 0

      // Process each link (weight = 1 for all links)
      for (const link of links) {
        // Skip if already visited
        if (visited.has(link)) {
          continue
        }

        const newDistance = currentDistance + 1
        const oldDistance = distances.get(link) ?? Infinity

        // Update if we found a shorter path
        if (newDistance < oldDistance) {
          distances.set(link, newDistance)

          // Update node
          nodes.set(link, {
            title: link,
            distance: newDistance,
            parent: current,
          })

          // Add to unvisited if not already there
          if (!unvisited.has(link)) {
            unvisited.add(link)
          }

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
              algorithm: 'dijkstra',
            }
          }
        }
      }
    }

    // No path found
    return this.createErrorResult(
      startTitle,
      endTitle,
      'not_found',
      'dijkstra',
      Date.now() - startTime
    )
  }
}

export const dijkstraPathfinder = new DijkstraPathfinder()
