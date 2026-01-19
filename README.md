# llmcache

Cache LLM responses. Save tokens, save money.

[![npm version](https://badge.fury.io/js/pnkd-llmcache.svg)](https://www.npmjs.com/package/pnkd-llmcache)

## Installation

```bash
npm install -g pnkd-llmcache
```

## Quick Start

```bash
# Initialize cache
llmcache init

# Cache a response
llmcache set "What is AI?" "AI is artificial intelligence..."

# Get cached response
llmcache get "What is AI?"

# View statistics
llmcache stats
```

## Commands

### FREE Commands

| Command | Description |
|---------|-------------|
| `init` | Initialize a new cache |
| `set <prompt> <response>` | Cache a prompt/response pair |
| `get <prompt>` | Get cached response |
| `list` | List cached entries |
| `stats` | Show cache statistics |
| `clear` | Clear cache entries |
| `search <query>` | Search cached prompts |
| `export [file]` | Export cache to JSON |
| `import <file>` | Import cache from JSON |

### PRO Commands

| Command | Description |
|---------|-------------|
| `cost` | Show cost savings report |
| `similar <prompt>` | Find similar cached prompts |
| `sync <action>` | Sync cache between machines |
| `serve` | Start HTTP server |

## Options

### Global Options

- `-g, --global` - Use global cache (~/.llmcache/cache)
- `-p, --path <path>` - Custom cache path

### Set Options

- `-m, --model <name>` - Model name (default: "default")
- `-t, --ttl <duration>` - Time to live (PRO): 7d, 24h, 30m
- `--tags <tags>` - Comma-separated tags (PRO)

### Get Options

- `-m, --model <name>` - Model name (default: "default")
- `-r, --raw` - Output only the response
- `-o, --output <file>` - Write response to file

## Using Files

Use `@` prefix to read from files:

```bash
llmcache set @prompt.txt @response.txt
llmcache get @prompt.txt
```

## FREE vs PRO

| Feature | FREE | PRO |
|---------|------|-----|
| Cache entries | 50 max | Unlimited |
| Response size | 10KB | 10MB |
| Storage backend | JSON | JSON, SQLite, Redis |
| Cost tracking | - | Yes |
| Semantic search | - | Yes |
| Compression | - | Yes |
| HTTP server | - | Yes |
| Team sync | - | Yes |
| TTL expiration | - | Yes |

## PRO License

**$18.99** one-time payment

Purchase at: https://pnkd.dev/llmcache

```bash
# Activate license
llmcache license activate LMC-XXXX-XXXX-XXXX-XXXX

# Check status
llmcache license status
```

## Programmatic API

```javascript
const llmcache = require('pnkd-llmcache');

// Initialize
llmcache.init();

// Cache response
llmcache.set('What is AI?', 'AI is...', 'gpt-4');

// Get cached response
const result = llmcache.get('What is AI?', 'gpt-4');
if (result) {
  console.log(result.response);
}

// Get stats
const stats = llmcache.stats();
console.log(`Entries: ${stats.entries}`);
```

## HTTP Server (PRO)

```bash
llmcache serve --port 3377
```

### Endpoints

- `GET /health` - Health check
- `GET /cache?prompt=...&model=...` - Get cached response
- `POST /cache` - Set cache entry (JSON body)
- `GET /cache/list` - List entries
- `GET /cache/search?q=...` - Search entries
- `GET /stats` - Get statistics

## More PRO Tools

- **[ctxstuff PRO](https://pnkd.dev/ctxstuff)** - Pack code for LLMs ($14.99)
- **[aiproxy PRO](https://pnkd.dev/aiproxy)** - One API for all LLMs ($18.99)

## Support

- Issues: https://github.com/pnkd-dev/llmcache/issues
- Website: https://pnkd.dev/llmcache

## License

MIT - pnkd.dev
