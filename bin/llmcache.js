#!/usr/bin/env node

/**
 * llmcache CLI
 * LLM Response Caching Tool
 */

const { Command } = require('commander');
const pkg = require('../package.json');
const { isPro } = require('../src/license/checker');
const { colors, version: formatVersion } = require('../src/utils/output');

const program = new Command();

// Version display
const tier = isPro() ? 'pro' : 'free';
program
  .name('llmcache')
  .description('Cache LLM responses to save time and money')
  .version(formatVersion(pkg.version, tier), '-v, --version');

// Global options
program
  .option('-g, --global', 'Use global cache (~/.llmcache/cache)')
  .option('-p, --path <path>', 'Custom cache path');

// Init command
program
  .command('init')
  .description('Initialize a new cache')
  .option('-b, --backend <type>', 'Storage backend: json, sqlite, redis', 'json')
  .action((options) => {
    const { execute } = require('../src/commands/init');
    const globalOpts = program.opts();
    execute({ ...globalOpts, ...options });
  });

// Set command
program
  .command('set <prompt> <response>')
  .description('Cache a prompt/response pair')
  .option('-m, --model <name>', 'Model name', 'default')
  .option('-t, --ttl <duration>', 'Time to live (PRO): 7d, 24h, 30m')
  .option('--tags <tags>', 'Comma-separated tags (PRO)')
  .action((prompt, response, options) => {
    const { execute } = require('../src/commands/set');
    const globalOpts = program.opts();
    execute(prompt, response, { ...globalOpts, ...options });
  });

// Get command
program
  .command('get <prompt>')
  .description('Get cached response for a prompt')
  .option('-m, --model <name>', 'Model name', 'default')
  .option('-r, --raw', 'Output only the response')
  .option('-o, --output <file>', 'Write response to file')
  .action((prompt, options) => {
    const { execute } = require('../src/commands/get');
    const globalOpts = program.opts();
    execute(prompt, { ...globalOpts, ...options });
  });

// List command
program
  .command('list')
  .alias('ls')
  .description('List cached entries')
  .option('-m, --model <name>', 'Filter by model')
  .option('-l, --limit <n>', 'Limit results', '20')
  .option('-s, --sort <field>', 'Sort by: created, hits')
  .option('--json', 'Output as JSON')
  .action((options) => {
    const { execute } = require('../src/commands/list');
    const globalOpts = program.opts();
    execute({ ...globalOpts, ...options });
  });

// Stats command
program
  .command('stats')
  .description('Show cache statistics')
  .option('--json', 'Output as JSON')
  .action((options) => {
    const { execute } = require('../src/commands/stats');
    const globalOpts = program.opts();
    execute({ ...globalOpts, ...options });
  });

// Clear command
program
  .command('clear')
  .description('Clear cache entries')
  .option('--older-than <days>', 'Clear entries older than N days')
  .option('-y, --yes', 'Skip confirmation')
  .option('-f, --force', 'Force clear (alias for --yes)')
  .action((options) => {
    const { execute } = require('../src/commands/clear');
    const globalOpts = program.opts();
    execute({ ...globalOpts, ...options });
  });

// Search command
program
  .command('search <query>')
  .description('Search cached prompts')
  .option('-l, --limit <n>', 'Limit results', '20')
  .option('--json', 'Output as JSON')
  .action((query, options) => {
    const { execute } = require('../src/commands/search');
    const globalOpts = program.opts();
    execute(query, { ...globalOpts, ...options });
  });

// Export command
program
  .command('export [output]')
  .description('Export cache to JSON')
  .option('--pretty', 'Pretty print JSON')
  .action((output, options) => {
    const { execute } = require('../src/commands/export');
    const globalOpts = program.opts();
    execute(output, { ...globalOpts, ...options });
  });

// Import command
program
  .command('import <input>')
  .description('Import cache from JSON')
  .option('--strategy <type>', 'Import strategy: merge, replace, skip-existing', 'merge')
  .action((input, options) => {
    const { execute } = require('../src/commands/import');
    const globalOpts = program.opts();
    execute(input, { ...globalOpts, ...options });
  });

// Cost command (PRO)
program
  .command('cost')
  .description('Show cost savings report (PRO)')
  .option('--models', 'Show supported models and pricing')
  .option('--json', 'Output as JSON')
  .action((options) => {
    const { execute } = require('../src/commands/cost');
    const globalOpts = program.opts();
    execute({ ...globalOpts, ...options });
  });

// Similar command (PRO)
program
  .command('similar <prompt>')
  .description('Find similar cached prompts (PRO)')
  .option('-t, --threshold <n>', 'Similarity threshold (0-1)', '0.3')
  .option('-l, --limit <n>', 'Limit results', '10')
  .option('-b, --best', 'Return only the best match')
  .option('--json', 'Output as JSON')
  .action((prompt, options) => {
    const { execute } = require('../src/commands/similar');
    const globalOpts = program.opts();
    execute(prompt, { ...globalOpts, ...options });
  });

// Sync command (PRO)
program
  .command('sync <action>')
  .description('Sync cache: push, pull, status (PRO)')
  .option('-r, --remote <path>', 'Remote storage path')
  .option('--strategy <type>', 'Import strategy: merge, replace, skip-existing', 'merge')
  .action((action, options) => {
    const { execute } = require('../src/commands/sync');
    const globalOpts = program.opts();
    execute(action, { ...globalOpts, ...options });
  });

// Serve command (PRO)
program
  .command('serve')
  .description('Start HTTP server (PRO)')
  .option('--port <n>', 'Port number', '3377')
  .option('--host <host>', 'Host to bind', 'localhost')
  .action((options) => {
    const { execute } = require('../src/commands/serve');
    const globalOpts = program.opts();
    execute({ ...globalOpts, ...options });
  });

// License command
program
  .command('license [action] [key]')
  .description('Manage license: status, activate, deactivate')
  .action((action, key, options) => {
    const { execute } = require('../src/commands/license');
    execute(action, key, options);
  });

// Help customization
program.addHelpText('after', `
${colors.header('Examples:')}
  $ llmcache init                          Initialize local cache
  $ llmcache init -g                       Initialize global cache
  $ llmcache set "What is AI?" "AI is..." Cache a response
  $ llmcache get "What is AI?"            Get cached response
  $ llmcache set @prompt.txt @response.txt Use files
  $ llmcache stats                         Show statistics
  $ llmcache search "AI"                   Search prompts

${colors.pro('PRO Commands:')}
  $ llmcache cost                          Show cost savings
  $ llmcache similar "What is ML?"         Find similar prompts
  $ llmcache sync push --remote /shared    Push to remote
  $ llmcache serve --port 3377             Start HTTP server

${colors.dim('License:')}
  $ llmcache license status                Check license
  $ llmcache license activate LMC-XXXX-... Activate PRO
`);

// Parse arguments
program.parse();

// Show help if no command
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
