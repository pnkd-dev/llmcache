# llmcache

Cache LLM responses locally. Save tokens, save money.

## Install

```bash
npm install -g llmcache
```

## Usage

```bash
# Initialize cache in current directory
llmcache init

# Cache a response (pipe response through stdin)
echo "The answer is 4" | llmcache set "What is 2+2?" --model gpt-4

# Get cached response
llmcache get "What is 2+2?" --model gpt-4

# List cached prompts
llmcache list
llmcache ls

# Show cache stats
llmcache stats

# Search cache
llmcache search "python"

# Clear cache
llmcache clear
llmcache clear --older-than 7d

# Export cache as JSON
llmcache export > backup.json

# Help
llmcache --help
```

## Output

```
$ llmcache stats
  llmcache stats
  ──────────────
  Entries:      42
  Total hits:   156
  Tokens saved: ~12,400
  Cache size:   284 KB

$ llmcache list
  HASH        MODEL       HITS  PROMPT
  a1b2c3d4e5  gpt-4         12  What is the capital of...
  f6g7h8i9j0  claude         5  Explain quantum...

$ llmcache get "What is 2+2?" --model gpt-4
  [HIT] Found cached response
  4
```

## How it works

1. `llmcache init` creates a `.llmcache/` directory
2. Prompts are hashed with SHA256 (model + prompt)
3. Responses are stored in `index.json`
4. Cache hits are tracked for stats

## License

MIT

---

pnkd.dev - glitch the system
