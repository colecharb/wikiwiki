# Ollama Setup & Connection Guide

## Status Check

✅ **Ollama is running** at `http://localhost:11434`
✅ **Mistral model available** (4.4GB, perfect for similarity scoring)
✅ **Additional models available**: qwen3:4b, embeddinggemma:latest

## Quick Start

### 1. Verify Ollama is Running

Ollama should already be running. Verify with:
```bash
curl http://localhost:11434/api/tags
```

You should see a JSON response listing available models.

### 2. Start Ollama (if not running)

On macOS, Ollama runs as a background service. To start it:

**Option A: From Terminal**
```bash
ollama serve
```

**Option B: Via Spotlight**
- Press `Cmd + Space`
- Type "Ollama" 
- Press Enter to launch

**Option C: From Applications**
- Open Applications → Utilities → Ollama

### 3. Verify Mistral Model

Make sure Mistral is downloaded:
```bash
curl http://localhost:11434/api/tags | jq '.models[].name'
```

You should see `mistral:latest` in the output.

If Mistral is not listed, download it:
```bash
ollama pull mistral
```

## Connection Troubleshooting

### Issue 1: "Failed to connect to Ollama"

**Symptom**: Error message when trying to use A* algorithm

**Solution**:
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# If connection refused, start Ollama
ollama serve
```

### Issue 2: Model not found (mistral)

**Symptom**: "Ollama model 'mistral' not found" warning

**Solution**:
```bash
# Download Mistral (takes 5-10 minutes first time)
ollama pull mistral

# Verify it's installed
curl http://localhost:11434/api/tags | grep mistral
```

### Issue 3: Connection timeout

**Symptom**: A* search times out when scoring similarity

**This is normal for large searches**. The 10-second timeout per batch is conservative. If you see this:

1. Try with articles closer together
2. Try with fewer links (use disambiguation filter)
3. Increase overall timeout in code:
```typescript
const result = await findPathBetweenArticles('A', 'B', {
  algorithm: 'a*',
  timeout: 120000, // 2 minutes instead of 60 seconds
})
```

### Issue 4: Port already in use (11434)

**Symptom**: "Address already in use" when starting Ollama

**Solution**: Ollama may already be running. Check:
```bash
# See what's using port 11434
lsof -i :11434

# Or just try to connect (Ollama is likely fine)
curl http://localhost:11434/api/tags
```

### Issue 5: Performance is slow

**Symptom**: A* search is slower than expected

**This could be normal**. A* makes Ollama API calls for each batch of links. Performance depends on:
- Number of articles to score
- System load
- Mistral model performance
- Article extract length

**Tips to improve**:
```bash
# Use faster quantization of Mistral (lighter model)
ollama pull mistral:7b

# Or try a smaller, faster model
ollama pull neural-chat  # Smaller alternative
```

## Advanced Configuration

### Custom Ollama Server URL

If Ollama is on a different machine:

```typescript
const result = await findPathBetweenArticles('Albert Einstein', 'Philosophy', {
  algorithm: 'a*',
  ollamaUrl: 'http://192.168.1.100:11434', // Your server IP
  ollamaModel: 'mistral',
})
```

### Using a Different Model

Ollama supports many models. You can use any installed model:

```typescript
// Using neural-chat (smaller, faster)
const result = await findPathBetweenArticles('A', 'B', {
  algorithm: 'a*',
  ollamaModel: 'neural-chat',
})
```

**Available models on your system**:
```
mistral:latest        - Recommended, balanced (7.2B)
qwen3:4b              - Smaller, faster (4.0B)
embeddinggemma:latest - Embeddings only, not for this task
```

### Model Selection Guide

| Model | Size | Speed | Quality | Recommendation |
|-------|------|-------|---------|---|
| mistral:latest | 4.4GB | Medium | Excellent | ✅ Default |
| qwen3:4b | 2.5GB | Fast | Good | Use if mistral is slow |
| neural-chat | 4.7GB | Medium | Good | Alternative option |
| dolphin-mixtral | 26GB | Slow | Excellent | Only if you have resources |

## Testing Connection in Code

### Quick Test Script

Create a test file to verify your setup:

```typescript
// test-ollama.ts
import { OllamaClient } from '@/app/lib/ollama'

async function testOllama() {
  console.log('Testing Ollama connection...')
  
  try {
    const ollama = new OllamaClient()
    console.log('✓ OllamaClient created')
    
    await ollama.healthCheck()
    console.log('✓ Health check passed - Ollama is running!')
    
    // Test similarity scoring
    const scores = await ollama.batchScoreSimilarity(
      [
        { title: 'Physics', extract: 'Physics is a natural science...' },
        { title: 'Biology', extract: 'Biology is the science of life...' },
      ],
      'Science',
      10000
    )
    
    console.log('✓ Similarity scoring works!')
    console.log('  Scores:', Object.fromEntries(scores))
    
  } catch (error) {
    console.error('✗ Error:', error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

testOllama()
```

### Run the Test

```bash
# Using Node.js with TypeScript support
npx ts-node test-ollama.ts
```

Expected output:
```
Testing Ollama connection...
✓ OllamaClient created
✓ Health check passed - Ollama is running!
✓ Similarity scoring works!
  Scores: { Physics: 85, Biology: 35 }
```

## Browser Connection Issues

### Issue: Connection refused in browser

If you see connection errors when running A* in the browser:

**Root cause**: Browser can't connect to `http://localhost:11434` due to:
1. CORS restrictions (cross-origin)
2. Ollama not accessible from browser context
3. Different port/host

**Solution**: Create a proxy endpoint in your Next.js API

Create `app/api/ollama/proxy/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Forward request to local Ollama
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw new Error(`Ollama returned ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
```

Then update `OllamaClient` to use this proxy:

```typescript
const ollama = new OllamaClient('http://localhost:3000/api/ollama/proxy')
```

## Performance Optimization

### Faster Scoring

1. **Use lighter model**:
```bash
ollama pull mistral:4b  # Smaller variant if available
```

2. **Reduce extract length** in OllamaClient prompt (line ~90):
```typescript
// Change from 200 chars to 100
.map((c) => `- **${c.title}**: ${c.extract.substring(0, 100)}...`)
```

3. **Lower temperature** (already at 0.3, lowest safe value)

4. **Increase timeout** if you're getting timeouts:
```typescript
// In OllamaClient.batchScoreSimilarity()
signal: AbortSignal.timeout(15000) // 15 seconds instead of 10
```

### Memory Usage

On macOS, Ollama uses GPU acceleration by default. If you see memory issues:

1. **Check GPU usage**:
```bash
system_profiler SPDisplaysDataType
```

2. **Limit GPU memory** (create/edit `~/.ollama/models/config.json`):
```json
{
  "gpu_memory": 4000 // MB
}
```

3. **Restart Ollama** after config change

## Monitoring & Debugging

### View Ollama Logs

On macOS:
```bash
log stream --predicate 'process == "ollama"' --level debug
```

### Check System Resources

```bash
# CPU and Memory usage
top -l 1 | head -15

# GPU usage (on M-series Macs)
powermetrics --samplers gpu_power -n 1
```

### Test Specific Model Performance

```bash
# Measure response time for mistral
time curl -X POST http://localhost:11434/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "model": "mistral",
    "prompt": "What is physics?",
    "stream": false
  }'
```

## Environment Variables (Optional)

You can set Ollama behavior via environment variables:

```bash
# Set GPU to CPU only (slower but lighter)
export OLLAMA_NUM_GPU=0

# Set number of threads
export OLLAMA_NUM_THREAD=4

# Start Ollama with custom settings
OLLAMA_NUM_GPU=0 ollama serve
```

## Next Steps

1. ✅ Verify Ollama is running
   ```bash
   curl http://localhost:11434/api/tags
   ```

2. ✅ Verify Mistral is available
   ```bash
   ollama list
   ```

3. ✅ Start using A* in the app
   - Open the app
   - Select "A* with Ollama" from algorithm dropdown
   - Try a pathfinding query

4. (Optional) Monitor performance
   - Watch the console for any errors
   - Check response times
   - Adjust timeout if needed

## Getting Help

If you still have issues, provide:
1. Output of `curl http://localhost:11434/api/tags`
2. Error message from browser console (F12)
3. Error message from terminal where Ollama is running
4. Your system info: `uname -a`

Then I can help debug further!
