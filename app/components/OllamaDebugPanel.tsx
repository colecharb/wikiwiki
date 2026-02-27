'use client'

import { useState } from 'react'
import { diagnoseOllama, formatDiagnosisReport, testOllamaAPI } from '@/app/lib/ollama-debug'

export default function OllamaDebugPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [diagnosticsReport, setDiagnosticsReport] = useState<string>('')
  const [testResult, setTestResult] = useState<string>('')

  const handleRunDiagnostics = async () => {
    setIsLoading(true)
    try {
      const info = await diagnoseOllama('http://localhost:11434', 'mistral')
      const report = formatDiagnosisReport(info)
      setDiagnosticsReport(report)
    } catch (error) {
      setDiagnosticsReport(
        `Error running diagnostics: ${error instanceof Error ? error.message : String(error)}`
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleTestAPI = async () => {
    setIsLoading(true)
    try {
      const result = await testOllamaAPI('http://localhost:11434', 'mistral')
      const message =
        `Test ${result.success ? '✅ PASSED' : '❌ FAILED'}\n` +
        `Response time: ${result.responseTime}ms\n` +
        (result.error ? `Error: ${result.error}` : 'API is responding normally')
      setTestResult(message)
    } catch (error) {
      setTestResult(
        `Error running test: ${error instanceof Error ? error.message : String(error)}`
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      {/* Debug Button - Fixed Position */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded-lg transition-colors z-50"
        title="Open Ollama Debug Panel"
      >
        🔧 Ollama Debug
      </button>

      {/* Debug Panel - Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl max-w-2xl w-full max-h-96 flex flex-col">
            {/* Header */}
            <div className="border-b border-gray-200 dark:border-zinc-700 p-4 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Ollama Debug Panel</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl"
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Diagnostics Section */}
              <div>
                <button
                  onClick={handleRunDiagnostics}
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Running...' : 'Run Diagnostics'}
                </button>

                {diagnosticsReport && (
                  <pre className="mt-3 p-3 bg-gray-100 dark:bg-zinc-800 rounded text-xs text-gray-700 dark:text-gray-300 overflow-x-auto font-mono">
                    {diagnosticsReport}
                  </pre>
                )}
              </div>

              {/* Test API Section */}
              <div className="border-t border-gray-200 dark:border-zinc-700 pt-4">
                <button
                  onClick={handleTestAPI}
                  disabled={isLoading}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Testing...' : 'Test API Connection'}
                </button>

                {testResult && (
                  <pre className="mt-3 p-3 bg-gray-100 dark:bg-zinc-800 rounded text-xs text-gray-700 dark:text-gray-300 font-mono whitespace-pre-wrap">
                    {testResult}
                  </pre>
                )}
              </div>

              {/* Quick Links */}
              <div className="border-t border-gray-200 dark:border-zinc-700 pt-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Quick Actions:</p>
                <div className="space-y-2 text-xs">
                  <p>
                    <strong>Start Ollama:</strong>{' '}
                    <code className="bg-gray-100 dark:bg-zinc-800 px-2 py-1 rounded">
                      ollama serve
                    </code>
                  </p>
                  <p>
                    <strong>Download Mistral:</strong>{' '}
                    <code className="bg-gray-100 dark:bg-zinc-800 px-2 py-1 rounded">
                      ollama pull mistral
                    </code>
                  </p>
                  <p>
                    <strong>List Models:</strong>{' '}
                    <code className="bg-gray-100 dark:bg-zinc-800 px-2 py-1 rounded">
                      ollama list
                    </code>
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 dark:border-zinc-700 p-4 flex justify-end">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-gray-900 dark:text-white text-sm font-medium rounded transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
