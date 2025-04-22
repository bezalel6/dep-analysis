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
function resolveExtension(
  modulePath: string,
  config: AnalyzerConfig,
  importingFilePath?: string
): string | undefined {
  console.log('Resolving:', modulePath);

  let resolvedPath: string;

  // Handle relative imports with context of importing file
  if ((modulePath.startsWith('./') || modulePath.startsWith('../')) && importingFilePath) {
    const importingDir = path.dirname(importingFilePath);
    resolvedPath = path.resolve(importingDir, modulePath + config.extension);
  } else {
    // For absolute imports or no context, resolve from base path
    const normalizedPath = modulePath.replace(/^\.\//, '');
    resolvedPath = path.join(config.basePath, normalizedPath + config.extension);
  }

  // Try direct file access first
  if (fs.existsSync(resolvedPath)) {
    return resolvedPath;
  }

  // Try glob pattern
  const matches = glob.sync(resolvedPath);
  if (matches.length > 0) {
    return matches[0];
  }

  // Try alternative extensions
  const alternativeExtensions = ['.ts', '.tsx', '.js', '.jsx', '.json'];
  for (const ext of alternativeExtensions) {
    if (ext === config.extension) continue;

    const alternativePath = resolvedPath.replace(config.extension, ext);
    if (fs.existsSync(alternativePath)) {
      return alternativePath;
    }
  }
  console.error('Couldnt find:', modulePath);
  return undefined;
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
          console.log(`[${filePath}]:`, importPath, 'Has extension:', hasExtension(importPath));
          if (!hasExtension(importPath)) {
            importPath = resolveExtension(importPath, config, filePath);
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
    const moduleId = config.pathToModuleId(importPath, filePath);

    // Make it a relative import starting with './'
    // If it's already a relative path, don't modify it
    // if (!moduleId.startsWith('./') && !moduleId.startsWith('../')) {
    // return `./${moduleId.replace(config.)}`;
    // }

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
          importPath = resolveExtension(importPath, config, node.getSourceFile().fileName);
        }
        imports.push(importPath);
      }
    }
  }
}

/**
 * Determines the export type based on a TypeScript node
 */
function determineExportType(node: ts.Node): ExportType {
  if (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node)) {
    return 'function';
  } else if (ts.isClassDeclaration(node) || ts.isClassExpression(node)) {
    return 'class';
  } else if (ts.isInterfaceDeclaration(node)) {
    return 'interface';
  } else if (ts.isTypeAliasDeclaration(node)) {
    return 'type';
  } else if (ts.isEnumDeclaration(node)) {
    return 'enum';
  } else if (ts.isVariableDeclaration(node)) {
    // For variable declarations, check the initializer to determine if it's a function
    if (node.initializer) {
      if (ts.isFunctionExpression(node.initializer) || ts.isArrowFunction(node.initializer)) {
        return 'function';
      } else if (ts.isClassExpression(node.initializer)) {
        return 'class';
      }
    }
    return 'variable';
  }

  return 'unknown';
}

/**
 * Extracts exports and function calls from a TypeScript/JavaScript file
 * @param filePath Path to the file to analyze
 * @param config Analyzer configuration
 * @returns Object containing maps of exports and function calls
 */
export function extractExportsAndCalls(
  filePath: string,
  config: AnalyzerConfig
): { exports: Map<string, ExportType>; calls: Set<string> } {
  const exports = new Map<string, ExportType>();
  const calls = new Set<string>();
  const sourceFile = createSourceFile(filePath, config);

  function visit(node: ts.Node) {
    // Handle export declarations (export function, export class, etc.)
    if (
      (ts.isFunctionDeclaration(node) ||
        ts.isClassDeclaration(node) ||
        ts.isInterfaceDeclaration(node) ||
        ts.isTypeAliasDeclaration(node) ||
        ts.isEnumDeclaration(node)) &&
      node.name
    ) {
      const name = node.name.text;

      if (node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
        exports.set(name, determineExportType(node));
      }

      // Handle default exports
      if (node.modifiers?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword)) {
        exports.set('default', determineExportType(node));
      }
    }

    // Handle export variable declarations
    if (ts.isVariableStatement(node)) {
      if (node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
        node.declarationList.declarations.forEach((decl) => {
          if (ts.isIdentifier(decl.name)) {
            exports.set(decl.name.text, determineExportType(decl));
          } else if (ts.isObjectBindingPattern(decl.name)) {
            // Handle destructuring exports: export const { a, b } = obj;
            decl.name.elements.forEach((element) => {
              if (ts.isBindingElement(element) && ts.isIdentifier(element.name)) {
                exports.set(element.name.text, 'variable');
              }
            });
          }
        });
      }
    }

    // Handle named exports: export { a, b as c }
    if (ts.isExportDeclaration(node) && node.exportClause) {
      if (ts.isNamedExports(node.exportClause)) {
        node.exportClause.elements.forEach((element) => {
          const exportName = element.name.text;
          const originalName = element.propertyName?.text || exportName;

          // We don't know the type here without symbol resolution
          // Could be improved with a type checker
          exports.set(exportName, 'unknown');
        });
      }
    }

    // Handle default exports: export default expression
    if (ts.isExportAssignment(node)) {
      if (ts.isIdentifier(node.expression)) {
        // export default someVariable
        exports.set('default', 'unknown');
      } else {
        // export default <expression>
        exports.set('default', determineExportType(node.expression));
      }
    }

    // Handle CommonJS module.exports = { ... }
    if (ts.isExpressionStatement(node)) {
      const expr = node.expression;
      if (
        ts.isBinaryExpression(expr) &&
        expr.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
        ts.isPropertyAccessExpression(expr.left) &&
        ts.isIdentifier(expr.left.expression) &&
        expr.left.expression.text === 'module' &&
        ts.isIdentifier(expr.left.name) &&
        expr.left.name.text === 'exports'
      ) {
        if (ts.isObjectLiteralExpression(expr.right)) {
          // module.exports = { a: function() {}, b: 42 }
          expr.right.properties.forEach((prop) => {
            if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
              exports.set(prop.name.text, determineExportType(prop.initializer));
            }
          });
        } else if (ts.isIdentifier(expr.right)) {
          // module.exports = SomeObject
          exports.set(expr.right.text, 'unknown');
        } else {
          // module.exports = <expression>
          exports.set('default', determineExportType(expr.right));
        }
      }
    }

    // Handle individual CommonJS exports: exports.name = value
    if (ts.isExpressionStatement(node)) {
      const expr = node.expression;
      if (
        ts.isBinaryExpression(expr) &&
        expr.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
        ts.isPropertyAccessExpression(expr.left) &&
        ts.isIdentifier(expr.left.expression) &&
        expr.left.expression.text === 'exports' &&
        ts.isIdentifier(expr.left.name)
      ) {
        exports.set(expr.left.name.text, determineExportType(expr.right));
      }
    }

    // Collect function calls
    if (ts.isCallExpression(node)) {
      if (ts.isIdentifier(node.expression)) {
        // Simple function call: functionName()
        calls.add(node.expression.text);
      } else if (ts.isPropertyAccessExpression(node.expression)) {
        // Method call: object.method()
        if (ts.isIdentifier(node.expression.name)) {
          const methodName = node.expression.name.text;

          if (ts.isIdentifier(node.expression.expression)) {
            // Simple object.method()
            const objectName = node.expression.expression.text;
            calls.add(`${objectName}.${methodName}`);
          } else {
            // Just track the method name if we can't determine the object
            calls.add(methodName);
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  ts.forEachChild(sourceFile, visit);

  return { exports, calls };
}
