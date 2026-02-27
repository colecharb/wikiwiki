'use client'

import { useState, useEffect } from 'react'

interface ProgressUpdate {
  type: 'exploring' | 'scoring' | 'found' | 'searching_start'
  currentArticle?: string
  neighborsCount?: number
  visitedCount?: number
  targetArticle?: string
  timestamp?: number
}

interface PathfindingProgressProps {
  updates: ProgressUpdate[]
  isActive: boolean
  startArticle: string
  endArticle: string
}

export default function PathfindingProgress({
  updates,
  isActive,
  startArticle,
  endArticle,
}: PathfindingProgressProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  // Timer effect
  useEffect(() => {
    if (!isActive) {
      setElapsedSeconds(0)
      return
    }

    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [isActive])

  // Get the most recent relevant updates
  const lastExploring = updates.findLast((u) => u.type === 'exploring')
  const lastScoring = updates.findLast((u) => u.type === 'scoring')
  const wasFound = updates.some((u) => u.type === 'found')
  const startTime = updates.find((u) => u.type === 'searching_start')?.timestamp

  if (!isActive && updates.length === 0) {
    return null
  }

  return (
    <div className="w-full p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border border-blue-200 dark:border-blue-800 rounded-lg">
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        {isActive && (
          <div className="mt-1">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {wasFound && (
          <div className="mt-1">
            <div className="w-4 h-4 text-green-600 dark:text-green-400">✓</div>
          </div>
        )}
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {wasFound ? '✓ Path Found!' : isActive ? 'Finding path...' : 'Search Complete'}
            </h3>
            <div className="text-lg font-mono font-bold text-blue-600 dark:text-blue-400">
              {String(Math.floor(elapsedSeconds / 60)).padStart(2, '0')}:
              {String(elapsedSeconds % 60).padStart(2, '0')}
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            From <span className="font-medium">{startArticle}</span> to{' '}
            <span className="font-medium">{endArticle}</span>
          </p>
        </div>
      </div>

      {/* Progress Details */}
      <div className="space-y-3">
        {/* Current Article Being Explored */}
        {lastExploring && (
          <div className="flex items-start gap-3">
            <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 mt-0.5 w-20">
              EXPLORING
            </div>
            <div className="flex-1">
              <p className="font-mono text-sm text-gray-700 dark:text-gray-300">
                {lastExploring.currentArticle}
              </p>
              {lastExploring.visitedCount !== undefined && (
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Visited {lastExploring.visitedCount} article{lastExploring.visitedCount !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Scoring Progress */}
        {lastScoring && (
          <div className="flex items-start gap-3">
            <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5 w-20">
              SCORING
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {lastScoring.neighborsCount} potential links to{' '}
                <span className="font-medium">{lastScoring.targetArticle}</span>
              </p>
              <div className="mt-2 w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full animate-pulse"
                  style={{
                    width: '100%',
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Stats Summary */}
        {(lastExploring || lastScoring) && (
          <div className="pt-3 border-t border-blue-200 dark:border-blue-800">
            <div className="grid grid-cols-3 gap-3 text-center text-xs">
              {lastExploring?.visitedCount !== undefined && (
                <div>
                  <div className="text-xl font-bold text-blue-700 dark:text-blue-300">
                    {lastExploring.visitedCount}
                  </div>
                  <div className="text-gray-600 dark:text-gray-400">Articles Visited</div>
                </div>
              )}
              {lastScoring?.neighborsCount !== undefined && (
                <div>
                  <div className="text-xl font-bold text-indigo-700 dark:text-indigo-300">
                    {lastScoring.neighborsCount}
                  </div>
                  <div className="text-gray-600 dark:text-gray-400">Being Scored</div>
                </div>
              )}
              <div>
                <div className="text-xl font-bold text-green-700 dark:text-green-300">
                  {wasFound ? '✓' : '...'}
                </div>
                <div className="text-gray-600 dark:text-gray-400">Status</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
