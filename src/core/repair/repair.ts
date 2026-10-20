import { ASTNode, ObjectNode, ArrayNode, StringNode, NumberNode, BooleanNode, NullNode, PropertyNode, SourceLocation, ParseError } from '../parse/types.ts';

export interface RepairItem {
  message: string;
  line: number;
  column: number;
  severity: 'info' | 'warning';
}

export interface RepairResult {
  ast: ASTNode;
  report: RepairItem[];
  hasTruncation: boolean;
}

export class RepairJSONParser {
  private source: string;
  private pos = 0;
  private line = 1;
  private column = 1;
  private report: RepairItem[] = [];
  private hasTruncation = false;
  private containerStack: ('{' | '[')[] = [];

  constructor(source: string) {
    this.source = this.preprocessCurlyQuotes(source);
  }

  private preprocessCurlyQuotes(src: string): string {
    let result = '';
    let curLine = 1;
    let curCol = 1;

    for (let i = 0; i < src.length; i++) {
      const ch = src[i];
      if (ch === '“' || ch === '”') {
        result += '"';
        this.report.push({
          message: `Replaced curly double quote '${ch}' with standard quote`,
          line: curLine,
          column: curCol,
          severity: 'info',
        });
      } else if (ch === '‘' || ch === '’') {
        result += "'";
        this.report.push({
          message: `Replaced curly single quote '${ch}' with standard single quote`,
          line: curLine,
          column: curCol,
          severity: 'info',
        });
      } else {
        result += ch;
      }

      if (ch === '\n') {
        curLine++;
        curCol = 1;
      } else {
        curCol++;
      }
    }
    return result;
  }

  public parseAndRepair(): RepairResult {
    this.skipWhitespaceAndComments();
    if (this.pos >= this.source.length) {
      throw new ParseError('Cannot repair empty input', 1, 1, 0);
    }

    const ast = this.parseValue();
    this.skipWhitespaceAndComments();

    if (this.pos < this.source.length) {
      const loc = this.getLocation();
      const remainingSnippet = this.source.slice(this.pos, this.pos + 20).replace(/\n/g, ' ');
      this.report.push({
        message: `Ignored trailing text after root value: "${remainingSnippet}..."`,
        line: loc.line,
        column: loc.column,
        severity: 'info',
      });
      // Skip the rest of the text
      this.pos = this.source.length;
    }

    if (this.hasTruncation) {
      this.report.push({
        message: 'Payload was truncated at end; the last value may be incomplete and should not be blindly trusted',
        line: this.line,
        column: this.column,
        severity: 'warning',
      });
    }

    return {
      ast,
      report: this.report,
      hasTruncation: this.hasTruncation,
    };
  }

  private getLocation(): SourceLocation {
    return {
      offset: this.pos,
      line: this.line,
      column: this.column,
    };
  }

  private peekChar(offset = 0): string {
    return this.source.charAt(this.pos + offset);
  }

  private advance(): string {
    const ch = this.source.charAt(this.pos);
    this.pos++;
    if (ch === '\n') {
      this.line++;
      this.column = 1;
    } else {
      this.column++;
    }
    return ch;
  }

  private skipWhitespaceAndComments(): void {
    while (this.pos < this.source.length) {
      const ch = this.peekChar();
      if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
        this.advance();
      } else if (ch === '/' && this.peekChar(1) === '/') {
        this.advance();
        this.advance();
        while (this.pos < this.source.length && this.peekChar() !== '\n') {
          this.advance();
        }
      } else if (ch === '/' && this.peekChar(1) === '*') {
        const commentStart = this.getLocation();
        this.advance();
        this.advance();
        let closed = false;
        while (this.pos < this.source.length) {
          if (this.peekChar() === '*' && this.peekChar(1) === '/') {
            this.advance();
            this.advance();
            closed = true;
            break;
          }
          this.advance();
        }
        if (!closed) {
          this.report.push({
            message: 'Auto-closed unterminated block comment at end of input',
            line: commentStart.line,
            column: commentStart.column,
            severity: 'warning',
          });
        }
      } else {
        break;
      }
    }
  }

  private parseValue(): ASTNode {
    this.skipWhitespaceAndComments();
    if (this.pos >= this.source.length) {
      // In repair mode, if expecting a value at EOF, synthesize null and mark truncation
      this.hasTruncation = true;
      const loc = this.getLocation();
      this.report.push({
        message: 'Unexpected end of input while expecting value; defaulted to null',
        line: loc.line,
        column: loc.column,
        severity: 'warning',
      });
      return {
        type: 'null',
        start: loc,
        end: loc,
      };
    }

    const ch = this.peekChar();
    if (ch === '{') {
      return this.parseObject();
    }
    if (ch === '[') {
      return this.parseArray();
    }
    if (ch === '"' || ch === "'") {
      return this.parseString();
    }
    if (ch === '-' || ch === '+' || ch === '.' || (ch >= '0' && ch <= '9')) {
      return this.parseNumber();
    }

    return this.parseLiteralOrIdentifier();
  }

  private parseLiteralOrIdentifier(): ASTNode {
    const startLoc = this.getLocation();
    const ident = this.readIdentifier();

    if (ident === 'true') {
      return { type: 'boolean', value: true, start: startLoc, end: this.getLocation() };
    }
    if (ident === 'false') {
      return { type: 'boolean', value: false, start: startLoc, end: this.getLocation() };
    }
    if (ident === 'null') {
      return { type: 'null', start: startLoc, end: this.getLocation() };
    }

    // Strict rejection for python / forbidden literals as per PRD
    if (ident === 'None' || ident === 'True' || ident === 'False') {
      throw new ParseError(`Unsupported Python literal '${ident}'`, startLoc.line, startLoc.column, startLoc.offset);
    }
    if (ident === 'NaN' || ident === 'Infinity' || ident === 'undefined') {
      throw new ParseError(`Unsupported literal '${ident}'`, startLoc.line, startLoc.column, startLoc.offset);
    }

    // If ambiguous token, throw error
    throw new ParseError(`Unexpected token '${ident}'`, startLoc.line, startLoc.column, startLoc.offset);
  }

  private readIdentifier(): string {
    let result = '';
    while (this.pos < this.source.length) {
      const ch = this.peekChar();
      if (this.isIdentifierChar(ch)) {
        result += this.advance();
      } else {
        break;
      }
    }
    return result;
  }

  private isIdentifierStart(ch: string): boolean {
    return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_' || ch === '$';
  }

  private isIdentifierChar(ch: string): boolean {
    return (
      (ch >= 'a' && ch <= 'z') ||
      (ch >= 'A' && ch <= 'Z') ||
      (ch >= '0' && ch <= '9') ||
      ch === '_' ||
      ch === '$' ||
      ch === '-'
    );
  }

  private parseObject(): ObjectNode {
    const startLoc = this.getLocation();
    this.advance(); // consume '{'
    this.containerStack.push('{');
    this.skipWhitespaceAndComments();

    const children: PropertyNode[] = [];

    if (this.peekChar() === '}') {
      this.advance();
      this.containerStack.pop();
      return {
        type: 'object',
        children,
        start: startLoc,
        end: this.getLocation(),
      };
    }

    while (this.pos < this.source.length) {
      this.skipWhitespaceAndComments();
      if (this.pos >= this.source.length || this.peekChar() === '}') {
        break;
      }

      const propStart = this.getLocation();
      const { key, rawKey, keyStart, keyEnd } = this.parseObjectKey();

      this.skipWhitespaceAndComments();
      if (this.peekChar() !== ':') {
        // Try to repair missing colon if next is a value
        const colonLoc = this.getLocation();
        this.report.push({
          message: `Inserted missing ':' after key "${key}"`,
          line: colonLoc.line,
          column: colonLoc.column,
          severity: 'info',
        });
      } else {
        this.advance(); // consume ':'
      }

      const value = this.parseValue();
      const propEnd = this.getLocation();

      children.push({
        key,
        rawKey,
        keyStart,
        keyEnd,
        value,
        start: propStart,
        end: propEnd,
      });

      this.skipWhitespaceAndComments();

      if (this.peekChar() === ',') {
        this.advance(); // consume ','
        this.skipWhitespaceAndComments();
        if (this.peekChar() === '}') {
          this.advance();
          this.containerStack.pop();
          return {
            type: 'object',
            children,
            start: startLoc,
            end: this.getLocation(),
          };
        }
      } else if (this.peekChar() === '}') {
        this.advance();
        this.containerStack.pop();
        return {
          type: 'object',
          children,
          start: startLoc,
          end: this.getLocation(),
        };
      } else if (this.pos < this.source.length) {
        // Check if next token could be another key (missing comma!)
        const nextChar = this.peekChar();
        if (nextChar === '"' || nextChar === "'" || this.isIdentifierStart(nextChar) || (nextChar >= '0' && nextChar <= '9')) {
          const loc = this.getLocation();
          this.report.push({
            message: `Inserted missing comma between object properties`,
            line: loc.line,
            column: loc.column,
            severity: 'info',
          });
          // Continue loop to parse next property
          continue;
        } else {
          // Unexpected char
          const errLoc = this.getLocation();
          throw new ParseError(`Expected ',' or '}' after object property`, errLoc.line, errLoc.column, errLoc.offset);
        }
      }
    }

    // Reached end of input without closing '}'
    if (this.containerStack[this.containerStack.length - 1] === '{') {
      this.containerStack.pop();
      this.hasTruncation = true;
      this.report.push({
        message: "Auto-closed unclosed '{' at end of truncated input",
        line: this.line,
        column: this.column,
        severity: 'warning',
      });
    }

    return {
      type: 'object',
      children,
      start: startLoc,
      end: this.getLocation(),
    };
  }

  private parseObjectKey(): { key: string; rawKey: string; keyStart: SourceLocation; keyEnd: SourceLocation } {
    this.skipWhitespaceAndComments();
    const ch = this.peekChar();
    const keyStart = this.getLocation();

    if (ch === '"' || ch === "'") {
      const strNode = this.parseString();
      return {
        key: strNode.value,
        rawKey: strNode.raw,
        keyStart: strNode.start,
        keyEnd: strNode.end,
      };
    }

    if (this.isIdentifierStart(ch) || (ch >= '0' && ch <= '9')) {
      const ident = this.readIdentifier();
      const keyEnd = this.getLocation();
      return {
        key: ident,
        rawKey: ident,
        keyStart,
        keyEnd,
      };
    }

    throw new ParseError(`Expected key in object, found '${ch}'`, keyStart.line, keyStart.column, keyStart.offset);
  }

  private parseArray(): ArrayNode {
    const startLoc = this.getLocation();
    this.advance(); // consume '['
    this.containerStack.push('[');
    this.skipWhitespaceAndComments();

    const children: ASTNode[] = [];

    if (this.peekChar() === ']') {
      this.advance();
      this.containerStack.pop();
      return {
        type: 'array',
        children,
        start: startLoc,
        end: this.getLocation(),
      };
    }

    while (this.pos < this.source.length) {
      this.skipWhitespaceAndComments();
      if (this.pos >= this.source.length || this.peekChar() === ']') {
        break;
      }

      const item = this.parseValue();
      children.push(item);

      this.skipWhitespaceAndComments();
      if (this.peekChar() === ',') {
        this.advance(); // consume ','
        this.skipWhitespaceAndComments();
        if (this.peekChar() === ']') {
          this.advance();
          this.containerStack.pop();
          return {
            type: 'array',
            children,
            start: startLoc,
            end: this.getLocation(),
          };
        }
      } else if (this.peekChar() === ']') {
        this.advance();
        this.containerStack.pop();
        return {
          type: 'array',
          children,
          start: startLoc,
          end: this.getLocation(),
        };
      } else if (this.pos < this.source.length) {
        // Missing comma between array elements?
        const nextChar = this.peekChar();
        if (
          nextChar === '{' ||
          nextChar === '[' ||
          nextChar === '"' ||
          nextChar === "'" ||
          nextChar === '-' ||
          nextChar === '+' ||
          nextChar === '.' ||
          (nextChar >= '0' && nextChar <= '9') ||
          this.isIdentifierStart(nextChar)
        ) {
          const loc = this.getLocation();
          this.report.push({
            message: `Inserted missing comma between array elements`,
            line: loc.line,
            column: loc.column,
            severity: 'info',
          });
          continue;
        } else {
          const errLoc = this.getLocation();
          throw new ParseError(`Expected ',' or ']' after array element`, errLoc.line, errLoc.column, errLoc.offset);
        }
      }
    }

    // Reached end of input without closing ']'
    if (this.containerStack[this.containerStack.length - 1] === '[') {
      this.containerStack.pop();
      this.hasTruncation = true;
      this.report.push({
        message: "Auto-closed unclosed '[' at end of truncated input",
        line: this.line,
        column: this.column,
        severity: 'warning',
      });
    }

    return {
      type: 'array',
      children,
      start: startLoc,
      end: this.getLocation(),
    };
  }

  private parseString(): StringNode {
    const startLoc = this.getLocation();
    const quote = this.advance(); // '"' or "'"
    let value = '';
    let raw = quote;

    while (this.pos < this.source.length) {
      const ch = this.advance();
      raw += ch;

      if (ch === quote) {
        return {
          type: 'string',
          value,
          raw,
          start: startLoc,
          end: this.getLocation(),
        };
      }

      if (ch === '\\') {
        if (this.pos >= this.source.length) {
          break;
        }
        const esc = this.advance();
        raw += esc;
        switch (esc) {
          case '"':
            value += '"';
            break;
          case "'":
            value += "'";
            break;
          case '\\':
            value += '\\';
            break;
          case '/':
            value += '/';
            break;
          case 'b':
            value += '\b';
            break;
          case 'f':
            value += '\f';
            break;
          case 'n':
            value += '\n';
            break;
          case 'r':
            value += '\r';
            break;
          case 't':
            value += '\t';
            break;
          case 'v':
            value += '\v';
            break;
          case '0':
            value += '\0';
            break;
          default:
            value += esc;
            break;
        }
      } else {
        value += ch;
      }
    }

    // String was unclosed at end of input! Auto-close it
    this.hasTruncation = true;
    this.report.push({
      message: `Auto-closed unclosed string starting at line ${startLoc.line}, column ${startLoc.column}`,
      line: this.line,
      column: this.column,
      severity: 'warning',
    });

    return {
      type: 'string',
      value,
      raw: raw + quote,
      start: startLoc,
      end: this.getLocation(),
    };
  }

  private parseNumber(): NumberNode {
    const startLoc = this.getLocation();
    let raw = '';

    const first = this.peekChar();
    if (first === '+' || first === '-') {
      raw += this.advance();
    }

    if (this.peekChar() === '0' && (this.peekChar(1) === 'x' || this.peekChar(1) === 'X')) {
      raw += this.advance();
      raw += this.advance();
      let hexDigits = '';
      while (this.pos < this.source.length) {
        const c = this.peekChar();
        if ((c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F')) {
          const digit = this.advance();
          raw += digit;
          hexDigits += digit;
        } else {
          break;
        }
      }
      if (hexDigits.length === 0) {
        hexDigits = '0';
      }
      const isNegative = raw.startsWith('-');
      const bigVal = BigInt('0x' + hexDigits);
      const normalized = (isNegative ? '-' : '') + bigVal.toString(10);
      return {
        type: 'number',
        raw,
        normalized,
        start: startLoc,
        end: this.getLocation(),
      };
    }

    let hasDot = false;
    let hasDigitsBeforeDot = false;
    let hasDigitsAfterDot = false;
    let hasExp = false;

    while (this.pos < this.source.length) {
      const c = this.peekChar();
      if (c >= '0' && c <= '9') {
        raw += this.advance();
        hasDigitsBeforeDot = true;
      } else {
        break;
      }
    }

    if (this.peekChar() === '.') {
      hasDot = true;
      raw += this.advance();
      while (this.pos < this.source.length) {
        const c = this.peekChar();
        if (c >= '0' && c <= '9') {
          raw += this.advance();
          hasDigitsAfterDot = true;
        } else {
          break;
        }
      }
    }

    if (!hasDigitsBeforeDot && !hasDigitsAfterDot) {
      // truncated number like bare '-' or '+'
      raw += '0';
      this.hasTruncation = true;
      this.report.push({
        message: 'Completed incomplete number sign at end of input to 0',
        line: startLoc.line,
        column: startLoc.column,
        severity: 'warning',
      });
    }

    if (this.peekChar() === 'e' || this.peekChar() === 'E') {
      hasExp = true;
      raw += this.advance();
      if (this.peekChar() === '+' || this.peekChar() === '-') {
        raw += this.advance();
      }
      let expDigits = 0;
      while (this.pos < this.source.length) {
        const c = this.peekChar();
        if (c >= '0' && c <= '9') {
          raw += this.advance();
          expDigits++;
        } else {
          break;
        }
      }
      if (expDigits === 0) {
        raw += '0';
        this.hasTruncation = true;
        this.report.push({
          message: 'Completed incomplete exponent in number to e0',
          line: startLoc.line,
          column: startLoc.column,
          severity: 'warning',
        });
      }
    }

    let normalized = raw;
    if (normalized.startsWith('+')) {
      normalized = normalized.slice(1);
    }
    if (normalized.startsWith('-.')) {
      normalized = '-0.' + normalized.slice(2);
    } else if (normalized.startsWith('.')) {
      normalized = '0.' + normalized.slice(1);
    }
    if (hasDot && !hasDigitsAfterDot && !hasExp) {
      normalized = normalized.replace(/\.$/, '');
    }

    return {
      type: 'number',
      raw,
      normalized,
      start: startLoc,
      end: this.getLocation(),
    };
  }
}

export function repairAndParseJSON(source: string): RepairResult {
  const repairer = new RepairJSONParser(source);
  return repairer.parseAndRepair();
}
