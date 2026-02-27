'use client'

export default function PathPlaceholder() {
  return (
    <div className="w-full space-y-4">
      {/* Title */}
      <div className="text-lg font-semibold text-gray-900 dark:text-white">
        Your path will appear here
      </div>

      {/* Placeholder content */}
      <div className="space-y-4 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-2 border-dashed border-blue-300 dark:border-blue-800 rounded-lg text-center">
        <div className="text-4xl mb-4">🔍</div>
        
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No path found yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Select two Wikipedia articles and click "Find Shortest Path" to see the connection between them.
          </p>
        </div>

        <div className="pt-4 border-t border-blue-200 dark:border-blue-800">
          <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
            <div className="flex items-start gap-3">
              <span className="text-lg flex-shrink-0">1️⃣</span>
              <span>Search for your starting article in the left field</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-lg flex-shrink-0">2️⃣</span>
              <span>Search for your target article in the right field</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-lg flex-shrink-0">3️⃣</span>
              <span>Click "Find Shortest Path" to discover the connection</span>
            </div>
          </div>
        </div>

        <div className="pt-4 text-xs text-gray-500 dark:text-gray-500">
          Try connecting completely unrelated topics—you might be surprised how close they are!
        </div>
      </div>
    </div>
  )
}
