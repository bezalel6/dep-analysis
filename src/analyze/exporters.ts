import path from 'path';
import { Graph } from './types';

// Add a function to export in DOT format (for Graphviz)
export function exportDotFormat(graph: Graph): string {
  let dot = 'digraph DependencyGraph {\n';
  dot += '  node [shape=box];\n';

  // Add nodes
  for (const [id, node] of graph.nodes.entries()) {
    const label = path.basename(id);
    dot += `  "${id}" [label="${label}"];\n`;
  }

  // Add edges
  for (const edge of graph.edges) {
    const style = edge.type === 'import' ? 'solid' : 'dashed';
    const color = edge.type === 'import' ? 'black' : 'blue';
    const label = edge.type === 'call' && edge.function ? edge.function : '';

    dot += `  "${edge.source}" -> "${edge.target}" [style=${style}, color=${color}, label="${label}"];\n`;
  }

  dot += '}\n';
  return dot;
}

// Add a function to export in D3.js format
export function exportD3Format(graph: Graph): string {
  const nodes = Array.from(graph.nodes.values()).map((node) => {
    return {
      id: node.id,
      label: path.basename(node.id),
      group: node.exports.size > 0 ? 1 : 2,
    };
  });

  // Create a Set of valid node IDs for quick lookup
  const validNodeIds = new Set(nodes.map((node) => node.id));

  const links = graph.edges
    .filter((edge) => validNodeIds.has(edge.source) && validNodeIds.has(edge.target))
    .map((edge) => {
      return {
        source: edge.source,
        target: edge.target,
        value: edge.type === 'import' ? 2 : 1,
        type: edge.type,
      };
    });

  const d3Data = {
    nodes,
    links,
  };

  return JSON.stringify(d3Data, null, 2);
}
