# Quick Start Guide - Ollama + A* Pathfinding

## 🚀 Get Started in 3 Steps

### Step 1: Verify Ollama is Running

```bash
# Check if Ollama is already running
curl http://localhost:11434/api/tags
```

If you see a JSON response with models, you're good! Otherwise:

```bash
# Start Ollama
ollama serve
```

### Step 2: Make Sure Mistral is Downloaded

```bash
# Check available models
ollama list

# If mistral is not listed, download it
ollama pull mistral
```

### Step 3: Use A* in the App

1. Open the app in your browser
2. Select **"A* with Ollama"** from the algorithm dropdown
3. Choose start and end articles
4. Click **"Find Shortest Path"**

## 🔧 Troubleshooting

### Connection Issues?

Click the **🔧 Ollama Debug** button in the bottom-right corner of the app. This will:
- Check if Ollama is running
- List available models
- Test the API connection
- Provide recommendations

### Common Issues & Fixes

| Issue | Solution |
|-------|----------|
| "Failed to connect" | Make sure `ollama serve` is running in a terminal |
| "Model not found" | Run `ollama pull mistral` |
| "Connection refused" | Start Ollama with `ollama serve` |
| Slow response | Try with simpler articles or different algorithm |

## 📚 Full Documentation

- **[OLLAMA_SETUP.md](./OLLAMA_SETUP.md)** - Complete Ollama setup and configuration
- **[A_STAR_USAGE.md](./A_STAR_USAGE.md)** - Detailed A* algorithm usage and examples

## 🎯 Algorithm Comparison

| Algorithm | Speed | Quality | Requirements |
|-----------|-------|---------|---|
| **BFS** | ⚡ Fastest | ✓ Good | None |
| **Dijkstra's** | ⚡ Fast | ✓ Good | None |
| **A*** | 🚀 Smart | ✓✓ Better | Ollama |

**BFS** is the default - fast and always works.
**A*** uses semantic similarity to find paths more efficiently.

## 🆘 Need Help?

1. **Open the debug panel** - 🔧 Ollama Debug button
2. **Run diagnostics** - Check your setup
3. **Read the docs** - See OLLAMA_SETUP.md for detailed guidance

## ✅ You're All Set!

Your setup:
- ✅ Ollama is running
- ✅ Mistral model is available
- ✅ App is connected and ready

Start exploring Wikipedia paths! 🌐
