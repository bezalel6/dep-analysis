# dep-analysis

[![npm package][npm-img]][npm-url]
[![Build Status][build-img]][build-url]
[![Downloads][downloads-img]][downloads-url]
[![Issues][issues-img]][issues-url]
[![Code Coverage][codecov-img]][codecov-url]
[![Commitizen Friendly][commitizen-img]][commitizen-url]
[![Semantic Release][semantic-release-img]][semantic-release-url]

> A powerful tool to analyze and visualize dependencies between files in TypeScript/JavaScript projects

## Features

- Analyze imports and function calls between files
- Generate dependency graphs in multiple formats (JSON, D3, DOT, HTML)
- Interactive HTML visualization with D3.js
- Detect circular dependencies
- Find most imported files
- Support for both TypeScript and JavaScript projects

## Install

```bash
npm install dep
```

## Usage

```bash
Usage: dep [options]

Options:
  -V, --version            output the version number
  -p, --pattern <pattern>  pattern to match files (required)
  -l, --language <language> language to analyze (ts or js) (default: "ts")
  -o, --output <file>      output file for the graph
  -f, --format <format>    output format (json, d3, dot, html) (default: "html")
  --open                   open the HTML visualization in browser (default: true)

Examples:

  # Analyze TypeScript files and generate HTML visualization
  $ dep --pattern "src/**/*.ts" --language ts --output graph.html --format html

  # Analyze JavaScript files and output JSON
  $ dep --pattern "src/**/*.js" --language js --output dependencies.json --format json
```

## Example Output

The tool provides a detailed analysis of your codebase, including:

- Total number of files analyzed
- Import dependencies between files
- Function call relationships
- Circular dependencies (if any)
- Most imported files

The HTML visualization provides an interactive graph where you can:
- Zoom and pan
- Click on nodes to see details
- Hover over edges to see relationship types
- Search for specific files or functions

[build-img]:https://github.com/bezalel6/dep-analysis/actions/workflows/release.yml/badge.svg
[build-url]:https://github.com/bezalel6/dep-analysis/actions/workflows/release.yml
[downloads-img]:https://img.shields.io/npm/dt/dep-analysis
[downloads-url]:https://www.npmtrends.com/dep-analysis
[npm-img]:https://img.shields.io/npm/v/dep-analysis
[npm-url]:https://www.npmjs.com/package/dep-analysis
[issues-img]:https://img.shields.io/github/issues/bezalel6/dep-analysis
[issues-url]:https://github.com/bezalel6/dep-analysis/issues
[codecov-img]:https://codecov.io/gh/bezalel6/dep-analysis/branch/main/graph/badge.svg
[codecov-url]:https://codecov.io/gh/bezalel6/dep-analysis
[semantic-release-img]:https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg
[semantic-release-url]:https://github.com/semantic-release/semantic-release
[commitizen-img]:https://img.shields.io/badge/commitizen-friendly-brightgreen.svg
[commitizen-url]:http://commitizen.github.io/cz-cli/
