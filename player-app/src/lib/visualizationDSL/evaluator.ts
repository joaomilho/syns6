/**
 * Safe Expression Evaluator
 * Evaluates mathematical expressions without using eval() or Function()
 * Only allows whitelisted variables and operations
 */

import { EvalContext } from './schema';

// Simple tokenizer
type Token = {
  type: 'number' | 'operator' | 'function' | 'variable' | 'paren' | 'comma';
  value: string;
};

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  
  while (i < expr.length) {
    const char = expr[i];
    
    // Skip whitespace
    if (/\s/.test(char)) {
      i++;
      continue;
    }
    
    // Numbers (including decimals)
    if (/\d/.test(char) || (char === '.' && /\d/.test(expr[i + 1]))) {
      let num = '';
      while (i < expr.length && (/\d/.test(expr[i]) || expr[i] === '.')) {
        num += expr[i++];
      }
      tokens.push({ type: 'number', value: num });
      continue;
    }
    
    // Operators
    if ('+-*/%'.includes(char)) {
      tokens.push({ type: 'operator', value: char });
      i++;
      continue;
    }
    
    // Parentheses
    if ('()'.includes(char)) {
      tokens.push({ type: 'paren', value: char });
      i++;
      continue;
    }
    
    // Comma
    if (char === ',') {
      tokens.push({ type: 'comma', value: char });
      i++;
      continue;
    }
    
    // Variables and functions
    if (/[a-zA-Z_]/.test(char)) {
      let name = '';
      while (i < expr.length && /[a-zA-Z0-9_.]/.test(expr[i])) {
        name += expr[i++];
      }
      
      // Check if it's a function (followed by '(')
      if (i < expr.length && expr[i] === '(') {
        tokens.push({ type: 'function', value: name });
      } else {
        tokens.push({ type: 'variable', value: name });
      }
      continue;
    }
    
    throw new Error(`Unexpected character: ${char}`);
  }
  
  return tokens;
}

// Evaluate with context
export function safeEval(expression: string | number, context: EvalContext): number {
  // If it's already a number, return it
  if (typeof expression === 'number') {
    return expression;
  }
  
  try {
    const tokens = tokenize(expression);
    return evaluateTokens(tokens, context);
  } catch (error) {
    console.error('Expression evaluation error:', error, 'Expression:', expression);
    return 0;
  }
}

function evaluateTokens(tokens: Token[], context: EvalContext): number {
  let pos = 0;
  
  function peek(): Token | undefined {
    return tokens[pos];
  }
  
  function consume(): Token {
    return tokens[pos++];
  }
  
  function parseExpression(): number {
    return parseAddSub();
  }
  
  function parseAddSub(): number {
    let left = parseMulDiv();
    
    while (peek() && peek()!.type === 'operator' && '+-'.includes(peek()!.value)) {
      const op = consume().value;
      const right = parseMulDiv();
      left = op === '+' ? left + right : left - right;
    }
    
    return left;
  }
  
  function parseMulDiv(): number {
    let left = parseUnary();
    
    while (peek() && peek()!.type === 'operator' && '*/%'.includes(peek()!.value)) {
      const op = consume().value;
      const right = parseUnary();
      if (op === '*') left = left * right;
      else if (op === '/') left = left / right;
      else if (op === '%') left = left % right;
    }
    
    return left;
  }
  
  function parseUnary(): number {
    if (peek() && peek()!.type === 'operator' && peek()!.value === '-') {
      consume();
      return -parsePrimary();
    }
    if (peek() && peek()!.type === 'operator' && peek()!.value === '+') {
      consume();
      return parsePrimary();
    }
    return parsePrimary();
  }
  
  function parsePrimary(): number {
    const token = peek();
    
    if (!token) {
      throw new Error('Unexpected end of expression');
    }
    
    // Number
    if (token.type === 'number') {
      consume();
      return parseFloat(token.value);
    }
    
    // Parentheses
    if (token.type === 'paren' && token.value === '(') {
      consume();
      const result = parseExpression();
      if (!peek() || peek()!.value !== ')') {
        throw new Error('Missing closing parenthesis');
      }
      consume();
      return result;
    }
    
    // Functions
    if (token.type === 'function') {
      return parseFunction();
    }
    
    // Variables
    if (token.type === 'variable') {
      return parseVariable();
    }
    
    throw new Error(`Unexpected token: ${token.value}`);
  }
  
  function parseFunction(): number {
    const funcToken = consume();
    const funcName = funcToken.value;
    
    // Expect '('
    if (!peek() || peek()!.value !== '(') {
      throw new Error(`Expected '(' after function ${funcName}`);
    }
    consume();
    
    const args: number[] = [];
    
    // Parse arguments
    if (!peek() || peek()!.value !== ')') {
      args.push(parseExpression());
      
      while (peek() && peek()!.type === 'comma') {
        consume(); // consume comma
        args.push(parseExpression());
      }
    }
    
    // Expect ')'
    if (!peek() || peek()!.value !== ')') {
      throw new Error(`Expected ')' after function arguments`);
    }
    consume();
    
    // Execute whitelisted functions
    return executeFunction(funcName, args);
  }
  
  function parseVariable(): number {
    const varToken = consume();
    const varPath = varToken.value.split('.');
    
    // Resolve variable from context
    let value: any = context;
    for (const key of varPath) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        throw new Error(`Unknown variable: ${varToken.value}`);
      }
    }
    
    if (typeof value !== 'number') {
      throw new Error(`Variable ${varToken.value} is not a number`);
    }
    
    return value;
  }
  
  function executeFunction(name: string, args: number[]): number {
    // Whitelist of allowed functions
    switch (name) {
      case 'sin':
        if (args.length !== 1) throw new Error('sin requires 1 argument');
        return Math.sin(args[0]);
      case 'cos':
        if (args.length !== 1) throw new Error('cos requires 1 argument');
        return Math.cos(args[0]);
      case 'tan':
        if (args.length !== 1) throw new Error('tan requires 1 argument');
        return Math.tan(args[0]);
      case 'abs':
        if (args.length !== 1) throw new Error('abs requires 1 argument');
        return Math.abs(args[0]);
      case 'floor':
        if (args.length !== 1) throw new Error('floor requires 1 argument');
        return Math.floor(args[0]);
      case 'ceil':
        if (args.length !== 1) throw new Error('ceil requires 1 argument');
        return Math.ceil(args[0]);
      case 'round':
        if (args.length !== 1) throw new Error('round requires 1 argument');
        return Math.round(args[0]);
      case 'sqrt':
        if (args.length !== 1) throw new Error('sqrt requires 1 argument');
        return Math.sqrt(args[0]);
      case 'pow':
        if (args.length !== 2) throw new Error('pow requires 2 arguments');
        return Math.pow(args[0], args[1]);
      case 'min':
        if (args.length < 2) throw new Error('min requires at least 2 arguments');
        return Math.min(...args);
      case 'max':
        if (args.length < 2) throw new Error('max requires at least 2 arguments');
        return Math.max(...args);
      default:
        throw new Error(`Unknown function: ${name}`);
    }
  }
  
  return parseExpression();
}


