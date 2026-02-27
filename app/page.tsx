'use client'

import { useState } from 'react'
import PathFinderForm from './components/PathFinderForm'
import type { Article } from './lib/wikipedia'

export default function Home() {
  const [pathFound, setPathFound] = useState(false)

  const handleFindPath = (start: Article, end: Article) => {
    console.log('Finding path from', start.title, 'to', end.title)
    // Placeholder for Phase 2 - path finding logic
    setPathFound(true)
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <div className="flex flex-col items-center justify-start py-8 px-4 sm:py-16">
        {/* Header */}
        <div className="text-center mb-12 max-w-2xl">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-black dark:text-white mb-4">
            Wikipedia Path Finder
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Find the shortest path between any two Wikipedia articles by following the links that connect them.
          </p>
        </div>

        {/* Main Content */}
        <div className="w-full max-w-4xl px-4 sm:px-8">
          <PathFinderForm onFindPath={handleFindPath} />
        </div>

        {/* Results Placeholder */}
        {pathFound && (
          <div className="w-full max-w-4xl px-4 sm:px-8 mt-16">
            <div className="p-8 bg-gray-50 dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800">
              <p className="text-center text-gray-600 dark:text-gray-400">
                Path results will appear here (Phase 2)
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
