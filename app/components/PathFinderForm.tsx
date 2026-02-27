'use client'

import { useState, useEffect } from 'react'
import SearchField from './SearchField'
import ArticlePreview from './ArticlePreview'
import type { Article } from '@/app/lib/wikipedia'

interface PathFinderFormProps {
  onFindPath?: (start: Article, end: Article, options: { algorithm: 'bfs' | 'dijkstra' | 'a*', includeDisambiguation: boolean, ollamaModel?: string }) => void
  onArticleChange?: () => void
  isSearching?: boolean
  onStop?: () => void
}

export default function PathFinderForm({ onFindPath, onArticleChange, isSearching: isSearchingProp = false, onStop }: PathFinderFormProps) {
  const [startArticle, setStartArticle] = useState<Article | null>(null)
  const [endArticle, setEndArticle] = useState<Article | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [algorithm, setAlgorithm] = useState<'bfs' | 'dijkstra' | 'a*'>('a*')
  const [includeDisambiguation, setIncludeDisambiguation] = useState(false)
  const [ollamaModels, setOllamaModels] = useState<string[]>([])
  const [selectedModel, setSelectedModel] = useState<string>('snowflake-arctic-embed:xs')
  const [loadingModels, setLoadingModels] = useState(false)
  const [ollamaError, setOllamaError] = useState<string>('')
  const ollamaUrl = 'http://localhost:11434' // Always use localhost

  // Use prop if provided, otherwise use local state
  const searching = isSearchingProp || isSearching

  // Fetch available Ollama models when component mounts or when algorithm changes to A*
  useEffect(() => {
    if (algorithm === 'a*') {
      fetchOllamaModels()
    }
  }, [algorithm])

  const fetchOllamaModels = async () => {
    setLoadingModels(true)
    setOllamaError('')
    try {
      const response = await fetch(`${ollamaUrl}/api/tags`)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = (await response.json()) as { models?: Array<{ name: string }> }
      const models = data.models?.map((m) => m.name) || []
      setOllamaModels(models)
      setOllamaError('')
      
      // If current selected model is not in the list, select the first one
      if (models.length > 0 && !models.includes(selectedModel)) {
        setSelectedModel(models[0])
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      setOllamaError(errorMessage)
      setOllamaModels([])
    } finally {
      setLoadingModels(false)
    }
  }

  const handleStartArticleChange = (article: Article) => {
    setStartArticle(article)
    onArticleChange?.()
  }

  const handleEndArticleChange = (article: Article) => {
    setEndArticle(article)
    onArticleChange?.()
  }

  const handleFindPath = async () => {
    if (!startArticle || !endArticle) return

    if (onFindPath) {
      onFindPath(startArticle, endArticle, { algorithm, includeDisambiguation, ollamaModel: selectedModel })
    }
  }

  const isReady = startArticle && endArticle

  return (
    <div className="w-full space-y-6">
      {/* Algorithm Selection and Options */}
      <div className="space-y-4 p-4 bg-gray-50 dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800">
        {/* Algorithm Dropdown */}
        <div className="space-y-2">
          <label htmlFor="algorithm" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
            Pathfinding Algorithm
          </label>
          <select
            id="algorithm"
            value={algorithm}
            onChange={(e) => setAlgorithm(e.target.value as 'bfs' | 'dijkstra' | 'a*')}
            disabled={searching}
            className="w-full px-4 py-2 bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <option value="bfs">BFS (Fast, Guaranteed Shortest)</option>
            <option value="dijkstra">Dijkstra's (Guaranteed Shortest)</option>
            <option value="a*">A* with Ollama (Semantic, Requires Ollama)</option>
          </select>
          {algorithm === 'a*' && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              ⚠️ Requires Ollama running locally. Start with: <code className="bg-amber-50 dark:bg-amber-950 px-2 py-1 rounded text-amber-800 dark:text-amber-300">ollama serve</code>
            </p>
          )}
        </div>

        {/* Ollama Model Dropdown - Only show for A* algorithm */}
        {algorithm === 'a*' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="ollama-model" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Embedding Model
              </label>
              <button
                onClick={fetchOllamaModels}
                disabled={loadingModels || searching}
                className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loadingModels ? 'Loading...' : 'Refresh'}
              </button>
            </div>
            <select
              id="ollama-model"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              disabled={searching || ollamaModels.length === 0}
              className="w-full px-4 py-2 bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {ollamaModels.length === 0 ? (
                <option disabled>No embedding models found</option>
              ) : (
                ollamaModels.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))
              )}
            </select>
            {ollamaError && (
              <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded">
                <p className="text-xs text-red-700 dark:text-red-300 font-semibold mb-1">Connection Error:</p>
                <p className="text-xs text-red-600 dark:text-red-400 font-mono break-words">{ollamaError}</p>
                <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                  <strong>Troubleshooting:</strong>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>Ensure Ollama is running and accessible at the URL</li>
                    <li>Verify the URL is correct: <code className="bg-red-100 dark:bg-red-900 px-1 rounded">https://your-ip:11434</code></li>
                    <li>Check firewall allows connections to port 11434</li>
                    <li>For HTTPS, ensure certificate is valid (not self-signed)</li>
                    <li>Test with: <code className="bg-red-100 dark:bg-red-900 px-1 rounded">curl https://your-ip:11434/api/tags</code></li>
                  </ul>
                </p>
              </div>
            )}
            
            {ollamaModels.length === 0 && !loadingModels && !ollamaError && (
              <p className="text-xs text-gray-600 dark:text-gray-400">
                No embedding models found. Try running: <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-800 dark:text-gray-300">ollama pull snowflake-arctic-embed:xs</code>
              </p>
            )}
          </div>
        )}

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
            onSelect={handleStartArticleChange}
          />
        </div>

        {/* End Article */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
            Target Article
          </label>
          <SearchField
            placeholder="Search target article..."
            onSelect={handleEndArticleChange}
          />
        </div>
      </div>

      {/* Article Previews */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ArticlePreview
          article={startArticle}
          onClear={() => {
            setStartArticle(null)
            onArticleChange?.()
          }}
          label="Starting Article"
        />
        <ArticlePreview
          article={endArticle}
          onClear={() => {
            setEndArticle(null)
            onArticleChange?.()
          }}
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
         
         {searching && (
           <button
             onClick={onStop}
             className="px-8 py-3 font-semibold rounded-lg transition-all bg-red-600 hover:bg-red-700 text-white"
           >
             Stop Search
           </button>
         )}
       </div>
     </div>
   )
 }
