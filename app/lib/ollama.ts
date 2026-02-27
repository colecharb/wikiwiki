/**
 * Ollama client for semantic similarity scoring via embeddings
 * Uses nomic-embed-text model for fast, efficient similarity calculations
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

interface EmbeddingResponse {
  embedding: number[]
}

/**
 * Client for communicating with local Ollama instance
 * Provides semantic similarity scoring for Wikipedia articles using embeddings
 * Uses cosine similarity between nomic-embed-text embeddings
 */
export class OllamaClient {
  private ollamaUrl: string
  private embeddingModel: string
  private isHealthy: boolean = false
  private embeddingCache: Map<string, number[]> = new Map()

  constructor(
    ollamaUrl: string = 'http://localhost:11434',
    embeddingModel: string = 'nomic-embed-text'
  ) {
    this.ollamaUrl = ollamaUrl.replace(/\/$/, '') // Remove trailing slash
    this.embeddingModel = embeddingModel

    // Log connection details for debugging
    if (typeof window !== 'undefined') {
      console.debug(
        `[OllamaClient] Connecting to ${this.ollamaUrl} with embedding model ${this.embeddingModel}`
      )
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

      // Check if the desired embedding model is available
      if (
        data.models &&
        !data.models.some((m) => m.name.includes(this.embeddingModel))
      ) {
        const availableModels = data.models.map((m) => m.name).join(', ')
        const errorMsg =
          `Ollama embedding model '${this.embeddingModel}' not found.\n` +
          `Available models: ${availableModels}\n` +
          `To download: ollama pull ${this.embeddingModel}`

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
   * Get embedding for a text string
   * Cached per session to avoid redundant API calls
   */
  private async getEmbedding(text: string, timeout: number = 30000): Promise<number[]> {
    // Check cache first
    const cached = this.embeddingCache.get(text)
    if (cached) {
      return cached
    }

    try {
      const response = await fetch(`${this.ollamaUrl}/api/embed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.embeddingModel,
          input: text,
        }),
        signal: AbortSignal.timeout(timeout),
      })

      if (!response.ok) {
        throw new OllamaConnectionError(
          `Ollama embed API returned status ${response.status}: ${response.statusText}`
        )
      }

      const data = (await response.json()) as { embeddings?: number[][] }

      if (!data.embeddings || data.embeddings.length === 0) {
        throw new OllamaResponseError('No embeddings returned from Ollama')
      }

      const embedding = data.embeddings[0]
      this.embeddingCache.set(text, embedding)
      return embedding
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new OllamaTimeoutError(
          `Embedding request exceeded ${timeout}ms timeout. Text may be too long.`
        )
      }

      if (
        error instanceof OllamaConnectionError ||
        error instanceof OllamaResponseError
      ) {
        throw error
      }

      // Handle fetch errors
      if (error instanceof Error) {
        let message = `Failed to get embeddings from Ollama`

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

      throw new OllamaConnectionError(`Failed to get embeddings: ${String(error)}`)
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length')
    }

    let dotProduct = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i]
      normA += a[i] * a[i]
      normB += b[i] * b[i]
    }

    normA = Math.sqrt(normA)
    normB = Math.sqrt(normB)

    if (normA === 0 || normB === 0) {
      return 0
    }

    return dotProduct / (normA * normB)
  }

  /**
   * Score semantic similarity of candidate articles to target
   * Uses embedding-based cosine similarity (much faster than LLM-based scoring)
   *
   * @param candidates Array of articles with title and extract
   * @param targetTitle The target article we're trying to reach
   * @param timeout Timeout in ms for embedding requests (default: 30000)
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
      // Get target embedding once
      let targetEmbedding: number[] | null = null
      try {
        targetEmbedding = await this.getEmbedding(targetTitle, timeout)
      } catch (error) {
        // If target embedding fails, log warning but continue with neutral scores
        console.warn(
          `[OllamaClient] Failed to get target embedding for "${targetTitle}": ${
            error instanceof Error ? error.message : String(error)
          }. Using neutral scores for all candidates.`
        )
      }

      // Get embeddings for all candidates in parallel
      const embeddings = await Promise.all(
        candidates.map((candidate) =>
          this.getEmbedding(candidate.extract || candidate.title, timeout).catch(
            (error) => {
              console.warn(
                `[OllamaClient] Failed to get embedding for "${candidate.title}": ${
                  error instanceof Error ? error.message : String(error)
                }`
              )
              return null
            }
          )
        )
      )

      // Calculate cosine similarity for each candidate
      const result = new Map<string, number>()
      for (let i = 0; i < candidates.length; i++) {
        const candidateEmbedding = embeddings[i]

        // If either embedding is missing, use neutral score
        if (!targetEmbedding || !candidateEmbedding) {
          result.set(candidates[i].title, 50)
          continue
        }

        // Cosine similarity is -1 to 1, convert to 0-100 scale
        const cosineSim = this.cosineSimilarity(targetEmbedding, candidateEmbedding)
        const score = Math.round(((cosineSim + 1) / 2) * 100) // Map [-1, 1] to [0, 100]

        result.set(candidates[i].title, score)
      }

      return result
    } catch (error) {
      // Handle timeout
      if (error instanceof Error && error.name === 'AbortError') {
        throw new OllamaTimeoutError(
          `Embedding similarity scoring exceeded ${timeout}ms timeout. ` +
          `Try with simpler articles or increase timeout.`
        )
      }

      // Re-throw custom errors
      if (
        error instanceof OllamaConnectionError ||
        error instanceof OllamaResponseError ||
        error instanceof OllamaTimeoutError
      ) {
        throw error
      }

      // Handle fetch errors
      if (error instanceof Error) {
        let message = `Ollama embedding request failed`

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

      throw new OllamaConnectionError(`Ollama embedding request failed: ${String(error)}`)
    }
  }
}
