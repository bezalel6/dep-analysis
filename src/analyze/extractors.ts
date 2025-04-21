import fs from 'fs';
import * as ts from 'typescript';
import { Node, Graph } from './analyzer-config';
import { AnalyzerConfig } from './analyzer-config';
import { NodeFlags } from 'typescript';

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
export function extractImports(filePath: string, config: AnalyzerConfig): string[] {
  const imports: string[] = [];
  const sourceFile = createSourceFile(filePath, config);

  ts.forEachChild(sourceFile, (node) => {
    // Handle ES6 import declarations
    if (ts.isImportDeclaration(node)) {
      const moduleSpecifier = node.moduleSpecifier;

      if (ts.isStringLiteral(moduleSpecifier)) {
        const importPath = moduleSpecifier.text;

        if (importPath.startsWith('.')) {
          imports.push(importPath);
        }
      } else {
        console.warn(`Didn't label import: ${moduleSpecifier}`);
      }
    }
    // Handle CommonJS require statements
    else if (ts.isVariableStatement(node) || ts.isExpressionStatement(node)) {
      node.forEachChild((child) => {
        if (ts.isVariableDeclaration(child) && child.initializer) {
          checkForRequire(child.initializer, imports);
        } else if (ts.isCallExpression(child)) {
          checkForRequire(child, imports);
        }
      });
    }
  });

  return imports;
}

function checkForRequire(node: ts.Node, imports: string[]): void {
  if (
    ts.isCallExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === 'require'
  ) {
    if (node.arguments.length > 0 && ts.isStringLiteral(node.arguments[0])) {
      const importPath = node.arguments[0].text;
      if (importPath.startsWith('.')) {
        imports.push(importPath);
      }
    }
  }
}

export function extractExportsAndCalls(
  filePath: string,
  config: AnalyzerConfig
): { exports: Map<string, string>; calls: Set<string> } {
  const exports = new Map<string, string>();
  const calls = new Set<string>();
  const sourceFile = createSourceFile(filePath, config);

  function visit(node: ts.Node) {
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
