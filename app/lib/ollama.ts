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

  constructor(
    ollamaUrl: string = 'http://localhost:11434',
    ollamaModel: string = 'mistral'
  ) {
    this.ollamaUrl = ollamaUrl.replace(/\/$/, '') // Remove trailing slash
    this.ollamaModel = ollamaModel
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
        console.warn(
          `Ollama model '${this.ollamaModel}' not found. Available models: ${data.models
            .map((m) => m.name)
            .join(', ')}`
        )
      }
    } catch (error) {
      if (error instanceof OllamaConnectionError) {
        throw error
      }
      throw new OllamaConnectionError(
        `Failed to connect to Ollama at ${this.ollamaUrl}: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    }
  }

  /**
   * Score semantic similarity of candidate articles to target
   * Batch process all candidates in a single Ollama call
   *
   * @param candidates Array of articles with title and extract
   * @param targetTitle The target article we're trying to reach
   * @param timeout Timeout in ms for the Ollama call (default: 10000)
   * @returns Map of title -> similarity score (0-100)
   */
  async batchScoreSimilarity(
    candidates: OllamaCandidateArticle[],
    targetTitle: string,
    timeout: number = 10000
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
      if (error instanceof AbortSignal) {
        throw new OllamaTimeoutError(
          `Ollama similarity scoring exceeded ${timeout}ms timeout`
        )
      }
      if (error instanceof OllamaConnectionError || error instanceof OllamaResponseError) {
        throw error
      }
      if (error instanceof Error && error.name === 'AbortError') {
        throw new OllamaTimeoutError(
          `Ollama similarity scoring exceeded ${timeout}ms timeout`
        )
      }
      throw new OllamaConnectionError(
        `Ollama request failed: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }
}
