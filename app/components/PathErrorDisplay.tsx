'use client'

import type { PathfindingErrorType } from '@/app/lib/pathfinding'

interface PathErrorDisplayProps {
  errorType?: PathfindingErrorType
  errorMessage?: string
  onRetry: () => void
}

export default function PathErrorDisplay({
  errorType,
  errorMessage,
  onRetry,
}: PathErrorDisplayProps) {
  const getErrorIcon = (type?: PathfindingErrorType) => {
    switch (type) {
      case 'not_found':
        return '🔍'
      case 'timeout':
        return '⏱️'
      case 'invalid_start':
      case 'invalid_end':
      case 'both_invalid':
        return '❓'
      case 'same_article':
        return '🔄'
      default:
        return '⚠️'
    }
  }

  const getErrorTitle = (type?: PathfindingErrorType) => {
    switch (type) {
      case 'not_found':
        return 'No Path Found'
      case 'timeout':
        return 'Search Timed Out'
      case 'invalid_start':
        return 'Starting Article Not Found'
      case 'invalid_end':
        return 'Target Article Not Found'
      case 'both_invalid':
        return 'Articles Not Found'
      case 'same_article':
        return 'Same Article'
      default:
        return 'Error'
    }
  }

  return (
    <div className="w-full p-6 border-2 border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950 rounded-lg">
      <div className="flex items-start gap-4">
        <div className="text-4xl flex-shrink-0">{getErrorIcon(errorType)}</div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-1">
            {getErrorTitle(errorType)}
          </h3>
          <p className="text-red-800 dark:text-red-200 mb-4">
            {errorMessage ||
              'An error occurred while searching for a path between articles.'}
          </p>
          <button
            onClick={onRetry}
            className="inline-block px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  )
}
