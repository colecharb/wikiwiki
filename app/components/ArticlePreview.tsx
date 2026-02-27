'use client'

import { Article } from '@/app/lib/wikipedia'

interface ArticlePreviewProps {
  article: Article | null
  onClear?: () => void
  label?: string
  error?: string
  showClearButton?: boolean
  variant?: 'default' | 'compact'
}

export default function ArticlePreview({
  article,
  onClear,
  label,
  error,
  showClearButton = true,
  variant = 'default',
}: ArticlePreviewProps) {
  if (error) {
    return (
      <div className="w-full p-4 border-2 border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950 rounded-lg">
        {label && (
          <div className="text-sm font-semibold text-red-700 dark:text-red-200 mb-1">
            {label}
          </div>
        )}
        <div className="text-red-600 dark:text-red-300">{error}</div>
      </div>
    )
  }

  if (!article) {
    return (
      <div className="w-full p-4 border-2 border-dashed border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900 rounded-lg">
        {label && (
          <div className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">
            {label}
          </div>
        )}
        <div className="text-gray-500 dark:text-gray-500">
          Select an article...
        </div>
      </div>
    )
  }

  // Compact variant for path visualization
  if (variant === 'compact') {
    return (
      <div className="w-full p-4 border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-zinc-900 rounded-lg">
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block font-bold text-lg text-blue-700 dark:text-blue-300 hover:underline mb-2 break-words line-clamp-2"
          title={article.title}
        >
          {article.title}
        </a>
        <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3 mb-3">
          {article.extract}
        </p>
      </div>
    )
  }

  // Default variant for article selection
  return (
    <div className="w-full p-4 border-2 border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950 rounded-lg">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {label && (
            <div className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">
              {label}
            </div>
          )}
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block font-bold text-lg text-blue-700 dark:text-blue-300 hover:underline mb-2 break-words"
          >
            {article.title}
          </a>
          <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-5">
            {article.extract}
          </p>
        </div>
        {showClearButton && onClear && (
          <button
            onClick={onClear}
            className="flex-shrink-0 px-3 py-1 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-zinc-800 rounded transition-colors whitespace-nowrap"
            aria-label={`Clear ${label || 'article'}`}
          >
            Clear
          </button>
        )}
      </div>
    </div>
  )
}
