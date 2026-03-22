import { Parser } from "expr-eval";

const parser = new Parser();

/**
 * Safely evaluate an expression using expr-eval instead of `new Function()`.
 * Only arithmetic, comparison, and property-access operators are supported --
 * arbitrary JS execution is impossible.
 */
export function safeEval(expression: string, scope: Record<string, any>): any {
  try {
    return parser.evaluate(expression, scope);
  } catch {
    throw new Error(`Failed to evaluate expression: ${expression}`);
  }
}
