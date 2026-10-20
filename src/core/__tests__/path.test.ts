import { describe, it, expect } from 'vitest';
import { formatPath } from '../path/format.ts';

describe('formatPath', () => {
  it('formats root value (empty path)', () => {
    expect(formatPath([], 'js')).toBe('');
    expect(formatPath([], 'jsonpath')).toBe('$');
    expect(formatPath([], 'gjson')).toBe('');
  });

  it('formats standard nested paths with arrays and identifiers', () => {
    const path = ['data', 'items', 0, 'name'];
    expect(formatPath(path, 'js')).toBe('data.items[0].name');
    expect(formatPath(path, 'jsonpath')).toBe('$.data.items[0].name');
    expect(formatPath(path, 'gjson')).toBe('data.items.0.name');
  });

  it('formats keys with dots', () => {
    const path = ['data', 'key.with.dot', 'value'];
    expect(formatPath(path, 'js')).toBe('data["key.with.dot"].value');
    expect(formatPath(path, 'jsonpath')).toBe("$.data['key.with.dot'].value");
    expect(formatPath(path, 'gjson')).toBe('data.key\\.with\\.dot.value');
  });

  it('formats keys with spaces', () => {
    const path = ['my object', 'user name'];
    expect(formatPath(path, 'js')).toBe('["my object"]["user name"]');
    expect(formatPath(path, 'jsonpath')).toBe("$['my object']['user name']");
    expect(formatPath(path, 'gjson')).toBe('my object.user name');
  });

  it('formats empty key and numeric-looking keys', () => {
    const path = ['', '123', 'normal'];
    expect(formatPath(path, 'js')).toBe('[""]["123"].normal');
    expect(formatPath(path, 'jsonpath')).toBe("$['']['123'].normal");
    expect(formatPath(path, 'gjson')).toBe('.123.normal');
  });

  it('formats keys with quotes and special characters', () => {
    const path = ['key"with"quotes', "key'with'single", 'wild*card?|special#@\\slash'];
    expect(formatPath(path, 'js')).toBe('["key\\"with\\"quotes"]["key\'with\'single"]["wild*card?|special#@\\\\slash"]');
    expect(formatPath(path, 'jsonpath')).toBe("$['key\"with\"quotes']['key\\'with\\'single']['wild*card?|special#@\\\\slash']");
    expect(formatPath(path, 'gjson')).toBe('key"with"quotes.key\'with\'single.wild\\*card\\?\\|special\\#\\@\\\\slash');
  });

  it('formats nested arrays', () => {
    const path = ['matrix', 0, 1, 2];
    expect(formatPath(path, 'js')).toBe('matrix[0][1][2]');
    expect(formatPath(path, 'jsonpath')).toBe('$.matrix[0][1][2]');
    expect(formatPath(path, 'gjson')).toBe('matrix.0.1.2');
  });
});
