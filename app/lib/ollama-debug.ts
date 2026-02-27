/**
 * Ollama debugging utilities
 * Helps diagnose connection and configuration issues
 */

export interface OllamaDebugInfo {
  isRunning: boolean
  url: string
  statusCode?: number
  models: string[]
  desiredModel: string
  modelFound: boolean
  errorMessage?: string
  recommendations: string[]
}

/**
 * Comprehensive Ollama health diagnosis
 */
export async function diagnoseOllama(
  ollamaUrl: string = 'http://localhost:11434',
  desiredModel: string = 'nomic-embed-text'
): Promise<OllamaDebugInfo> {
  const info: OllamaDebugInfo = {
    isRunning: false,
    url: ollamaUrl,
    models: [],
    desiredModel,
    modelFound: false,
    recommendations: [],
  }

  try {
    // Test basic connectivity
    const response = await fetch(`${ollamaUrl}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    })

    info.statusCode = response.status

    if (!response.ok) {
      info.errorMessage = `HTTP ${response.status}: ${response.statusText}`
      info.recommendations.push(`Ollama returned error status: ${response.status}`)
      return info
    }

    const data = (await response.json()) as { models?: Array<{ name: string }> }
    info.isRunning = true

    if (data.models) {
      info.models = data.models.map((m) => m.name)
      info.modelFound = info.models.some((m) => m.includes(desiredModel))
    }

    // Generate recommendations
    if (info.models.length === 0) {
      info.recommendations.push(`No models found. Download one with: ollama pull ${desiredModel}`)
    }

    if (!info.modelFound) {
      info.recommendations.push(
        `Model '${desiredModel}' not found. Available: ${info.models.join(', ')}`
      )
      info.recommendations.push(`Download it with: ollama pull ${desiredModel}`)
    } else {
      info.recommendations.push(`✓ ${desiredModel} is available`)
    }
  } catch (error) {
    info.isRunning = false

    if (error instanceof Error) {
      info.errorMessage = error.message

      if (error.name === 'AbortError' || error.message.includes('timeout')) {
        info.recommendations.push('Ollama is responding but slowly. It may be overloaded.')
        info.recommendations.push('Try again in a moment or restart Ollama.')
      } else if (
        error.message.includes('fetch failed') ||
        error.message.includes('ECONNREFUSED') ||
        error.message.includes('Failed to fetch')
      ) {
        info.recommendations.push(`Ollama is not running at ${ollamaUrl}`)
        info.recommendations.push('Start Ollama with: ollama serve')
        info.recommendations.push('Or launch the Ollama app from Applications')
      } else if (error.message.includes('ENOTFOUND')) {
        info.recommendations.push(`Cannot resolve ${ollamaUrl}`)
        info.recommendations.push('Check the URL is correct')
        info.recommendations.push('For local Ollama use: http://localhost:11434')
      }
    }
  }

  return info
}

/**
 * Format diagnosis info for display
 */
export function formatDiagnosisReport(info: OllamaDebugInfo): string {
  const lines: string[] = [
    '═══════════════════════════════════════════════',
    '  OLLAMA DIAGNOSIS REPORT',
    '═══════════════════════════════════════════════',
    '',
    `Status: ${info.isRunning ? '✅ RUNNING' : '❌ NOT RUNNING'}`,
    `URL: ${info.url}`,
  ]

  if (info.statusCode !== undefined) {
    lines.push(`HTTP Status: ${info.statusCode}`)
  }

  if (info.errorMessage) {
    lines.push(`Error: ${info.errorMessage}`)
  }

  lines.push('')
  lines.push(`Available Models: ${info.models.length > 0 ? info.models.join(', ') : 'None found'}`)
  lines.push(
    `Desired Model: ${info.desiredModel} (${info.modelFound ? '✅ Found' : '❌ Not found'})`
  )

  if (info.recommendations.length > 0) {
    lines.push('')
    lines.push('RECOMMENDATIONS:')
    info.recommendations.forEach((rec, i) => {
      lines.push(`  ${i + 1}. ${rec}`)
    })
  }

  lines.push('')
  lines.push('═══════════════════════════════════════════════')

  return lines.join('\n')
}

/**
 * Log diagnosis to console
 */
export async function logOllamaDiagnosis(
  ollamaUrl?: string,
  desiredModel?: string
): Promise<void> {
  const info = await diagnoseOllama(ollamaUrl, desiredModel)
  const report = formatDiagnosisReport(info)
  console.log(report)
}

/**
 * Quick test of Ollama API
 */
export async function testOllamaAPI(
  ollamaUrl: string = 'http://localhost:11434',
  model: string = 'nomic-embed-text'
): Promise<{ success: boolean; responseTime: number; error?: string }> {
  const startTime = Date.now()

  try {
    const response = await fetch(`${ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        prompt: 'Say hello',
        stream: false,
      }),
      signal: AbortSignal.timeout(10000),
    })

    const responseTime = Date.now() - startTime

    if (!response.ok) {
      return {
        success: false,
        responseTime,
        error: `HTTP ${response.status}`,
      }
    }

    return {
      success: true,
      responseTime,
    }
  } catch (error) {
    const responseTime = Date.now() - startTime
    return {
      success: false,
      responseTime,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}
