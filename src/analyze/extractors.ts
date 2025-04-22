import fs from 'fs';
import * as ts from 'typescript';
import { Node, Graph, ExportType } from './analyzer-config';
import { AnalyzerConfig } from './analyzer-config';
import { NodeFlags } from 'typescript';
import { glob } from 'glob';
import * as path from 'path';

export function createSourceFile(filePath: string, config: AnalyzerConfig): ts.SourceFile {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  return ts.createSourceFile(
    filePath,
    fileContent,
    ts.ScriptTarget.Latest,
    true,
    config.scriptKind
  );
}
const hasExtension = (path: string) => /.*\.[a-zA-Z]+$/.test(path);
/**
 * Resolves a module path to an actual file path with the correct extension
 * @param modulePath The module path without extension
 * @param config The analyzer configuration
 * @returns The resolved file path or undefined if not found
 */
function resolveExtension(modulePath: string, config: AnalyzerConfig): string | undefined {
  console.log('Resolving:', modulePath);

  // Handle relative paths (starting with ./ or ../)
  const isRelative = modulePath.startsWith('./') || modulePath.startsWith('../');

  // Normalize the module path (remove leading ./ if present)
  const normalizedPath = isRelative ? modulePath.replace(/^\.\//, '') : modulePath;

  // Construct the full path pattern to search for
  const searchPattern = path.join(config.basePath, normalizedPath + config.extension);

  // Use glob to find matching files
  const matches = glob.sync(searchPattern);

  // Return the first match if found
  return matches.length > 0 ? matches[0] : undefined;
}

export function extractImports(filePath: string, config: AnalyzerConfig): string[] {
  const imports: string[] = [];
  const sourceFile = createSourceFile(filePath, config);

  function visit(node: ts.Node) {
    // Handle ES6 import declarations
    if (ts.isImportDeclaration(node)) {
      const moduleSpecifier = node.moduleSpecifier;

      if (ts.isStringLiteral(moduleSpecifier)) {
        let importPath = moduleSpecifier.text;

        if (importPath.startsWith('.')) {
          console.log(importPath, 'Has extension:', hasExtension(importPath));
          if (!hasExtension(importPath)) {
            importPath = resolveExtension(importPath, config);
          }
          imports.push(importPath);
        }
      } else {
        console.warn(`Didn't label import: ${moduleSpecifier}`);
      }
    }
    // Handle CommonJS require statements
    else if (ts.isCallExpression(node)) {
      checkForRequire(node, imports, config);
    }

    ts.forEachChild(node, visit);
  }

  ts.forEachChild(sourceFile, visit);
  return imports.map((importPath) => {
    // Convert the import path to a module ID relative to the base path
    const moduleId = config.pathToModuleId(importPath);

    // Make it a relative import starting with './'
    // If it's already a relative path, don't modify it
    if (!moduleId.startsWith('./') && !moduleId.startsWith('../')) {
      return `./${moduleId}`;
    }

    return moduleId;
  });
}

function checkForRequire(node: ts.Node, imports: string[], config: AnalyzerConfig): void {
  if (
    ts.isCallExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === 'require'
  ) {
    if (node.arguments.length > 0 && ts.isStringLiteral(node.arguments[0])) {
      let importPath = node.arguments[0].text;
      if (importPath.startsWith('.')) {
        if (!hasExtension(importPath)) {
          importPath = resolveExtension(importPath, config);
        }
        imports.push(importPath);
      }
    }
  }
}

export function extractExportsAndCalls(
  filePath: string,
  config: AnalyzerConfig
): { exports: Map<string, ExportType>; calls: Set<string> } {
  const exports = new Map<string, ExportType>();
  const calls = new Set<string>();
  const sourceFile = createSourceFile(filePath, config);

  function visit(node: ts.Node) {
    // Handle CommonJS module.exports
    if (ts.isExpressionStatement(node)) {
      const expr = node.expression;
      if (
        ts.isBinaryExpression(expr) &&
        ts.isPropertyAccessExpression(expr.left) &&
        ts.isIdentifier(expr.left.expression) &&
        expr.left.expression.text === 'module' &&
        ts.isIdentifier(expr.left.name) &&
        expr.left.name.text === 'exports'
      ) {
        if (ts.isObjectLiteralExpression(expr.right)) {
          expr.right.properties.forEach((prop) => {
            if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
              const varType =
                ts.isFunctionExpression(prop.initializer) || ts.isArrowFunction(prop.initializer)
                  ? 'function'
                  : 'variable';
              exports.set(prop.name.text, varType);
            }
          });
        }
      }
    }

    if (ts.isFunctionDeclaration(node) && node.name) {
      const functionName = node.name.text;

      if (node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
        exports.set(functionName, 'function');
      }
    }

    if (ts.isVariableStatement(node)) {
      if (node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
        node.declarationList.declarations.forEach((decl) => {
          if (ts.isIdentifier(decl.name)) {
            const varType =
              decl.initializer &&
              (ts.isFunctionExpression(decl.initializer) || ts.isArrowFunction(decl.initializer))
                ? 'function'
                : 'variable';
            exports.set(decl.name.text, varType);
          }
        });
      }
    }
    if (ts.isExportAssignment(node)) {
      if (ts.isIdentifier(node.expression)) {
        exports.set(node.expression.text, 'default');
      }
    }

    if (ts.isCallExpression(node)) {
      if (ts.isIdentifier(node.expression)) {
        calls.add(node.expression.text);
      } else if (ts.isPropertyAccessExpression(node.expression)) {
        if (ts.isIdentifier(node.expression.expression) && ts.isIdentifier(node.expression.name)) {
          calls.add(`${node.expression.expression.text}.${node.expression.name.text}`);
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  ts.forEachChild(sourceFile, visit);

  return { exports, calls };
}
