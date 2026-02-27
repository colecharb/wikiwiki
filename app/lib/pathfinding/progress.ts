/**
 * Progress tracking for pathfinding operations
 * Allows algorithms to emit progress updates that can be displayed to the user
 */

export interface ProgressUpdate {
  type: 'searching_start' | 'exploring' | 'scoring' | 'found'
  currentArticle?: string
  neighborsCount?: number
  visitedCount?: number
  targetArticle?: string
  exploredArticles?: string[] // List of articles explored in order
  exploredArticlesWithScores?: Array<{ title: string; score: number }> // Articles with their similarity scores
  timestamp?: number
}

/**
 * Callback function for progress updates
 */
export type ProgressCallback = (update: ProgressUpdate) => void

/**
 * Progress tracker - manages progress updates from algorithms
 */
export class ProgressTracker {
  private callbacks: Set<ProgressCallback> = new Set()

  /**
   * Subscribe to progress updates
   */
  subscribe(callback: ProgressCallback): () => void {
    this.callbacks.add(callback)
    // Return unsubscribe function
    return () => {
      this.callbacks.delete(callback)
    }
  }

  /**
   * Emit a progress update
   */
  emit(update: ProgressUpdate): void {
    const updateWithTimestamp = {
      ...update,
      timestamp: Date.now(),
    }
    this.callbacks.forEach((callback) => callback(updateWithTimestamp))
  }

  /**
   * Get number of subscribers
   */
  getSubscriberCount(): number {
    return this.callbacks.size
  }
}

// Global progress tracker instance
let globalProgressTracker: ProgressTracker | null = null

/**
 * Get or create global progress tracker
 */
export function getProgressTracker(): ProgressTracker {
  if (!globalProgressTracker) {
    globalProgressTracker = new ProgressTracker()
  }
  return globalProgressTracker
}

/**
 * Reset global progress tracker (for testing or cleanup)
 */
export function resetProgressTracker(): void {
  globalProgressTracker = null
}
