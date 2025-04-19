#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { analyzeFiles } from './index';
import {version} from '../package.json'
const program = new Command();

program
  .name('dep-graph')
  .description('Analyze imports and function calls between files')
  .version(version)
  .requiredOption('-p, --pattern <pattern>', 'Pattern to match files')
  .option(
    '-l, --language <language>',
    'Language to analyze (ts or js)',
    value => {
      if (value !== 'ts' && value !== 'js') {
        throw new Error('Language must be either "ts" or "js"');
      }
      return value;
    },'ts'
  )
  .option(
    '-f, --format <format>',
    'Output format (json, d3, dot, html)',
    value => {
      if (value && !['json', 'd3', 'dot', 'html'].includes(value)) {
        throw new Error('Format must be one of: json, d3, dot, html');
      }
      return value;
    },'html'
  )
  .option('--open', 'Open the HTML visualization in browser',true)
  .action(async options => {
    try {
      
      console.log({options})
      await analyzeFiles(options);
    } catch (error) {
      console.error(
        chalk.red('Error:'),
        error instanceof Error ? error.message : error
      );
      process.exit(1);
    }
  });

program.parse();

// Print out the parsed options
console.log(chalk.blue('Parsed options:'));
console.log(program.opts());
