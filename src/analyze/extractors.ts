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
    console.log(ts.SyntaxKind[node.kind]);
    if (ts.isImportDeclaration(node)) {
      const moduleSpecifier = node.moduleSpecifier;

      if (ts.isStringLiteral(moduleSpecifier)) {
        const importPath = moduleSpecifier.text;

        if (importPath.startsWith('.')) {
          imports.push(importPath);
        }
      } else {
        console.warn(`DIdnt label import: ${moduleSpecifier}`);
      }
    }
  });

  return imports;
}

export function extractExportsAndCalls(
  filePath: string,
  config: AnalyzerConfig
): { exports: Map<string, string>; calls: Set<string> } {
  const exports = new Map<string, string>();
  const calls = new Set<string>();
  const sourceFile = createSourceFile(filePath, config);

  function visit(node: ts.Node) {
    if (node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
      console.log(node.getText());
      console.log((node as any).name);
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
