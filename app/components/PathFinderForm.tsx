'use client'

import { useState } from 'react'
import SearchField from './SearchField'
import ArticlePreview from './ArticlePreview'
import type { Article } from '@/app/lib/wikipedia'

interface PathFinderFormProps {
  onFindPath?: (start: Article, end: Article, options: { algorithm: 'bfs' | 'dijkstra', includeDisambiguation: boolean }) => void
  isSearching?: boolean
}

export default function PathFinderForm({ onFindPath, isSearching: isSearchingProp = false }: PathFinderFormProps) {
  const [startArticle, setStartArticle] = useState<Article | null>(null)
  const [endArticle, setEndArticle] = useState<Article | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [algorithm, setAlgorithm] = useState<'bfs' | 'dijkstra'>('bfs')
  const [includeDisambiguation, setIncludeDisambiguation] = useState(false)

  // Use prop if provided, otherwise use local state
  const searching = isSearchingProp || isSearching

  const handleFindPath = async () => {
    if (!startArticle || !endArticle) return

    if (onFindPath) {
      onFindPath(startArticle, endArticle, { algorithm, includeDisambiguation })
    }
  }

  const isReady = startArticle && endArticle

  return (
    <div className="w-full space-y-6">
      {/* Algorithm and Disambiguation Options */}
      <div className="space-y-4 p-4 bg-gray-50 dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800">
        {/* Algorithm Selection */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Algorithm
          </label>
          <select
            value={algorithm}
            onChange={(e) => setAlgorithm(e.target.value as 'bfs' | 'dijkstra')}
            disabled={searching}
            className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="bfs">BFS (Fastest)</option>
            <option value="dijkstra">Dijkstra's</option>
          </select>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Both find the shortest path. BFS is typically faster.
          </p>
        </div>

        {/* Disambiguation Toggle */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="includeDisambiguation"
            checked={includeDisambiguation}
            onChange={(e) => setIncludeDisambiguation(e.target.checked)}
            disabled={searching}
            className="w-4 h-4 rounded border-gray-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <label
            htmlFor="includeDisambiguation"
            className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
          >
            Include disambiguation pages
          </label>
        </div>
      </div>

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
          disabled={!isReady || searching}
          className={`px-8 py-3 font-semibold rounded-lg transition-all ${
            isReady && !searching
              ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-md hover:shadow-lg'
              : 'bg-gray-300 dark:bg-zinc-700 text-gray-500 dark:text-gray-400 cursor-not-allowed opacity-50'
          }`}
        >
          {searching ? (
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
