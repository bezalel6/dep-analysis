// analyzer-config.ts
import { glob } from 'glob';
import { ScriptKind } from 'typescript';

export type Language = 'ts' | 'js' | 'tsx' | 'jsx';
export type OutputFormat = 'json' | 'd3' | 'dot' | 'html';

export interface AnalyzerOptions {
  pattern: string;
  languages: Language[];
  format: OutputFormat;
  open: boolean;
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

export class AnalyzerConfig {
  constructor(private options: AnalyzerOptions) { }

  get pattern() {
    return this.options.pattern;
  }

  get languages() {
    return this.options.languages;
  }

  get format() {
    return this.options.format;
  }

  get shouldOpen() {
    return this.options.open;
  }

  get isTypeScript() {
    return this.options.languages.some(lang => lang === 'ts' || lang === 'tsx');
  }

  get isJSX() {
    return this.options.languages.some(l => l === 'jsx' || l === 'tsx')
  }

  get scriptKind(): ScriptKind {
    if (this.isTypeScript) {
      return this.isJSX ? ScriptKind.TSX : ScriptKind.TS;
    }
    return this.isJSX ? ScriptKind.JSX : ScriptKind.JS;
  }

  async files() {
    return glob(this.options.pattern)
  }

  get output() {
    return `./dist/out/${this.options.format}`
  }

  toString(): string {
    return JSON.stringify({
      pattern: this.pattern,
      languages: this.languages,
      format: this.format,
      open: this.shouldOpen,
      isTypeScript: this.isTypeScript,
      isJSX: this.isJSX
    }, null, 2);
  }
}
