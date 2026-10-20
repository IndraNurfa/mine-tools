import { PathSegment, PathFormat } from './types.ts';
export * from './types.ts';

const JS_IDENTIFIER_REGEX = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;

export function formatPath(path: PathSegment[], format: PathFormat): string {
  if (format === 'js') {
    return formatJSPath(path);
  }
  if (format === 'jsonpath') {
    return formatJSONPath(path);
  }
  if (format === 'gjson') {
    return formatGjsonPath(path);
  }
  throw new Error(`Unknown path format: ${format}`);
}

function formatJSPath(path: PathSegment[]): string {
  if (path.length === 0) {
    return '';
  }

  let result = '';
  for (let i = 0; i < path.length; i++) {
    const seg = path[i];
    if (typeof seg === 'number') {
      result += `[${seg}]`;
    } else {
      if (JS_IDENTIFIER_REGEX.test(seg)) {
        if (result === '') {
          result = seg;
        } else {
          result += `.${seg}`;
        }
      } else {
        result += `[${JSON.stringify(seg)}]`;
      }
    }
  }
  return result;
}

function formatJSONPath(path: PathSegment[]): string {
  if (path.length === 0) {
    return '$';
  }

  let result = '$';
  for (let i = 0; i < path.length; i++) {
    const seg = path[i];
    if (typeof seg === 'number') {
      result += `[${seg}]`;
    } else {
      if (JS_IDENTIFIER_REGEX.test(seg)) {
        result += `.${seg}`;
      } else {
        const escaped = seg.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        result += `['${escaped}']`;
      }
    }
  }
  return result;
}

function formatGjsonPath(path: PathSegment[]): string {
  if (path.length === 0) {
    return '';
  }

  return path
    .map((seg) => {
      if (typeof seg === 'number') {
        return seg.toString();
      }
      // Escape special characters: \ . * ? | # @
      return seg.replace(/([\\.*(?|#@])/g, '\\$1');
    })
    .join('.');
}
