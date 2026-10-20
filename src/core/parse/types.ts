export type ASTNodeType = 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';

export interface SourceLocation {
  offset: number;
  line: number;
  column: number;
}

export interface PropertyNode {
  key: string;
  rawKey: string;
  keyStart: SourceLocation;
  keyEnd: SourceLocation;
  value: ASTNode;
  start: SourceLocation;
  end: SourceLocation;
}

export interface ObjectNode {
  type: 'object';
  children: PropertyNode[];
  start: SourceLocation;
  end: SourceLocation;
}

export interface ArrayNode {
  type: 'array';
  children: ASTNode[];
  start: SourceLocation;
  end: SourceLocation;
}

export interface StringNode {
  type: 'string';
  value: string;
  raw: string;
  start: SourceLocation;
  end: SourceLocation;
}

export interface NumberNode {
  type: 'number';
  raw: string;
  normalized: string;
  start: SourceLocation;
  end: SourceLocation;
}

export interface BooleanNode {
  type: 'boolean';
  value: boolean;
  start: SourceLocation;
  end: SourceLocation;
}

export interface NullNode {
  type: 'null';
  start: SourceLocation;
  end: SourceLocation;
}

export type ASTNode = ObjectNode | ArrayNode | StringNode | NumberNode | BooleanNode | NullNode;

export class ParseError extends Error {
  line: number;
  column: number;
  offset: number;

  constructor(message: string, line: number, column: number, offset: number) {
    super(`${message} at line ${line}, column ${column}`);
    this.name = 'ParseError';
    this.line = line;
    this.column = column;
    this.offset = offset;
  }
}
