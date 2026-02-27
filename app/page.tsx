'use client'

import ResultsContainer from './components/ResultsContainer'

export default function Home() {
  return (
    <div className="min-h-screen bg-white dark:bg-black flex flex-col items-center justify-center px-4">
      {/* Header */}
      <div className="w-full text-center mb-12 max-w-full">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-black dark:text-white mb-4">
          Wikipedia Path Finder
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 mx-auto max-w-2xl">
          Find the shortest path between any two Wikipedia articles by following the links that connect them.
        </p>
      </div>

      {/* Main Content */}
      <div className="w-full max-w-6xl">
        <ResultsContainer />
      </div>
    </div>
  )
}
