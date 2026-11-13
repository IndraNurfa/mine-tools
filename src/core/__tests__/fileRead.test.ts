import { describe, it, expect } from 'vitest';
import { readTextFile, fmtSize } from '../../components/ui.tsx';

describe('readTextFile', () => {
  it('reads UTF-8 and strips a BOM', async () => {
    expect(await readTextFile(new File(['﻿a,b\n1,2'], 'x.csv'))).toBe('a,b\n1,2');
    expect(await readTextFile(new File(['héllo 世界'], 'x.csv'))).toBe('héllo 世界');
  });
  it('rejects files over 50 MB without reading them', async () => {
    const big = { name: 'huge.csv', size: 60 * 1048576, text: () => { throw new Error('should not read'); } } as unknown as File;
    await expect(readTextFile(big)).rejects.toThrow(/limit is 50 MB/);
  });
  it('formats sizes', () => {
    expect([fmtSize(10), fmtSize(2048), fmtSize(3 * 1048576)]).toEqual(['10 B', '2.0 KB', '3.0 MB']);
  });
});
