/**
 * Ollama client for semantic similarity scoring
 * Communicates with local Ollama instance to score semantic similarity
 * between Wikipedia articles using Mistral model
 */

/**
 * Custom error class for Ollama connection issues
 */
export class OllamaConnectionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'OllamaConnectionError'
  }
}

/**
 * Custom error class for Ollama timeouts
 */
export class OllamaTimeoutError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'OllamaTimeoutError'
  }
}

/**
 * Custom error class for invalid Ollama responses
 */
export class OllamaResponseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'OllamaResponseError'
  }
}

interface OllamaCandidateArticle {
  title: string
  extract: string
}

/**
 * Client for communicating with local Ollama instance
 * Provides semantic similarity scoring for Wikipedia articles
 */
export class OllamaClient {
  private ollamaUrl: string
  private ollamaModel: string
  private isHealthy: boolean = false

  constructor(
    ollamaUrl: string = 'http://localhost:11434',
    ollamaModel: string = 'mistral'
  ) {
    this.ollamaUrl = ollamaUrl.replace(/\/$/, '') // Remove trailing slash
    this.ollamaModel = ollamaModel
    
    // Log connection details for debugging
    if (typeof window !== 'undefined') {
      console.debug(`[OllamaClient] Connecting to ${this.ollamaUrl} with model ${this.ollamaModel}`)
    }
  }

  /**
   * Health check to verify Ollama is running and accessible
   */
  async healthCheck(): Promise<void> {
    try {
      const response = await fetch(`${this.ollamaUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000), // 5 second timeout for health check
      })

      if (!response.ok) {
        throw new OllamaConnectionError(
          `Ollama health check failed with status ${response.status}`
        )
      }

      const data = (await response.json()) as { models?: Array<{ name: string }> }

      // Check if the desired model is available
      if (data.models && !data.models.some((m) => m.name.includes(this.ollamaModel))) {
        const availableModels = data.models.map((m) => m.name).join(', ')
        const errorMsg =
          `Ollama model '${this.ollamaModel}' not found.\n` +
          `Available models: ${availableModels}\n` +
          `To download: ollama pull ${this.ollamaModel}`
        
        console.warn(`[OllamaClient] ${errorMsg}`)
        throw new OllamaConnectionError(errorMsg)
      }

      this.isHealthy = true
      if (typeof window !== 'undefined') {
        console.debug(`[OllamaClient] Health check passed ✓`)
      }
    } catch (error) {
      if (error instanceof OllamaConnectionError) {
        throw error
      }

      // Provide more helpful error messages based on error type
      let message = `Failed to connect to Ollama at ${this.ollamaUrl}`

      if (error instanceof Error) {
        if (error.message.includes('fetch failed')) {
          message +=
            `\n\nOllama is not running or not accessible.\n` +
            `To start Ollama, run: ollama serve\n` +
            `or launch the Ollama app from Applications.`
        } else if (error.message.includes('timeout')) {
          message += `\n\nOllama took too long to respond. It may be overloaded.`
        } else if (error.message.includes('ECONNREFUSED')) {
          message +=
            `\n\nConnection refused. Make sure Ollama is running:\n` +
            `  1. Open Terminal\n` +
            `  2. Run: ollama serve\n` +
            `  3. Keep the terminal window open`
        }
        message += `\n\nError: ${error.message}`
      }

      throw new OllamaConnectionError(message)
    }
  }

  /**
   * Score semantic similarity of candidate articles to target
   * Batch process all candidates in a single Ollama call
   *
   * @param candidates Array of articles with title and extract
   * @param targetTitle The target article we're trying to reach
   * @param timeout Timeout in ms for the Ollama call (default: 30000)
   * @returns Map of title -> similarity score (0-100)
   */
  async batchScoreSimilarity(
    candidates: OllamaCandidateArticle[],
    targetTitle: string,
    timeout: number = 30000
  ): Promise<Map<string, number>> {
    if (candidates.length === 0) {
      return new Map()
    }

    try {
      // Format candidates for the prompt
      const candidatesText = candidates
        .map((c) => `- **${c.title}**: ${c.extract.substring(0, 200)}...`)
        .join('\n')

      const prompt = `You are a semantic similarity expert analyzing Wikipedia articles to find the shortest path between topics.

Target Article: **${targetTitle}**

Rate how semantically similar each of these candidate articles is to helping reach the target (0-100, where 100 is perfect match):

${candidatesText}

Return ONLY a valid JSON object with no markdown formatting, like this:
{"Article Title 1": 85, "Article Title 2": 42}

Consider conceptual relatedness, topic overlap, and semantic proximity. Be precise with the JSON format.`

      const response = await fetch(`${this.ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.ollamaModel,
          prompt,
          stream: false,
          temperature: 0.3, // Lower temperature for more consistent scores
          num_predict: 500, // Limit response length
        }),
        signal: AbortSignal.timeout(timeout),
      })

      if (!response.ok) {
        throw new OllamaConnectionError(
          `Ollama API returned status ${response.status}: ${response.statusText}`
        )
      }

      const data = (await response.json()) as { response: string }
      const responseText = data.response.trim()

      // Extract JSON from response (it might have extra text)
      const jsonMatch = responseText.match(/\{[^{}]*\}/)
      if (!jsonMatch) {
        throw new OllamaResponseError(`Could not parse JSON from Ollama response: ${responseText}`)
      }

      const scores = JSON.parse(jsonMatch[0]) as Record<string, number>
      const result = new Map<string, number>()

      // Validate and normalize scores
      for (const candidate of candidates) {
        let score = scores[candidate.title]

        // Handle missing or invalid scores
        if (score === undefined || typeof score !== 'number') {
          score = 50 // Default to neutral score
        }

        // Clamp to 0-100 range
        score = Math.max(0, Math.min(100, score))

        result.set(candidate.title, score)
      }

      return result
    } catch (error) {
      // Handle timeout
      if (error instanceof Error && error.name === 'AbortError') {
        throw new OllamaTimeoutError(
          `Ollama similarity scoring exceeded ${timeout}ms timeout. ` +
          `Try with simpler articles or increase timeout.`
        )
      }

      // Re-throw custom errors
      if (error instanceof OllamaConnectionError || error instanceof OllamaResponseError) {
        throw error
      }

      // Handle fetch errors
      if (error instanceof Error) {
        let message = `Ollama request failed`

        if (error.message.includes('fetch failed')) {
          message +=
            `\n\nOllama is not responding.\n` +
            `Make sure: ollama serve is running`
        } else if (error.message.includes('ECONNREFUSED')) {
          message += `\n\nConnection refused. Ollama may not be running.`
        } else {
          message += `\n\n${error.message}`
        }

        throw new OllamaConnectionError(message)
      }

      throw new OllamaConnectionError(
        `Ollama request failed: ${String(error)}`
      )
    }
  }
}
