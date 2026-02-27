# Wikipedia Path Finder

Discover connections between Wikipedia articles using multiple pathfinding algorithms: BFS, Dijkstra, or semantic A* with AI-powered embeddings.

## Features

- **Multiple Algorithms**
  - **BFS (Breadth-First Search)**: Fast, guaranteed shortest path
  - **Dijkstra's Algorithm**: Guaranteed shortest path with weighted edges
  - **A* with Ollama**: Semantic pathfinding using AI embeddings for more intelligent navigation

- **Semantic Search** (A* mode)
  - Uses local Ollama embeddings for semantic similarity scoring
  - Intelligently prioritizes semantically related articles
  - Supports multiple embedding models (snowflake-arctic-embed:xs, mxbai-embed-large, etc.)

- **Smart Caching**
  - Session-scoped embedding cache to avoid redundant API calls
  - Link caching for faster repeated searches
  - Optional local storage integration

- **Real-time Progress Tracking**
  - Live visualization of search progress
  - Shows explored articles and their similarity scores
  - Complete search history visible after path is found

- **Dark Mode Support**
  - Full light/dark theme support
  - System preference detection

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Ollama (for A* algorithm)

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Setting up Ollama (for A* algorithm)

1. **Install Ollama**
   ```bash
   # macOS: Download from https://ollama.ai
   # Linux: curl -fsSL https://ollama.ai/install.sh | sh
   ```

2. **Start Ollama service**
   ```bash
   ollama serve
   ```

3. **Download an embedding model**
   ```bash
   # Recommended (lightweight, fast)
   ollama pull snowflake-arctic-embed:xs
   
   # Alternative options
   ollama pull mxbai-embed-large
   ollama pull nomic-embed-text
   ```

4. **Verify Ollama is running**
   - Use the debug panel (🔧 button) to test connection
   - Check available models in the dropdown when A* is selected

## Usage

### Basic Search

1. Select starting and target articles
2. Choose your preferred algorithm:
   - **BFS**: Best for quick, guaranteed shortest paths
   - **Dijkstra**: Alternative shortest path algorithm
   - **A***: Best for semantically meaningful connections (requires Ollama)
3. Click "Find Shortest Path"
4. View results and full search progress

### Using A* Algorithm

1. Select **A* with Ollama** from the algorithm dropdown
2. Choose an embedding model from the dropdown (auto-populated from your local Ollama)
3. Click "Refresh" to reload available models if you've added new ones
4. Start your search

### Customization

- **Include Disambiguation Pages**: Toggle to include/exclude disambiguation pages in results
- **Embedding Model**: Select different models for different search characteristics
- **Timeout**: Searches timeout after 5 minutes by default

## Architecture

### Components

- **PathFinderForm**: User input and algorithm selection
- **PathfindingProgress**: Real-time search progress visualization
- **PathVisualization**: Interactive path display
- **OllamaDebugPanel**: Connection and model diagnostics

### Core Libraries

- **Pathfinding Algorithms**
  - `algorithms/bfs.ts`: Breadth-First Search implementation
  - `algorithms/dijkstra.ts`: Dijkstra's algorithm implementation
  - `algorithms/astar.ts`: A* with semantic heuristic using Ollama embeddings

- **Ollama Integration**
  - `ollama.ts`: Ollama client with embedding caching
  - `ollama-debug.ts`: Diagnostic utilities for Ollama connection

- **Wikipedia Integration**
  - `wikipedia.ts`: Article search and link crawling
  - `crawler.ts`: Link extraction and caching

## Algorithm Comparison

| Algorithm | Speed | Guarantees | Best For |
|-----------|-------|-----------|----------|
| **BFS** | ⚡ Fast | Shortest path | Quick searches, no setup |
| **Dijkstra** | ⚡ Fast | Shortest path | Alternative shortest path |
| **A*** | 🐢 Slower | Semantically meaningful | Finding thematically connected paths |

### A* Specifics

A* is **not guaranteed** to find the shortest path - it's guided by semantic similarity. This means:
- ✅ Finds connections between semantically related articles
- ✅ More intuitive paths (e.g., Snake → Reptile → Biology instead of obscure link chains)
- ❌ May not find the absolute shortest path
- Requires Ollama and embeddings (slower but smarter)

## Development

### Build

```bash
npm run build
```

### Testing

```bash
npm test
```

### Project Structure

```
app/
├── components/          # React components
├── lib/
│   ├── pathfinding/    # Core pathfinding logic
│   │   ├── algorithms/ # BFS, Dijkstra, A*
│   │   ├── types.ts    # Type definitions
│   │   └── progress.ts # Progress tracking
│   ├── wikipedia.ts    # Wikipedia API integration
│   ├── ollama.ts       # Ollama client
│   └── cache.ts        # Caching utilities
└── page.tsx            # Home page
```

## Troubleshooting

### "Ollama is not running"
- Start Ollama: `ollama serve`
- Use the debug panel (🔧) to verify connection

### "No embedding models found"
- Install a model: `ollama pull snowflake-arctic-embed:xs`
- Verify: `ollama list`
- Refresh the model dropdown in the app

### Search takes too long
- Use BFS or Dijkstra instead of A*
- Try with fewer articles (smaller search space)
- Check that Ollama is responsive (debug panel)

### Embedding cache issues
- Cache is per-session; it clears when input articles change
- Each algorithm instance maintains its own cache
- Restart the app to clear all caches

## Performance Notes

- **BFS/Dijkstra**: 100ms - 10s depending on graph distance
- **A* first request**: 500ms - 5s (includes embedding time)
- **A* cached requests**: 100ms - 2s (embedding cache hits)
- Ollama embedding requests: 100-300ms per article

## Technologies

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **APIs**: 
  - Wikipedia MediaWiki API for article links
  - Ollama API for semantic embeddings
- **Algorithms**: BFS, Dijkstra's, A* pathfinding
- **Caching**: Session-scoped Map + Optional LocalStorage

## Contributing

This is a personal project, but improvements welcome!

## License

MIT
