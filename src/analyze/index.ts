import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import chalk from 'chalk';
import { Graph } from './analyzer-config';
import { extractImports, extractExportsAndCalls } from './extractors';
import { buildImportEdges, buildCallEdges, detectCircularDependencies, graphToJson } from './graph';
import { exportDotFormat, exportD3Format } from './exporters';
import { generateHtmlVisualization } from './visualization';
import { AnalyzerConfig } from './analyzer-config';
  
// Update the analyzeFiles function to build a graph
export async function analyzeFiles(config: AnalyzerConfig): Promise<void> {
  try {
    const files = await config.files();
    if (files.length === 0) {
      console.log(chalk.yellow(`No files found matching pattern: ${config.pattern}`));
      return;
    }
    
    console.log(chalk.blue(`Found ${files.length} files to analyze...`));
    
    const graph: Graph = {
      nodes: new Map(),
      edges: []
    };
    
    for (const filePath of files) {
      try {
        const imports = extractImports(filePath, config);
        const { exports, calls } = extractExportsAndCalls(filePath, config);
        
        graph.nodes.set(filePath, {
          id: filePath,
          imports,
          exports,
          calls
        });
        
        console.log(chalk.green(`✓ Processed ${filePath}`));
        console.log(`  Imports: ${imports.length > 0 ? imports.join(', ') : 'none'}`);
        console.log(`  Exports: ${exports.size > 0 ? Array.from(exports.keys()).join(', ') : 'none'}`);
        console.log(`  Calls: ${calls.size > 0 ? Array.from(calls).join(', ') : 'none'}`);
      } catch (error) {
        console.error(chalk.red(`Error processing ${filePath}:`), error);
      }
    }
    
    buildImportEdges(graph, path.dirname('.'));
    buildCallEdges(graph);
    
    let outputContent = '';
    const outputDir = path.dirname(config.output);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log(chalk.blue(`Created output directory: ${outputDir}`));
    }
    
    switch (config.format) {
      case 'json':
        outputContent = JSON.stringify(graphToJson(graph), null, 2);
        break;
      case 'd3':
        outputContent = exportD3Format(graph);
        break;
      case 'dot':
        outputContent = exportDotFormat(graph);
        break;
      case 'html':
        await generateHtmlVisualization(graph, config);
        return;
    }
    
    fs.writeFileSync(config.output, outputContent);
    console.log(chalk.blue(`Graph written to ${config.output} in ${config.format} format`));
    
    printGraphSummary(graph);
    
  } catch (error) {
    console.error(chalk.red('Error during analysis:'), error);
  }
}

// Update the printGraphSummary function
function printGraphSummary(graph: Graph): void {
  console.log(chalk.blue('\nGraph Summary:'));
  console.log(`Total nodes: ${graph.nodes.size}`);
  console.log(`Total edges: ${graph.edges.length}`);
  
  const importEdges = graph.edges.filter(e => e.type === 'import').length;
  const callEdges = graph.edges.filter(e => e.type === 'call').length;
  console.log(`Import edges: ${importEdges}`);
  console.log(`Call edges: ${callEdges}`);
  
  const cycles = detectCircularDependencies(graph);
  if (cycles.length > 0) {
    console.log(chalk.yellow('\nCircular Dependencies Found:'));
    cycles.forEach((cycle, i) => {
      console.log(`Cycle ${i + 1}: ${cycle.join(' -> ')}`);
    });
  }
} 