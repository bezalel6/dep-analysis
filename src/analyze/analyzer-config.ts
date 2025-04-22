// analyzer-config.ts
import { glob } from 'glob';
import * as path from 'path';
import { ScriptKind } from 'typescript';

// Types and interfaces
export type Language = 'ts' | 'js' | 'tsx' | 'jsx';
export type OutputFormat = 'json' | 'd3' | 'dot' | 'html';
export type ExportType =
  | 'function'
  | 'class'
  | 'variable'
  | 'interface'
  | 'type'
  | 'enum'
  | 'unknown';

export interface AnalyzerOptions {
  pattern: string;
  languages: Language[];
  format: OutputFormat;
  open: boolean;
  outputDir?: string; // Optional output directory
}

export interface Node {
  id: string;
  path: string; // Full path to the file
  imports: string[];
  exports: Map<string, ExportType>;
  calls: Set<string>; // Function names called in this file
}

export interface GraphEdge {
  source: string;
  target: string;
  type: 'import' | 'call' | 'extends' | 'implements';
  label?: string; // Optional label for the edge
}

export interface Graph {
  nodes: Map<string, Node>;
  edges: GraphEdge[];
}

/**
 * Configuration class for the dependency analyzer
 */
export class AnalyzerConfig {
  private readonly _basePath: string;
  private readonly _globSelector: string;
  private readonly _outputDir: string;

  constructor(private options: AnalyzerOptions) {
    // Initialize path-related properties
    const { basePath, globSelector } = this.parseGlobPattern(options.pattern);
    this._basePath = basePath;
    this._globSelector = globSelector;
    this._outputDir = options.outputDir || './dist';
  }

  /**
   * Parse a glob pattern into its base path and selector components
   */
  private parseGlobPattern(pattern: string): { basePath: string; globSelector: string } {
    // Common glob patterns to match at the end of a path
    const globPatterns = [
      /\/\*\*\/\*\.\w+$/, // /**/*.ext
      /\/\*\*\/\*$/, // /**/*
      /\/\*\*$/, // /**
      /\/\*\.\w+$/, // /*.ext
      /\/\*$/, // /*
      /\/\*\*\/[\w\-\.]+$/, // /**/filename
      /\/[\w\-\.]+\*$/, // /prefix*
      /\/[\w\-\.]+\*\.\w+$/, // /prefix*.ext
    ];

    // Normalize the pattern to use forward slashes
    const normalizedPattern = pattern.replace(/\\/g, '/');

    // Try to match each glob pattern
    for (const globPattern of globPatterns) {
      const match = normalizedPattern.match(globPattern);
      if (match) {
        const globSelector = match[0];
        const basePath = normalizedPattern.slice(0, normalizedPattern.length - globSelector.length);

        // Remove trailing slashes from base path
        const cleanBasePath = basePath.replace(/\/+$/, '');

        return {
          basePath: cleanBasePath,
          globSelector: globSelector,
        };
      }
    }

    // If no glob pattern is found, assume the entire string is the base path
    return {
      basePath: normalizedPattern,
      globSelector: '',
    };
  }

  /**
   * Get the base path without glob patterns
   */
  get basePath(): string {
    return this._basePath;
  }

  /**
   * Get the glob selector part of the pattern
   */
  get globSelector(): string {
    return this._globSelector;
  }

  /**
   * Get the full glob pattern
   */
  get pattern(): string {
    return this.options.pattern;
  }

  /**
   * Get the languages to analyze
   */
  get languages(): Language[] {
    return this.options.languages;
  }

  /**
   * Get the output format
   */
  get format(): OutputFormat {
    return this.options.format;
  }

  /**
   * Whether to open the output file after generation
   */
  get shouldOpen(): boolean {
    return this.options.open;
  }

  /**
   * Whether any of the languages is TypeScript
   */
  get isTypeScript(): boolean {
    return this.languages.some((lang) => lang === 'ts' || lang === 'tsx');
  }

  /**
   * Whether any of the languages uses JSX
   */
  get isJSX(): boolean {
    return this.languages.some((lang) => lang === 'jsx' || lang === 'tsx');
  }

  /**
   * Get the file extension for the current language configuration
   */
  get extension(): string {
    const ext = ScriptKind[this.scriptKind].toLowerCase();
    return `.${ext}`;
  }

  /**
   * Get the TypeScript ScriptKind for the current language configuration
   */
  get scriptKind(): ScriptKind {
    if (this.isTypeScript) {
      return this.isJSX ? ScriptKind.TSX : ScriptKind.TS;
    }
    return this.isJSX ? ScriptKind.JSX : ScriptKind.JS;
  }

  /**
   * Get the output file path
   */
  get outputPath(): string {
    const filename = `dependency-graph-${ScriptKind[this.scriptKind].toLowerCase()}.${this.format}`;
    return path.join(this._outputDir, filename);
  }

  /**
   * Find all files matching the pattern
   */
  async findFiles(): Promise<string[]> {
    const files = await glob(this.pattern, { absolute: true });
    return files.map((file) => path.normalize(file));
  }
  pathToModuleId(filePath: string, importingFilePath?: string): string {
    if (!filePath) return '';

    const normalizedPath = path.normalize(filePath).replace(/\\/g, '/');

    // If we have an importing file context and the path is relative to it
    if (importingFilePath && (filePath.startsWith('./') || filePath.startsWith('../'))) {
      const importingDir = path.dirname(importingFilePath);
      const absolutePath = path.resolve(importingDir, filePath);
      const normalizedAbsolutePath = absolutePath.replace(/\\/g, '/');

      // Keep the relative format but ensure it points to the correct location
      return filePath.replace(new RegExp(`\\${this.extension}$`), '');
    }

    // Standard case: convert from absolute to relative to base path
    if (normalizedPath.startsWith(this.basePath)) {
      const relativePath = normalizedPath.slice(this.basePath.length);
      return relativePath.replace(/^\/+/, '').replace(new RegExp(`\\${this.extension}$`), '');
    }

    // Just remove the extension for other paths
    return normalizedPath.replace(new RegExp(`\\${this.extension}$`), '');
  }

  /**
   * Convert a module ID to a file path
   */
  moduleIdToPath(moduleId: string): string {
    // If the module ID is already a path (contains slashes), just add the extension
    if (moduleId.includes('/')) {
      return moduleId.endsWith(this.extension) ? moduleId : `${moduleId}${this.extension}`;
    }

    // Otherwise, join it with the base path and add the extension
    return path.join(
      this.basePath,
      moduleId.endsWith(this.extension) ? moduleId : `${moduleId}${this.extension}`
    );
  }

  /**
   * Create a string representation of the configuration
   */
  toString(): string {
    return JSON.stringify(
      {
        pattern: this.pattern,
        basePath: this.basePath,
        globSelector: this.globSelector,
        languages: this.languages,
        format: this.format,
        open: this.shouldOpen,
        isTypeScript: this.isTypeScript,
        isJSX: this.isJSX,
        outputPath: this.outputPath,
      },
      null,
      2
    );
  }
}
