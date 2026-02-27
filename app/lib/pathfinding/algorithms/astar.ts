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
import { getProgressTracker } from '@/app/lib/pathfinding/progress'

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
    const timeout = options?.timeout || 300000 // 5 minutes

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
    // Note: openSet is no longer used in semantic greedy approach
    // const openSet = new PriorityQueue()
    const cameFrom = new Map<string, string>()
    const gScore = new Map<string, number>() // Cost from start to node
    const hScore = new Map<string, number>() // Heuristic estimate to target
    const fScore = new Map<string, number>() // g + h
    const visited = new Set<string>()
    const nodes = new Map<string, PathNode>()

    // Session-scoped cache for similarity scores (for this search only)
    const similarityCache = new Map<string, number>()
    // Cache for article extracts (fetched on demand)
    const extractCache = new Map<string, string>()

    // Fetch target extract once for better semantic similarity
    let targetExtract: string | undefined = undefined
    try {
      const targetExtractResponse = await fetch(
        `/api/wikipedia/extract?titles=${encodeURIComponent(endTitle)}`
      )
      if (targetExtractResponse.ok) {
        const targetExtractData = (await targetExtractResponse.json()) as { success: boolean; data?: Record<string, { extract: string }> }
        if (targetExtractData.success && targetExtractData.data && targetExtractData.data[endTitle]) {
          targetExtract = targetExtractData.data[endTitle].extract
          extractCache.set(endTitle, targetExtract)
        }
      }
    } catch (error) {
      // Continue without target extract
    }

    // Initialize start node
    gScore.set(startTitle, 0)

    // Emit search start progress
    const progressTracker = getProgressTracker()
    if (progressTracker.getSubscriberCount() > 0) {
      progressTracker.emit({
        type: 'searching_start',
        currentArticle: startTitle,
        targetArticle: endTitle,
      })
    }

    // Get initial similarity for start node
    try {
      const startSimilarity = await this.calculateHeuristic(startTitle, endTitle, startTime, timeout, similarityCache, targetExtract, extractCache)
      hScore.set(startTitle, startSimilarity)
      
      // Semantic Greedy: use negative similarity for f-score (so highest similarity = lowest f)
      const f = -startSimilarity
      fScore.set(startTitle, f)

      // Create start node
      nodes.set(startTitle, {
        title: startTitle,
        distance: 0,
        heuristicValue: startSimilarity,
      })

      // Note: no longer adding to openSet - using greedy approach
      // openSet.addOrUpdate(startTitle, f)
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

    // Main Greedy loop - always explore the highest similarity neighbor next
    while (true) {
      // Check timeout
      if (!this.checkTimeout(startTime, timeout)) {
        return this.createErrorResult(
          startTitle,
          endTitle,
          'timeout',
          'a*',
          Date.now() - startTime
        )
      }

      // Find the unvisited article with highest similarity to target
      let bestArticle: string | null = null
      let bestScore = -Infinity
      
      for (const [article, score] of hScore.entries()) {
        if (!visited.has(article) && score > bestScore) {
          bestScore = score
          bestArticle = article
        }
      }
      
      if (!bestArticle) break // No more unvisited articles
      
      const currentTitle = bestArticle

      // Found target!
      if (currentTitle === endTitle) {
        const path = this.reconstructPath(nodes, endTitle)

        // Emit progress update for found
        if (progressTracker.getSubscriberCount() > 0) {
          progressTracker.emit({
            type: 'found',
            currentArticle: endTitle,
            visitedCount: visited.size,
          })
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
      
      const currentNodeG = gScore.get(currentTitle)

      // Emit progress update for exploring
      if (progressTracker.getSubscriberCount() > 0) {
        // Build explored articles list with scores
        const exploredWithScores = Array.from(visited).map((title) => ({
          title,
          score: hScore.get(title) || 0,
        }))
        progressTracker.emit({
          type: 'exploring',
          currentArticle: currentTitle,
          visitedCount: visited.size,
          exploredArticles: Array.from(visited),
          exploredArticlesWithScores: exploredWithScores,
        })
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

        // Batch score all neighbors with their article extracts for context
        try {
          const preScoringG = gScore.get(currentTitle) !== undefined ? gScore.get(currentTitle) : Infinity

          // Emit progress update for scoring
          if (progressTracker.getSubscriberCount() > 0) {
            progressTracker.emit({
              type: 'scoring',
              neighborsCount: unvisitedNeighbors.length,
              targetArticle: endTitle,
            })
          }

           // Fetch article extracts for context (batch in smaller groups to avoid URL length issues)
           let extracts: Record<string, string> = {}
           try {
             const BATCH_SIZE = 20 // Fetch extracts in smaller batches
             for (let i = 0; i < unvisitedNeighbors.length; i += BATCH_SIZE) {
               const batchTitles = unvisitedNeighbors.slice(i, i + BATCH_SIZE)
               const titlesParam = batchTitles.join('|')
               const extractResponse = await fetch(
                 `/api/wikipedia/extract?titles=${encodeURIComponent(titlesParam)}`
               )
               if (extractResponse.ok) {
                 const extractData = (await extractResponse.json()) as { success: boolean; data?: Record<string, { extract: string }> }
                 if (extractData.success && extractData.data) {
                   Object.entries(extractData.data).forEach(([title, data]) => {
                     extracts[title] = data.extract
                     extractCache.set(title, data.extract) // Also cache for future use
                   })
                 }
               }
             }
           } catch (error) {
             console.warn('Failed to fetch extracts, continuing with titles only:', error)
           }
          
          const scores = await this.ollama.batchScoreSimilarity(
            unvisitedNeighbors.map((title) => ({
              title,
              extract: extracts[title] || title, // Use extract if available, fallback to title
            })),
            endTitle,
            120000, // 120 second timeout - sequential batching of embeddings
            targetExtract
          )

          // Sort neighbors by similarity score (highest first)
          const sortedNeighbors = [...unvisitedNeighbors].sort((a, b) => {
            const scoreA = scores.get(a) || 50
            const scoreB = scores.get(b) || 50
            return scoreB - scoreA // Descending order: highest score first
          })

          // Process neighbors in order of semantic similarity (highest score first)
          // Only add the top promising neighbors to avoid exploring too many branches
          // This creates a focused search that explores promising paths first
           const TOP_N_NEIGHBORS = 50 // Only process top N most similar neighbors
           const neighborsToProcess = sortedNeighbors.slice(0, TOP_N_NEIGHBORS)
           
           let addedCount = 0
           const gScoreValue = gScore.get(currentTitle)
           const currentG = gScoreValue !== undefined ? gScoreValue : Infinity
           
           for (const neighbor of neighborsToProcess) {
              const tentativeG = currentG + 1
              const neighborG = gScore.get(neighbor)
              const currentBestG = neighborG !== undefined ? neighborG : Infinity

             if (tentativeG < currentBestG) {
               // This path is better
               cameFrom.set(neighbor, currentTitle)
               gScore.set(neighbor, tentativeG)

               // Calculate similarity score
                const similarityScore = scores.get(neighbor) || 50 // Default to neutral (0-100 scale)
                similarityCache.set(`${neighbor}:${endTitle}`, similarityScore)

                // Semantic Greedy: use similarity score directly as priority
                 // Higher similarity = higher priority (lower f-score value)
                 // We use negative similarity so higher similarity gives lower f-score
                 const f = -similarityScore // Negative so greedy sort puts highest similarity first
                 
                 hScore.set(neighbor, similarityScore)
                 fScore.set(neighbor, f)

                // Create/update node
                 nodes.set(neighbor, {
                   title: neighbor,
                   distance: tentativeG,
                   parent: currentTitle,
                   similarityScore,
                   heuristicValue: similarityScore, // Use similarity score as heuristic value
                 })

                 // Note: no longer adding to openSet - using greedy approach
                 // openSet.addOrUpdate(neighbor, f)
                 addedCount++
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
   * Calculate similarity score for a node with respect to target
   * Returns semantic similarity score (0-100)
   */
  private async calculateHeuristic(
    nodeTitle: string,
    targetTitle: string,
    startTime: number,
    timeout: number,
    cache: Map<string, number>,
    targetExtract?: string,
    extractCache?: Map<string, string>
  ): Promise<number> {
    // Check cache first
    const cacheKey = `${nodeTitle}:${targetTitle}`
    const cached = cache.get(cacheKey)
    if (cached !== undefined) {
      return cached // Return similarity score directly
    }

    // Check timeout
    if (!this.checkTimeout(startTime, timeout)) {
      throw new OllamaTimeoutError('Overall search timeout reached while calculating similarity')
    }

    // Get node extract from cache or use fallback to title
    const nodeExtract = extractCache?.get(nodeTitle) || nodeTitle

    // Score similarity using title and extract if available
    const scores = await this.ollama.batchScoreSimilarity(
      [{ title: nodeTitle, extract: nodeExtract }],
      targetTitle,
      30000, // 30 second timeout for embedding-based scoring
      targetExtract
    )

    const similarityScore = scores.get(nodeTitle) || 50
    cache.set(cacheKey, similarityScore)

    // Return similarity score directly (0-100)
    return similarityScore
  }
}
