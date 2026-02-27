'use client'

import { useState } from 'react'
import PathFinderForm from './PathFinderForm'
import PathVisualization from './PathVisualization'
import PathStats from './PathStats'
import PathErrorDisplay from './PathErrorDisplay'
import PathPlaceholder from './PathPlaceholder'
import type { PathResult } from '@/app/lib/pathfinding'
import type { Article } from '@/app/lib/wikipedia'

interface ResultsContainerProps {
  onPathFound?: (result: PathResult) => void
}

export default function ResultsContainer({ onPathFound }: ResultsContainerProps) {
  const [result, setResult] = useState<PathResult | null>(null)
  const [isSearching, setIsSearching] = useState(false)

  const handleFindPath = async (start: Article, end: Article, options: { algorithm: 'bfs' | 'dijkstra', includeDisambiguation: boolean }) => {
    setIsSearching(true)
    
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
        <PathFinderForm onFindPath={handleFindPath} isSearching={isSearching} />
      </div>

      {/* Results area - full width below form */}
      <div className="space-y-6">
        {isSearching && (
          <div className="p-6 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <div className="text-blue-700 dark:text-blue-300 font-medium">
                Searching for path...
              </div>
            </div>
          </div>
        )}

        {!isSearching && !result && <PathPlaceholder />}

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
            <button
              onClick={handleReset}
              className="w-full px-4 py-2 bg-gray-200 dark:bg-zinc-800 hover:bg-gray-300 dark:hover:bg-zinc-700 text-gray-900 dark:text-white font-medium rounded-lg transition-colors"
            >
              New Search
            </button>
          </>
        )}
      </div>
    </div>
  )
}
