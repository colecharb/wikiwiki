'use client'

interface PathStatsProps {
  distance: number
  startTitle: string
  endTitle: string
  duration: number
  algorithm: 'bfs' | 'dijkstra' | 'a*'
}

export default function PathStats({
  distance,
  startTitle,
  endTitle,
  duration,
  algorithm,
}: PathStatsProps) {
  const formatDuration = (ms: number): string => {
    if (ms < 1000) {
      return `${ms.toFixed(0)}ms`
    }
    return `${(ms / 1000).toFixed(2)}s`
  }

  const algorithmLabel =
    algorithm === 'bfs' ? 'BFS' : algorithm === 'dijkstra' ? "Dijkstra's" : 'A* (Ollama)'

  return (
    <div className="w-full p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border border-blue-200 dark:border-blue-800 rounded-lg">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Hops */}
        <div>
          <div className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">
            Hops
          </div>
          <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
            {distance}
          </div>
        </div>

        {/* From-To */}
        <div className="col-span-2 md:col-span-1">
          <div className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">
            Path
          </div>
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
            {startTitle.length + endTitle.length > 40
              ? `${startTitle.substring(0, 15)}... → ...${endTitle.substring(-15)}`
              : `${startTitle} → ${endTitle}`}
          </div>
        </div>

        {/* Algorithm */}
        <div>
          <div className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">
            Algorithm
          </div>
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {algorithmLabel}
          </div>
        </div>

        {/* Duration */}
        <div>
          <div className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">
            Time
          </div>
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {formatDuration(duration)}
          </div>
        </div>
      </div>
    </div>
  )
}
