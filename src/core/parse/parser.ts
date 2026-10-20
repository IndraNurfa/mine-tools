import { ASTNode, ObjectNode, ArrayNode, StringNode, NumberNode, BooleanNode, NullNode, PropertyNode, SourceLocation, ParseError } from './types.ts';

export class LooseJSONParser {
  private source: string;
  private pos = 0;
  private line = 1;
  private column = 1;

  constructor(source: string) {
    this.source = source;
  }

  public parse(): ASTNode {
    this.skipWhitespaceAndComments();
    if (this.pos >= this.source.length) {
      throw new ParseError('Unexpected end of input (empty input)', this.line, this.column, this.pos);
    }

    const node = this.parseValue();
    this.skipWhitespaceAndComments();

    if (this.pos < this.source.length) {
      const loc = this.getLocation();
      throw new ParseError(`Unexpected extra token '${this.peekChar()}' after root value`, loc.line, loc.column, loc.offset);
    }

    return node;
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
        // Line comment
        this.advance();
        this.advance();
        while (this.pos < this.source.length && this.peekChar() !== '\n') {
          this.advance();
        }
      } else if (ch === '/' && this.peekChar(1) === '*') {
        // Block comment
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
          throw new ParseError('Unterminated block comment', commentStart.line, commentStart.column, commentStart.offset);
        }
      } else {
        break;
      }
    }
  }

  private parseValue(): ASTNode {
    this.skipWhitespaceAndComments();
    const ch = this.peekChar();
    const loc = this.getLocation();

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

    // Identifiers or keyword literals
    return this.parseLiteralOrForbidden();
  }

  private parseLiteralOrForbidden(): ASTNode {
    const startLoc = this.getLocation();
    const ident = this.readIdentifier();

    if (ident === 'true') {
      return {
        type: 'boolean',
        value: true,
        start: startLoc,
        end: this.getLocation(),
      };
    }
    if (ident === 'false') {
      return {
        type: 'boolean',
        value: false,
        start: startLoc,
        end: this.getLocation(),
      };
    }
    if (ident === 'null') {
      return {
        type: 'null',
        start: startLoc,
        end: this.getLocation(),
      };
    }

    // Forbidden literals according to PRD section 4.1:
    // "Not accepted in v1: NaN, Infinity, undefined, and Python literals (None, True, False).
    // These give a clear parse error with line and column, not a silent change."
    if (ident === 'NaN') {
      throw new ParseError("Unsupported literal 'NaN'", startLoc.line, startLoc.column, startLoc.offset);
    }
    if (ident === 'Infinity') {
      throw new ParseError("Unsupported literal 'Infinity'", startLoc.line, startLoc.column, startLoc.offset);
    }
    if (ident === 'undefined') {
      throw new ParseError("Unsupported literal 'undefined'", startLoc.line, startLoc.column, startLoc.offset);
    }
    if (ident === 'None' || ident === 'True' || ident === 'False') {
      throw new ParseError(`Unsupported Python literal '${ident}'`, startLoc.line, startLoc.column, startLoc.offset);
    }

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
    this.skipWhitespaceAndComments();

    const children: PropertyNode[] = [];

    if (this.peekChar() === '}') {
      this.advance();
      return {
        type: 'object',
        children,
        start: startLoc,
        end: this.getLocation(),
      };
    }

    while (this.pos < this.source.length) {
      this.skipWhitespaceAndComments();
      if (this.peekChar() === '}') {
        this.advance();
        return {
          type: 'object',
          children,
          start: startLoc,
          end: this.getLocation(),
        };
      }

      const propStart = this.getLocation();
      const { key, rawKey, keyStart, keyEnd } = this.parseObjectKey();

      this.skipWhitespaceAndComments();
      if (this.peekChar() !== ':') {
        const errLoc = this.getLocation();
        throw new ParseError(`Expected ':' after key at line ${errLoc.line}, column ${errLoc.column}`, errLoc.line, errLoc.column, errLoc.offset);
      }
      this.advance(); // consume ':'

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
        // check for trailing comma
        if (this.peekChar() === '}') {
          this.advance();
          return {
            type: 'object',
            children,
            start: startLoc,
            end: this.getLocation(),
          };
        }
      } else if (this.peekChar() === '}') {
        this.advance();
        return {
          type: 'object',
          children,
          start: startLoc,
          end: this.getLocation(),
        };
      } else {
        const errLoc = this.getLocation();
        throw new ParseError(`Expected ',' or '}' after object property at line ${errLoc.line}, column ${errLoc.column}`, errLoc.line, errLoc.column, errLoc.offset);
      }
    }

    throw new ParseError("Unclosed '{' in object", startLoc.line, startLoc.column, startLoc.offset);
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
    this.skipWhitespaceAndComments();

    const children: ASTNode[] = [];

    if (this.peekChar() === ']') {
      this.advance();
      return {
        type: 'array',
        children,
        start: startLoc,
        end: this.getLocation(),
      };
    }

    while (this.pos < this.source.length) {
      this.skipWhitespaceAndComments();
      if (this.peekChar() === ']') {
        this.advance();
        return {
          type: 'array',
          children,
          start: startLoc,
          end: this.getLocation(),
        };
      }

      const item = this.parseValue();
      children.push(item);

      this.skipWhitespaceAndComments();
      if (this.peekChar() === ',') {
        this.advance(); // consume ','
        this.skipWhitespaceAndComments();
        // check for trailing comma
        if (this.peekChar() === ']') {
          this.advance();
          return {
            type: 'array',
            children,
            start: startLoc,
            end: this.getLocation(),
          };
        }
      } else if (this.peekChar() === ']') {
        this.advance();
        return {
          type: 'array',
          children,
          start: startLoc,
          end: this.getLocation(),
        };
      } else {
        const errLoc = this.getLocation();
        throw new ParseError(`Expected ',' or ']' after array element at line ${errLoc.line}, column ${errLoc.column}`, errLoc.line, errLoc.column, errLoc.offset);
      }
    }

    throw new ParseError("Unclosed '[' in array", startLoc.line, startLoc.column, startLoc.offset);
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
          throw new ParseError('Unterminated escape sequence in string', startLoc.line, startLoc.column, startLoc.offset);
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
          case '\n':
            // Escaped newline
            break;
          case '\r':
            if (this.peekChar() === '\n') {
              raw += this.advance();
            }
            break;
          case 'u': {
            let hex = '';
            for (let i = 0; i < 4; i++) {
              if (this.pos >= this.source.length) {
                throw new ParseError('Invalid unicode escape sequence', startLoc.line, startLoc.column, startLoc.offset);
              }
              const h = this.advance();
              raw += h;
              hex += h;
            }
            if (!/^[0-9a-fA-F]{4}$/.test(hex)) {
              throw new ParseError(`Invalid unicode escape sequence '\\u${hex}'`, startLoc.line, startLoc.column, startLoc.offset);
            }
            value += String.fromCharCode(parseInt(hex, 16));
            break;
          }
          case 'x': {
            let hex = '';
            for (let i = 0; i < 2; i++) {
              if (this.pos >= this.source.length) {
                throw new ParseError('Invalid hex escape sequence in string', startLoc.line, startLoc.column, startLoc.offset);
              }
              const h = this.advance();
              raw += h;
              hex += h;
            }
            if (!/^[0-9a-fA-F]{2}$/.test(hex)) {
              throw new ParseError(`Invalid hex escape sequence '\\x${hex}'`, startLoc.line, startLoc.column, startLoc.offset);
            }
            value += String.fromCharCode(parseInt(hex, 16));
            break;
          }
          default:
            value += esc;
            break;
        }
      } else if (ch === '\n' || ch === '\r') {
        // In loose JSON or raw multiline strings, allow unescaped newlines or report if strict
        value += ch;
      } else {
        value += ch;
      }
    }

    throw new ParseError(`Unclosed string literal starting at line ${startLoc.line}, column ${startLoc.column}`, startLoc.line, startLoc.column, startLoc.offset);
  }

  private parseNumber(): NumberNode {
    const startLoc = this.getLocation();
    let raw = '';

    const first = this.peekChar();
    if (first === '+' || first === '-') {
      raw += this.advance();
    }

    // Check for Infinity after sign (e.g. +Infinity, -Infinity)
    if (this.source.substring(this.pos, this.pos + 8) === 'Infinity') {
      throw new ParseError(`Unsupported literal '${raw}Infinity'`, startLoc.line, startLoc.column, startLoc.offset);
    }

    // Check for Hex (0x or 0X)
    if (this.peekChar() === '0' && (this.peekChar(1) === 'x' || this.peekChar(1) === 'X')) {
      raw += this.advance(); // '0'
      raw += this.advance(); // 'x' or 'X'
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
        throw new ParseError(`Invalid hex number '${raw}'`, startLoc.line, startLoc.column, startLoc.offset);
      }

      // Convert hex to lossless decimal string
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

    // Normal or loose decimal number
    let hasDot = false;
    let hasDigitsBeforeDot = false;
    let hasDigitsAfterDot = false;
    let hasExp = false;

    // Digits before dot
    while (this.pos < this.source.length) {
      const c = this.peekChar();
      if (c >= '0' && c <= '9') {
        raw += this.advance();
        hasDigitsBeforeDot = true;
      } else {
        break;
      }
    }

    // Dot
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

    // Check that we have at least one digit
    if (!hasDigitsBeforeDot && !hasDigitsAfterDot) {
      throw new ParseError(`Invalid number '${raw}'`, startLoc.line, startLoc.column, startLoc.offset);
    }

    // Exponent
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
        throw new ParseError(`Invalid exponent in number '${raw}'`, startLoc.line, startLoc.column, startLoc.offset);
      }
    }

    // Normalize to valid strict JSON number string:
    // 1) remove leading '+'
    // 2) leading dot (e.g. '.5' -> '0.5', '-.5' -> '-0.5')
    // 3) trailing dot (e.g. '5.' -> '5', '-5.' -> '-5')
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
      // Trailing dot like '5.' -> remove '.' -> '5'
      normalized = normalized.replace(/\.$/, '');
    }

    // Handle cases where multiple leading zeros exist e.g. 007 -> 7 (in loose JSON)
    // Strict JSON doesn't allow leading zeros on integers unless it's just '0' or '0.xxx'
    if (/^-?0[0-9]+(\.|$)/.test(normalized)) {
      const sign = normalized.startsWith('-') ? '-' : '';
      const withoutSign = sign ? normalized.slice(1) : normalized;
      normalized = sign + withoutSign.replace(/^0+/, '');
      if (normalized === '' || normalized === '-') {
        normalized = '0';
      }
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

export function parseLooseJSON(source: string): ASTNode {
  const parser = new LooseJSONParser(source);
  return parser.parse();
}
