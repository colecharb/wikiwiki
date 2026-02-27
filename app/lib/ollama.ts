/**
 * Ollama client for semantic similarity scoring via embeddings
 * Uses snowflake-arctic-embed:xs model for semantic similarity calculations
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
 * Uses cosine similarity between snowflake-arctic-embed:xs embeddings
 */
export class OllamaClient {
  private ollamaUrl: string
  private embeddingModel: string
  private isHealthy: boolean = false
  private embeddingCache: Map<string, number[]> = new Map()

  constructor(
    ollamaUrl: string = 'http://localhost:11434',
    embeddingModel: string = 'snowflake-arctic-embed:xs'
  ) {
    this.ollamaUrl = ollamaUrl.replace(/\/$/, '') // Remove trailing slash
    this.embeddingModel = embeddingModel
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

         throw new OllamaConnectionError(errorMsg)
      }

       this.isHealthy = true
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
      // Ollama embed API expects input as array or string
      // Using array format for consistency
      const requestBody = {
        model: this.embeddingModel,
        prompt: text,  // Use 'prompt' field, not 'input' array
      }
      
      const requestBodyJson = JSON.stringify(requestBody)
      
      const response = await fetch(`${this.ollamaUrl}/api/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: requestBodyJson,
        signal: AbortSignal.timeout(timeout),
      })

      if (!response.ok) {
        throw new OllamaConnectionError(
          `Ollama embed API returned status ${response.status}: ${response.statusText}`
        )
      }

       const data = (await response.json()) as any

         // Ollama /api/embeddings endpoint returns { embedding: [...] }
         let embedding: number[] | null = null
         
         if (data.embedding && Array.isArray(data.embedding)) {
           // Format: { embedding: [...] }
           embedding = data.embedding
        } else {
          throw new OllamaResponseError('Ollama response missing "embedding" field')
        }
        
        if (!embedding) {
          throw new OllamaResponseError('No valid embedding format found in Ollama response')
        }
        
        if (!embedding || embedding.length === 0) {
          throw new OllamaResponseError(`Ollama returned empty embedding for "${text}"`)
        }
        
          // Validate all values in embedding are finite numbers
          if (embedding.some((v: number) => !isFinite(v))) {
            throw new OllamaResponseError(`Ollama returned invalid embedding with NaN/Infinity values for "${text}"`)
          }
           
           // Create a defensive copy to avoid mutations
           const embeddingCopy = Array.from(embedding)
           
           // Cache the embedding
           this.embeddingCache.set(text, embeddingCopy)
           return embeddingCopy
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

    // Validate vectors don't contain NaN or Infinity
    if (a.some((v: number) => !isFinite(v)) || b.some((v: number) => !isFinite(v))) {
      return 0
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

    const similarity = dotProduct / (normA * normB)
    
    // Handle NaN result (shouldn't happen with above validation, but safety check)
    if (!isFinite(similarity)) {
      return 0
    }

    return similarity
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
      // Get target embedding once (30 second individual timeout)
      let targetEmbedding: number[] | null = null
      try {
        targetEmbedding = await this.getEmbedding(targetTitle, 30000)
      } catch (error) {
        // If target embedding fails, continue with neutral scores
      }

      // Process candidates in smaller batches (max 5 at a time) to avoid overloading Ollama
      const BATCH_SIZE = 5
      const embeddings: (number[] | null)[] = []
      
       for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
          const batch = candidates.slice(i, i + BATCH_SIZE)
          
           // Get embeddings for this batch in parallel
           // Each individual embedding gets 30 second timeout (reasonable per request)
           // Only use title for embedding, ignore extract
           const batchEmbeddings = await Promise.all(
             batch.map((candidate) =>
               this.getEmbedding(candidate.title, 30000).catch(
                () => null
              )
            )
          )
          
          embeddings.push(...batchEmbeddings)
       }

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
