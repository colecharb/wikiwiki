'use client'

import { useEffect, useState } from 'react'
import ArticlePreview from './ArticlePreview'
import type { PathNode, ArticleInfo } from '@/app/lib/pathfinding'
import type { Article } from '@/app/lib/wikipedia'
import { getArticle } from '@/app/lib/wikipedia'

interface PathVisualizationProps {
  path: string[]
  nodes: Map<string, PathNode>
  nodeInfo?: Map<string, ArticleInfo>
}

interface ArticleCache {
  [title: string]: Article | null
}

export default function PathVisualization({
  path,
  nodes,
  nodeInfo,
}: PathVisualizationProps) {
  const [articles, setArticles] = useState<ArticleCache>({})
  const [loadingArticles, setLoadingArticles] = useState<Set<string>>(new Set())

  // Fetch article details for all path articles
  useEffect(() => {
    const fetchArticles = async () => {
      const toFetch = path.filter(title => !articles[title] && !loadingArticles.has(title))
      
      if (toFetch.length === 0) return

      // Mark as loading
      setLoadingArticles(prev => new Set([...prev, ...toFetch]))

      // Fetch all articles in parallel
      const results = await Promise.all(
        toFetch.map(async (title) => {
          try {
            const article = await getArticle(title)
            return { title, article }
          } catch (error) {
            console.error(`Failed to fetch article ${title}:`, error)
            return { title, article: null }
          }
        })
      )

      // Update cache
      setArticles(prev => {
        const updated = { ...prev }
        results.forEach(({ title, article }) => {
          updated[title] = article
        })
        return updated
      })

      // Mark as done loading
      setLoadingArticles(new Set())
    }

    fetchArticles()
  }, [path])



  if (path.length === 0) {
    return null
  }

  const getArticleInfo = (title: string): ArticleInfo | null => {
    if (!nodeInfo) return null
    return nodeInfo.get(title) || null
  }

  const getArticle_Cached = (title: string): Article | null => {
    return articles[title] || null
  }

  return (
    <div className="w-full space-y-4">
      {/* Path container - no internal scrolling, scrolls with page */}
      <div className="pb-4 border border-gray-200 dark:border-zinc-700 rounded-lg p-4 bg-gray-50 dark:bg-zinc-900 max-w-2xl mx-auto">
        <div className="flex flex-col gap-3">
          {path.map((title, index) => {
            const isStart = index === 0
            const isEnd = index === path.length - 1
            const article = getArticle_Cached(title)
            const isLoading = loadingArticles.has(title)

            return (
              <div key={`${title}-${index}`} className="flex flex-col items-center gap-3">
                {/* Article Card with colored border for start/end */}
                <div className={isStart ? 'w-full border-l-4 border-l-green-400 dark:border-l-green-600 pl-0' : isEnd ? 'w-full border-l-4 border-l-blue-400 dark:border-l-blue-600 pl-0' : 'w-full'}>
                  {article ? (
                    <ArticlePreview
                      article={article}
                      variant="compact"
                      showClearButton={false}
                    />
                  ) : isLoading ? (
                    <div className="w-full p-4 border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-zinc-900 rounded-lg">
                      <div className="animate-pulse space-y-3">
                        <div className="h-5 bg-gray-200 dark:bg-zinc-700 rounded w-3/4" />
                        <div className="space-y-2">
                          <div className="h-4 bg-gray-100 dark:bg-zinc-800 rounded" />
                          <div className="h-4 bg-gray-100 dark:bg-zinc-800 rounded w-5/6" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full p-4 border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-zinc-900 rounded-lg text-gray-500 dark:text-gray-400">
                      <p className="font-bold">{title}</p>
                      <p className="text-sm mt-2">Unable to load article details</p>
                    </div>
                  )}
                </div>

                {/* Arrow with hop number (except after last) */}
                {!isEnd && (
                  <div className="flex items-center gap-2">
                    <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      Hop {index + 1}
                    </div>
                    <div className="text-gray-400 dark:text-gray-600 text-2xl">
                      ↓
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>


    </div>
  )
}
