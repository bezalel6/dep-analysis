#!/usr/bin/env node
import { Command, Option } from 'commander';
import chalk from 'chalk';
import { analyzeFiles } from './analyze/index';
import { version } from '../package.json';
import { AnalyzerConfig, AnalyzerOptions } from './analyze/analyzer-config';

const program = new Command();

program
  .name('dep')
  .description('Analyze imports and function calls between files')
  .version(version)
  .requiredOption('-p, --pattern <pattern>', 'Pattern to match files')
  .addOption(
    new Option('-l, --languages <languages...>', 'Languages to analyze (can specify multiple)')
      .choices(['ts', 'js', 'tsx', 'jsx'])
      .default(['ts'])
  )
  .addOption(
    new Option('-f, --format <format>', 'Output format')
      .choices(['json', 'd3', 'dot', 'html'])
      .default('html')
  )
  .option('--open', 'Open the HTML visualization in browser', true)
  .action(async (options: AnalyzerOptions) => {
    try {
      // Create config class from CLI options
      const config = new AnalyzerConfig(options);

      console.log(chalk.blue('Using configuration:'));
      console.log(config.toString());

      // Pass the config object to your analyzer
      await analyzeFiles(config);
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse();

// Print out the parsed options
const parsedOptions = program.opts();
console.log(chalk.blue('Parsed options:'));

console.log(parsedOptions);
