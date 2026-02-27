import { BasePathfinder } from './base'
import type {
  PathResult,
  PathNode,
  PathfindingOptions,
  ArticleCrawler,
} from '@/app/lib/pathfinding/types'
import {
  OllamaClient,
  OllamaConnectionError,
  OllamaTimeoutError,
  OllamaResponseError,
} from '@/app/lib/ollama'

/**
 * Priority queue for A* algorithm
 * Maintains nodes sorted by f-score (g + h)
 */
class PriorityQueue {
  private items: Array<{ title: string; fScore: number }> = []

  /**
   * Add or update item in queue
   * If item exists, updates it; otherwise adds it
   */
  addOrUpdate(title: string, fScore: number): void {
    // Remove existing item if present
    this.items = this.items.filter((item) => item.title !== title)

    // Insert in sorted position
    let inserted = false
    for (let i = 0; i < this.items.length; i++) {
      if (fScore < this.items[i].fScore) {
        this.items.splice(i, 0, { title, fScore })
        inserted = true
        break
      }
    }

    if (!inserted) {
      this.items.push({ title, fScore })
    }
  }

  /**
   * Remove and return item with lowest f-score
   */
  pop(): { title: string; fScore: number } | undefined {
    return this.items.shift()
  }

  /**
   * Check if queue is empty
   */
  isEmpty(): boolean {
    return this.items.length === 0
  }

  /**
   * Get queue size
   */
  size(): number {
    return this.items.length
  }

  /**
   * Check if item exists in queue
   */
  has(title: string): boolean {
    return this.items.some((item) => item.title === title)
  }

  /**
   * Clear queue
   */
  clear(): void {
    this.items = []
  }
}

/**
 * A* pathfinding algorithm with semantic similarity heuristic
 * Uses Ollama for semantic similarity scoring of candidate links
 * Guarantees shortest path when heuristic is admissible and consistent
 */
export class AStarPathfinder extends BasePathfinder {
  private ollama: OllamaClient

  constructor(ollama: OllamaClient) {
    super()
    this.ollama = ollama
  }

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
        'a*',
        Date.now() - startTime
      )
    }

    if (startTitle === endTitle) {
      return this.createErrorResult(
        startTitle,
        endTitle,
        'same_article',
        'a*',
        Date.now() - startTime
      )
    }

    return this.astar(startTitle, endTitle, crawler, timeout, startTime)
  }

  /**
   * Main A* algorithm
   */
  private async astar(
    startTitle: string,
    endTitle: string,
    crawler: ArticleCrawler,
    timeout: number,
    startTime: number
  ): Promise<PathResult> {
    const openSet = new PriorityQueue()
    const cameFrom = new Map<string, string>()
    const gScore = new Map<string, number>() // Cost from start to node
    const hScore = new Map<string, number>() // Heuristic estimate to target
    const fScore = new Map<string, number>() // g + h
    const visited = new Set<string>()
    const nodes = new Map<string, PathNode>()

    // Session-scoped cache for similarity scores (for this search only)
    const similarityCache = new Map<string, number>()

    // Initialize start node
    gScore.set(startTitle, 0)

    // Get initial heuristic for start node using just titles
    try {
      const h = await this.calculateHeuristic(startTitle, endTitle, startTime, timeout, similarityCache)
      hScore.set(startTitle, h)
      fScore.set(startTitle, h)

      // Create start node
      nodes.set(startTitle, {
        title: startTitle,
        distance: 0,
        heuristicValue: h,
      })

      openSet.addOrUpdate(startTitle, h)
    } catch (error) {
      if (error instanceof OllamaTimeoutError) {
        return this.createErrorResult(
          startTitle,
          endTitle,
          'ollama_timeout',
          'a*',
          Date.now() - startTime
        )
      }
      if (error instanceof OllamaConnectionError) {
        return this.createErrorResult(
          startTitle,
          endTitle,
          'ollama_unavailable',
          'a*',
          Date.now() - startTime
        )
      }
      throw error
    }

    // Main A* loop
    while (!openSet.isEmpty()) {
      // Check timeout
      if (!this.checkTimeout(startTime, timeout)) {
        if (typeof window !== 'undefined') {
          console.warn(`[A*] Search timed out. Visited ${visited.size} nodes`)
        }
        return this.createErrorResult(
          startTitle,
          endTitle,
          'timeout',
          'a*',
          Date.now() - startTime
        )
      }

      // Get node with lowest f-score
      const current = openSet.pop()
      if (!current) break

      const currentTitle = current.title

      // Found target!
      if (currentTitle === endTitle) {
        const path = this.reconstructPath(nodes, endTitle)
        if (typeof window !== 'undefined') {
          console.debug(`[A*] Path found! Distance: ${path.length - 1} hops. Visited ${visited.size} nodes`)
        }
        return {
          found: true,
          path,
          nodes,
          distance: path.length - 1,
          startTitle,
          endTitle,
          duration: Date.now() - startTime,
          algorithm: 'a*',
        }
      }

      // Skip if already visited
      if (visited.has(currentTitle)) {
        continue
      }

      visited.add(currentTitle)
      
      if (typeof window !== 'undefined') {
        console.debug(`[A*] Exploring: ${currentTitle} (visited: ${visited.size})`)
      }

      // Crawl links from current article
      try {
        const crawlResult = await crawler.crawl(currentTitle)

        if (!crawlResult.links || crawlResult.links.length === 0) {
          continue
        }

        // Batch score all unvisited neighbors
        const unvisitedNeighbors = crawlResult.links.filter(
          (link) => !visited.has(link)
        )

        if (unvisitedNeighbors.length === 0) {
          continue
        }

        // Check if target is directly linked (one-hop case)
        if (unvisitedNeighbors.includes(endTitle)) {
          const targetG = (gScore.get(currentTitle) || Infinity) + 1
          cameFrom.set(endTitle, currentTitle)
          gScore.set(endTitle, targetG)
          
          // Create the final node
          nodes.set(endTitle, {
            title: endTitle,
            distance: targetG,
            parent: currentTitle,
            similarityScore: 100, // Perfect match - it's the target!
            heuristicValue: 0,
          })
          
          // Return path immediately
          const path = this.reconstructPath(nodes, endTitle)
          return {
            found: true,
            path,
            nodes,
            distance: path.length - 1,
            startTitle,
            endTitle,
            duration: Date.now() - startTime,
            algorithm: 'a*',
          }
        }

        // Batch score all neighbors using just their titles
        try {
          if (typeof window !== 'undefined') {
            console.debug(
              `[A*] Scoring ${unvisitedNeighbors.length} neighbors for target "${endTitle}"`
            )
          }
          
          const scores = await this.ollama.batchScoreSimilarity(
            unvisitedNeighbors.map((title) => ({
              title,
              extract: title, // Use title as text for embedding
            })),
            endTitle,
            60000 // 60 second timeout - parallel requests need more time
          )

          // Process each neighbor
          for (const neighbor of unvisitedNeighbors) {
            const tentativeG = (gScore.get(currentTitle) || Infinity) + 1

            if (tentativeG < (gScore.get(neighbor) || Infinity)) {
              // This path is better
              cameFrom.set(neighbor, currentTitle)
              gScore.set(neighbor, tentativeG)

              // Calculate h value
              const similarityScore = scores.get(neighbor) || 50 // Default to neutral
              similarityCache.set(`${neighbor}:${endTitle}`, similarityScore)

              const h = (100 - similarityScore) / 100
              hScore.set(neighbor, h)

              const f = tentativeG + h
              fScore.set(neighbor, f)

              // Create/update node
              nodes.set(neighbor, {
                title: neighbor,
                distance: tentativeG,
                parent: currentTitle,
                similarityScore,
                heuristicValue: h,
              })

              // Add to open set
              openSet.addOrUpdate(neighbor, f)
            }
          }
        } catch (error) {
          if (error instanceof OllamaTimeoutError) {
            return this.createErrorResult(
              startTitle,
              endTitle,
              'ollama_timeout',
              'a*',
              Date.now() - startTime
            )
          }
          if (error instanceof OllamaConnectionError) {
            return this.createErrorResult(
              startTitle,
              endTitle,
              'ollama_unavailable',
              'a*',
              Date.now() - startTime
            )
          }
          throw error
        }
      } catch (error) {
        console.error(`Error crawling ${currentTitle}:`, error)
        // Continue with next node even if crawl fails
        continue
      }
    }

    // No path found
    return this.createErrorResult(
      startTitle,
      endTitle,
      'not_found',
      'a*',
      Date.now() - startTime
    )
  }

  /**
   * Calculate heuristic (h value) for a node
   * h = (100 - similarity_score) / 100
   * Normalized to 0-1 range where 0 means perfect match
   */
  private async calculateHeuristic(
    nodeTitle: string,
    targetTitle: string,
    startTime: number,
    timeout: number,
    cache: Map<string, number>
  ): Promise<number> {
    // Check cache first
    const cacheKey = `${nodeTitle}:${targetTitle}`
    const cached = cache.get(cacheKey)
    if (cached !== undefined) {
      return (100 - cached) / 100
    }

    // Check timeout
    if (!this.checkTimeout(startTime, timeout)) {
      throw new OllamaTimeoutError('Overall search timeout reached while calculating heuristic')
    }

    // Score similarity using just the title
    const scores = await this.ollama.batchScoreSimilarity(
      [{ title: nodeTitle, extract: nodeTitle }],
      targetTitle,
      30000 // 30 second timeout for embedding-based scoring
    )

    const similarityScore = scores.get(nodeTitle) || 50
    cache.set(cacheKey, similarityScore)

    // Normalize: 0 = perfect match (similarity 100), 1 = worst match (similarity 0)
    return (100 - similarityScore) / 100
  }
}
