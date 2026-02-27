'use client'

import { useState, useEffect } from 'react'
import PathFinderForm from './PathFinderForm'
import PathVisualization from './PathVisualization'
import PathStats from './PathStats'
import PathErrorDisplay from './PathErrorDisplay'
import PathfindingProgress from './PathfindingProgress'
import type { PathResult } from '@/app/lib/pathfinding'
import type { Article } from '@/app/lib/wikipedia'
import { getProgressTracker } from '@/app/lib/pathfinding/progress'
import type { ProgressUpdate } from '@/app/lib/pathfinding/progress'

interface ResultsContainerProps {
  onPathFound?: (result: PathResult) => void
}

export default function ResultsContainer({ onPathFound }: ResultsContainerProps) {
  const [result, setResult] = useState<PathResult | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [progressUpdates, setProgressUpdates] = useState<ProgressUpdate[]>([])
  const [startArticle, setStartArticle] = useState<string>('')
  const [endArticle, setEndArticle] = useState<string>('')

  // Subscribe to progress updates
  useEffect(() => {
    const progressTracker = getProgressTracker()
    const unsubscribe = progressTracker.subscribe((update: ProgressUpdate) => {
      setProgressUpdates((prev) => [...prev, update])
    })

    return unsubscribe
  }, [])

  const handleFindPath = async (start: Article, end: Article, options: { algorithm: 'bfs' | 'dijkstra' | 'a*', includeDisambiguation: boolean }) => {
    setIsSearching(true)
    setProgressUpdates([])
    setStartArticle(start.title)
    setEndArticle(end.title)
    
    try {
      // Import here to avoid circular dependencies
      const { findPathBetweenArticles } = await import('@/app/lib/pathfinding')
      
      const pathResult = await findPathBetweenArticles(start.title, end.title, {
        timeout: 60000,
        algorithm: options.algorithm,
        useCache: true,
        includeDisambiguation: options.includeDisambiguation,
      })
      
      setResult(pathResult)
      onPathFound?.(pathResult)
    } catch (error) {
      console.error('Error finding path:', error)
      setResult({
        found: false,
        path: [],
        nodes: new Map(),
        distance: 0,
        startTitle: start.title,
        endTitle: end.title,
        duration: 0,
        algorithm: 'bfs',
        error: 'An unexpected error occurred',
        errorType: 'crawl_error',
      })
    } finally {
      setIsSearching(false)
    }
  }

  const handleReset = () => {
    setResult(null)
  }

  return (
    <div className="w-full space-y-8">
      {/* Form - centered */}
      <div className="mx-auto max-w-2xl w-full">
        <PathFinderForm 
          onFindPath={handleFindPath} 
          onArticleChange={handleReset}
          isSearching={isSearching} 
        />
      </div>

      {/* Results area - full width below form */}
      <div className="space-y-6">
        {isSearching && (
          <PathfindingProgress
            updates={progressUpdates}
            isActive={isSearching}
            startArticle={startArticle}
            endArticle={endArticle}
          />
        )}

        {result && !result.found && (
          <PathErrorDisplay
            errorType={result.errorType}
            errorMessage={result.error}
            onRetry={handleReset}
          />
        )}

        {result?.found && (
          <>
            <PathVisualization
              path={result.path}
              nodes={result.nodes}
              nodeInfo={result.nodeInfo}
            />
            <PathStats
              distance={result.distance}
              startTitle={result.startTitle}
              endTitle={result.endTitle}
              duration={result.duration}
              algorithm={result.algorithm}
            />
          </>
        )}
      </div>
    </div>
  )
}
