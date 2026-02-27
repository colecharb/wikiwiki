'use client'

import { useEffect, useRef } from 'react'
import type { PathNode, ArticleInfo } from '@/app/lib/pathfinding'

interface PathVisualizationProps {
  path: string[]
  nodes: Map<string, PathNode>
  nodeInfo?: Map<string, ArticleInfo>
}

export default function PathVisualization({
  path,
  nodes,
  nodeInfo,
}: PathVisualizationProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to the end on mount
  useEffect(() => {
    if (containerRef.current) {
      const scrollDelay = setTimeout(() => {
        containerRef.current?.scrollTo({
          top: containerRef.current.scrollHeight,
          behavior: 'smooth',
        })
      }, 100)
      return () => clearTimeout(scrollDelay)
    }
  }, [path])

  if (path.length === 0) {
    return null
  }

  const getArticleInfo = (title: string): ArticleInfo | null => {
    if (!nodeInfo) return null
    return nodeInfo.get(title) || null
  }

  return (
    <div className="w-full space-y-4">
      {/* Title */}
      <div className="text-lg font-semibold text-gray-900 dark:text-white">
        Path ({path.length} articles)
      </div>

      {/* Scrollable path container - vertical on desktop, full height on mobile */}
      <div
        ref={containerRef}
        className="overflow-y-auto md:max-h-96 pb-4 scroll-smooth border border-gray-200 dark:border-zinc-700 rounded-lg p-4 bg-gray-50 dark:bg-zinc-900"
      >
        <div className="flex flex-col gap-3">
          {path.map((title, index) => {
            const isStart = index === 0
            const isEnd = index === path.length - 1
            const info = getArticleInfo(title)
            const node = nodes.get(title)

            return (
              <div key={`${title}-${index}`} className="flex flex-col items-center gap-3">
                {/* Article Card */}
                <div
                  className={`w-full p-4 border-2 rounded-lg transition-all ${
                    isStart
                      ? 'border-green-400 dark:border-green-600 bg-green-50 dark:bg-green-950'
                      : isEnd
                        ? 'border-blue-400 dark:border-blue-600 bg-blue-50 dark:bg-blue-950'
                        : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-zinc-900 hover:border-gray-400 dark:hover:border-gray-600'
                  }`}
                >
                  {/* Hop number */}
                  <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
                    Hop {index + 1} of {path.length}
                  </div>

                  {/* Title - clickable link */}
                  <a
                    href={info?.url || `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block font-bold text-lg text-blue-700 dark:text-blue-300 hover:underline mb-2 break-words line-clamp-2"
                    title={title}
                  >
                    {title}
                  </a>

                  {/* Excerpt */}
                  {info?.excerpt && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mb-3">
                      {info.excerpt}
                    </p>
                  )}

                  {/* Link count badge */}
                  {info?.linkCount !== undefined && (
                    <div className="inline-block px-2 py-1 bg-gray-100 dark:bg-zinc-800 text-xs font-medium text-gray-700 dark:text-gray-300 rounded">
                      {info.linkCount} links
                    </div>
                  )}
                </div>

                {/* Arrow between articles (except after last) */}
                {!isEnd && (
                  <div className="text-gray-400 dark:text-gray-600 text-2xl">
                    ↓
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Scroll hint */}
      <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
        ↓ Scroll to see the full path ↓
      </div>
    </div>
  )
}
