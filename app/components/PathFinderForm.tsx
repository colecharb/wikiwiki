'use client'

import { useState } from 'react'
import SearchField from './SearchField'
import ArticlePreview from './ArticlePreview'
import type { Article } from '@/app/lib/wikipedia'

interface PathFinderFormProps {
  onFindPath?: (start: Article, end: Article) => void
}

export default function PathFinderForm({ onFindPath }: PathFinderFormProps) {
  const [startArticle, setStartArticle] = useState<Article | null>(null)
  const [endArticle, setEndArticle] = useState<Article | null>(null)
  const [isSearching, setIsSearching] = useState(false)

  const handleFindPath = async () => {
    if (!startArticle || !endArticle) return

    setIsSearching(true)
    try {
      if (onFindPath) {
        onFindPath(startArticle, endArticle)
      }
    } finally {
      setIsSearching(false)
    }
  }

  const isReady = startArticle && endArticle

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      {/* Search Fields Container */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Start Article */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
            Starting Article
          </label>
          <SearchField
            placeholder="Search starting article..."
            onSelect={(article) => setStartArticle(article)}
          />
        </div>

        {/* End Article */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
            Target Article
          </label>
          <SearchField
            placeholder="Search target article..."
            onSelect={(article) => setEndArticle(article)}
          />
        </div>
      </div>

      {/* Article Previews */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ArticlePreview
          article={startArticle}
          onClear={() => setStartArticle(null)}
          label="Starting Article"
        />
        <ArticlePreview
          article={endArticle}
          onClear={() => setEndArticle(null)}
          label="Target Article"
        />
      </div>

      {/* Action Button */}
      <div className="flex justify-center pt-4">
        <button
          onClick={handleFindPath}
          disabled={!isReady || isSearching}
          className={`px-8 py-3 font-semibold rounded-lg transition-all ${
            isReady && !isSearching
              ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-md hover:shadow-lg'
              : 'bg-gray-300 dark:bg-zinc-700 text-gray-500 dark:text-gray-400 cursor-not-allowed opacity-50'
          }`}
        >
          {isSearching ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Finding path...
            </div>
          ) : (
            'Find Shortest Path'
          )}
        </button>
      </div>
    </div>
  )
}
