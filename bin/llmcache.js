#!/usr/bin/env node

// pnkd.dev/llmcache - LLM response cache CLI

const cache = require('../src/cache');

const args = process.argv.slice(2);
const command = args[0];

const cyan = '\x1b[36m';
const green = '\x1b[32m';
const yellow = '\x1b[33m';
const dim = '\x1b[2m';
const reset = '\x1b[0m';

function parseArgs(args) {
  const options = { model: 'default' };
  const positional = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--model' || arg === '-m') {
      options.model = args[++i];
    } else if (arg === '--older-than') {
      options.olderThan = args[++i];
    } else if (!arg.startsWith('-')) {
      positional.push(arg);
    }
  }

  return { options, positional };
}

function showHelp() {
  console.log(`
  ${cyan}llmcache${reset} - cache LLM responses. save tokens, save money.

  ${dim}Usage:${reset}
    llmcache <command> [options]

  ${dim}Commands:${reset}
    init                    Initialize cache in current directory
    set                     Cache a response (reads from stdin)
    get <prompt>            Get cached response
    list, ls                List cached entries
    stats                   Show cache statistics
    clear                   Clear all cache
    clear --older-than 7d   Clear entries older than N days
    search <query>          Search cached prompts
    export                  Export cache as JSON

  ${dim}Options:${reset}
    -m, --model <name>      Model name (default: "default")
    -h, --help              Show this help

  ${dim}Examples:${reset}
    llmcache init
    echo "response text" | llmcache set "prompt" --model gpt-4
    llmcache get "prompt" --model gpt-4
    llmcache list
    llmcache search "python"

  ${dim}Docs:${reset}    https://pnkd.dev/llmcache
  ${dim}Issues:${reset}  https://github.com/pnkd-dev/llmcache/issues

  ${cyan}pnkd.dev${reset} ${dim}- glitch the system${reset}
`);
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

async function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');

    if (process.stdin.isTTY) {
      resolve('');
      return;
    }

    process.stdin.on('readable', () => {
      let chunk;
      while ((chunk = process.stdin.read()) !== null) {
        data += chunk;
      }
    });

    process.stdin.on('end', () => {
      resolve(data.trim());
    });
  });
}

async function main() {
  if (!command || command === '--help' || command === '-h') {
    showHelp();
    process.exit(0);
  }

  const { options, positional } = parseArgs(args.slice(1));

  switch (command) {
    case 'init': {
      const result = cache.init();
      if (result.success) {
        console.log(green + '  ✓ Cache initialized at .llmcache/' + reset);
      } else {
        console.log(yellow + '  ! ' + result.message + reset);
      }
      break;
    }

    case 'set': {
      const prompt = positional[0];
      if (!prompt) {
        console.error('  Error: prompt required. Usage: llmcache set "prompt"');
        process.exit(1);
      }
      const response = await readStdin();
      if (!response) {
        console.error('  Error: response required via stdin');
        process.exit(1);
      }
      const result = cache.set(prompt, response, options.model);
      if (result.success) {
        console.log(green + '  ✓ Cached [' + result.hash + ']' + reset);
      } else {
        console.error('  Error: ' + result.message);
        process.exit(1);
      }
      break;
    }

    case 'get': {
      const prompt = positional[0];
      if (!prompt) {
        console.error('  Error: prompt required. Usage: llmcache get "prompt"');
        process.exit(1);
      }
      const result = cache.get(prompt, options.model);
      if (result) {
        console.log(cyan + '  [HIT]' + reset + ' Found cached response');
        console.log(result.response);
      } else {
        console.log(dim + '  [MISS] No cached response' + reset);
        process.exit(1);
      }
      break;
    }

    case 'list':
    case 'ls': {
      const entries = cache.list();
      if (entries.length === 0) {
        console.log(dim + '  No cached entries' + reset);
        break;
      }
      console.log('\n  ' + dim + 'HASH        MODEL       HITS  PROMPT' + reset);
      for (const e of entries) {
        console.log('  ' + cyan + e.hash + reset + '  ' + e.model.padEnd(10) + '  ' + String(e.hits).padStart(4) + '  ' + e.prompt);
      }
      console.log('');
      break;
    }

    case 'stats': {
      const s = cache.stats();
      if (!s) {
        console.error('  Cache not initialized. Run: llmcache init');
        process.exit(1);
      }
      console.log('\n  ' + cyan + 'llmcache stats' + reset);
      console.log('  ' + dim + '──────────────' + reset);
      console.log('  Entries:      ' + s.entries);
      console.log('  Total hits:   ' + s.totalHits);
      console.log('  Tokens saved: ~' + s.tokensSaved.toLocaleString());
      console.log('  Cache size:   ' + formatSize(s.cacheSize));
      console.log('');
      break;
    }

    case 'clear': {
      const result = cache.clear(options);
      if (result.success) {
        console.log(green + '  ✓ Cleared ' + result.removed + ' entries' + reset);
      } else {
        console.error('  Error: ' + result.message);
        process.exit(1);
      }
      break;
    }

    case 'search': {
      const query = positional[0];
      if (!query) {
        console.error('  Error: query required. Usage: llmcache search "query"');
        process.exit(1);
      }
      const results = cache.search(query);
      if (results.length === 0) {
        console.log(dim + '  No matches found' + reset);
        break;
      }
      console.log('\n  ' + dim + 'HASH        MODEL       HITS  PROMPT' + reset);
      for (const e of results) {
        console.log('  ' + cyan + e.hash + reset + '  ' + e.model.padEnd(10) + '  ' + String(e.hits).padStart(4) + '  ' + e.prompt);
      }
      console.log('');
      break;
    }

    case 'export': {
      const data = cache.exportCache();
      if (!data) {
        console.error('  Cache not initialized. Run: llmcache init');
        process.exit(1);
      }
      console.log(JSON.stringify(data, null, 2));
      break;
    }

    default:
      console.error('  Unknown command: ' + command);
      console.error('  Run: llmcache --help');
      process.exit(1);
  }
}

main();
