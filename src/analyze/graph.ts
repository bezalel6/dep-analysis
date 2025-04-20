import path from 'path';
import { Graph, GraphEdge } from './types';

// Function to build import edges
export function buildImportEdges(graph: Graph, projectRoot: string): void {
  for (const [filePath, node] of graph.nodes.entries()) {
    const dir = path.dirname(filePath);
    
    for (const importPath of node.imports) {
      // First resolve to absolute path
      const absolutePath = path.resolve(dir, importPath);
      
      // Convert to path relative to project root
      const relativePath = path.relative(projectRoot, absolutePath);
      
      // Add edge to the graph
      graph.edges.push({
        source: path.relative(projectRoot, filePath),
        target: relativePath,
        type: 'import'
      });
    }
  }
}

// Function to build call edges
export function buildCallEdges(graph: Graph): void {
  // Create a map of exported functions
  const exportedFunctions = new Map<string, string>(); // functionName -> filePath
  
  for (const [filePath, node] of graph.nodes.entries()) {
    for (const [exportName, exportType] of node.exports.entries()) {
      if (exportType === 'function') {
        exportedFunctions.set(exportName, filePath);
      }
    }
  }
  
  // Add edges for function calls
  for (const [filePath, node] of graph.nodes.entries()) {
    for (const call of node.calls) {
      // Check if this call is to an exported function
      if (exportedFunctions.has(call)) {
        const targetFile = exportedFunctions.get(call)!;
        
        // Don't add self-references
        if (filePath !== targetFile) {
          graph.edges.push({
            source: filePath,
            target: targetFile,
            type: 'call',
            function: call
          });
        }
      }
    }
  }
}

// Add a function to detect circular dependencies
export function detectCircularDependencies(graph: Graph): string[][] {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const cycles: string[][] = [];
  
  // Build adjacency list
  const adjacencyList = new Map<string, string[]>();
  for (const edge of graph.edges) {
    if (edge.type === 'import') {
      if (!adjacencyList.has(edge.source)) {
        adjacencyList.set(edge.source, []);
      }
      adjacencyList.get(edge.source)!.push(edge.target);
    }
  }
  
  function dfs(node: string, path: string[] = []): boolean {
    visited.add(node);
    recursionStack.add(node);
    path.push(node);
    
    const neighbors = adjacencyList.get(node) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor, [...path])) {
          return true;
        }
      } else if (recursionStack.has(neighbor)) {
        // Found a cycle
        const cycleStart = path.indexOf(neighbor);
        cycles.push(path.slice(cycleStart));
        return true;
      }
    }
    
    recursionStack.delete(node);
    return false;
  }
  
  // Run DFS from each node
  for (const node of graph.nodes.keys()) {
    if (!visited.has(node)) {
      dfs(node);
    }
  }
  
  return cycles;
}

// Function to convert graph to JSON
export function graphToJson(graph: Graph): any {
  const nodes = Array.from(graph.nodes.values()).map(node => {
    return {
      id: node.id,
      label: path.basename(node.id),
      exports: Array.from(node.exports.keys()),
      calls: Array.from(node.calls)
    };
  });
  
  const edges = graph.edges.map(edge => {
    return {
      source: edge.source,
      target: edge.target,
      type: edge.type,
      label: edge.type === 'call' ? edge.function : undefined
    };
  });
  
  return {
    nodes,
    edges
  };
} 