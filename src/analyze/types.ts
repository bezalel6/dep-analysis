import { ScriptKind } from 'typescript';
import { AnalyzerOptions } from './analyzer-config';

export class Options implements AnalyzerOptions {
  pattern: string;
  languages: ('ts' | 'js' | 'tsx' | 'jsx')[];
  format: 'json' | 'd3' | 'dot' | 'html';
  open: boolean;

  constructor(options: AnalyzerOptions) {
    this.pattern = options.pattern;
    this.languages = options.languages;
    this.format = options.format;
    this.open = options.open;
  }

  get kind(): ScriptKind {
    return ScriptKind.JS;
  }
  
  get isSX(): boolean {
    return this.languages.some(lang => lang === 'jsx' || lang === 'tsx');
  }
}

export class AnalyzeOptions {
  pattern: string;
  language: 'ts' | 'js'|'tsx'|'jsx';
  output?: string;
  format?: 'json' | 'd3' | 'dot' | 'html';
  open?: boolean; // Whether to open the HTML visualization
}

export interface Node {
  id: string;
  imports: string[];
  exports: Map<string, string>; // name -> type (function, class, etc.)
  calls: Set<string>; // function names called in this file
}

export interface Graph {
  nodes: Map<string, Node>;
  edges: Array<{
    source: string;
    target: string;
    type: string;
    function?: string; // Optional function name for call edges
  }>;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: string;
  function?: string;
} 