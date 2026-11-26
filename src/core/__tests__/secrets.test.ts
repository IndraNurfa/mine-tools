import { describe, it, expect, beforeEach, vi } from 'vitest';
import { clearStored, loadStored, saveStored, scrubStoredSecrets, setRememberSecrets } from '../../lib/storage.ts';
import { matchesShape } from '../../lib/shape.ts';
import { isSensitiveName, redactCurl, redactRequest } from '../http/redact.ts';
import { emptyRequest, kv, type ApiRequest } from '../http/request.ts';
import { isApiRequest } from '../http/validate.ts';
import { SAMPLE_JWT } from '../jwt/jwt.ts';

const secretRequest = (): ApiRequest => ({
  ...emptyRequest(),
  method: 'POST',
  url: 'https://bob:hunter2@api.test/x?api_key=SECRET1&page=2',
  headers: [kv('Authorization', 'Bearer SECRET2'), kv('Cookie', 'sid=SECRET3'), kv('Accept', 'application/json')],
  auth: { type: 'bearer', username: 'bob', password: 'SECRET4', token: 'SECRET5' },
  bodyMode: 'json',
  body: '{"password":"SECRET6","id":12345678901234567890,"max_tokens":"100"}',
  form: [kv('client_secret', 'SECRET7'), kv('name', 'ann')],
});

let disk: Map<string, string>;

beforeEach(() => {
  disk = new Map();
  const storage = {
    getItem: (k: string) => disk.get(k) ?? null,
    setItem: (k: string, v: string) => void disk.set(k, v),
    removeItem: (k: string) => void disk.delete(k),
  };
  // Object.keys(localStorage) must list the stored keys
  vi.stubGlobal(
    'localStorage',
    new Proxy(storage, { ownKeys: () => [...disk.keys()], getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }) }),
  );
  clearStored();
});

const onDisk = () => [...disk.values()].join('\n');

describe('redaction', () => {
  it('strips every secret from a request and keeps the rest', () => {
    const safe = redactRequest(secretRequest());
    expect(JSON.stringify(safe)).not.toMatch(/SECRET|hunter2/);
    expect(safe.url).toBe('https://bob:@api.test/x?api_key=&page=2');
    expect(safe.headers[2]!.value).toBe('application/json');
    expect(safe.auth.username).toBe('bob');
    expect(safe.body).toBe('{"password":"","id":12345678901234567890,"max_tokens":"100"}');
    expect(safe.form[1]!.value).toBe('ann');
  });

  it('keeps {{placeholders}} that hold no secret', () => {
    const req = { ...emptyRequest(), headers: [kv('Authorization', 'Bearer {{token}}')], url: 'https://a.test/?token={{t}}' };
    expect(redactRequest(req)).toEqual(req);
    const mixed = { ...emptyRequest(), headers: [kv('Authorization', 'SECRET {{x}}')] };
    expect(redactRequest(mixed).headers[0]!.value).toBe('');
  });

  it('judges names', () => {
    for (const n of ['Authorization', 'X-API-Key', 'set-cookie', 'access_token', 'password']) expect(isSensitiveName(n)).toBe(true);
    for (const n of ['Accept', 'author', 'keyword', 'sort_key', 'max_tokens']) expect(isSensitiveName(n)).toBe(false);
  });

  it('leaves harmless cURL untouched and rebuilds one holding secrets', () => {
    const plain = "curl 'https://a.test' -H 'Authorization: Bearer {{token}}'";
    expect(redactCurl(plain)).toBe(plain);
    for (const cmd of [
      "curl https://a.test -H 'Authorization: Bearer SECRET'",
      'curl -u bob:SECRET https://a.test',
      "curl -b 'sid=SECRET' https://a.test",
      'curl --oauth2-bearer SECRET https://a.test',
    ]) {
      const out = redactCurl(cmd)!;
      expect(out).toContain('a.test');
      expect(out).not.toContain('SECRET');
    }
    expect(redactCurl("curl -H 'Authorization: Bearer SECRET")).toBeUndefined();
  });
});

describe('saving secrets', () => {
  it('keeps them off disk but available for this session', () => {
    saveStored('api-client', 'request', secretRequest());
    saveStored('api-client', 'history', [{ id: 'a', at: 1, status: 200, req: secretRequest() }]);
    saveStored('api-client', 'vars', { token: 'SECRET' });
    saveStored('curl', 'vars', { token: 'SECRET' });
    saveStored('curl', 'input', 'curl -u bob:SECRET https://a.test');
    saveStored('jwt', 'input', 'aaa.SECRET.ccc');
    expect(onDisk()).not.toMatch(/SECRET|hunter2/);
    expect(loadStored('api-client', 'request', emptyRequest())).toEqual(secretRequest());
    expect(loadStored('jwt', 'input', SAMPLE_JWT)).toBe('aaa.SECRET.ccc');
  });

  it('saves them when opted in and removes them when opted out', () => {
    saveStored('jwt', 'input', 'aaa.SECRET.ccc');
    setRememberSecrets(true);
    expect(onDisk()).toContain('SECRET');
    setRememberSecrets(false);
    expect(onDisk()).not.toContain('SECRET');
  });

  it('scrubs data saved by earlier versions', () => {
    disk.set('toolbox:api-client:request', JSON.stringify(secretRequest()));
    disk.set('toolbox:api-client:history', '{broken SECRET');
    disk.set('toolbox:jwt:input', JSON.stringify('aaa.SECRET.ccc'));
    disk.set('toolbox:regex:text', JSON.stringify('unrelated'));
    scrubStoredSecrets();
    expect(onDisk()).not.toMatch(/SECRET|hunter2/);
    expect(disk.get('toolbox:regex:text')).toBe('"unrelated"');
    expect(disk.get('toolbox:api-client:request')).toContain('api.test');
  });

  it('forgets session values on reset', () => {
    saveStored('jwt', 'input', 'aaa.SECRET.ccc');
    clearStored('jwt');
    expect(loadStored('jwt', 'input', SAMPLE_JWT)).toBe(SAMPLE_JWT);
  });
});

describe('stale saved data', () => {
  it('checks shape against the default', () => {
    const notes = [{ id: 'a', title: 't', body: '' }];
    expect(matchesShape(notes, notes)).toBe(true);
    expect(matchesShape({ bad: true }, notes)).toBe(false);
    expect(matchesShape([{ id: 'a' }], notes)).toBe(false);
    expect(matchesShape('3', 3)).toBe(false);
    expect(matchesShape({ anything: 1 }, {})).toBe(true);
    expect(matchesShape({ g: true }, null)).toBe(true);
  });

  it('falls back to the default when saved data does not fit', () => {
    disk.set('toolbox:scratchpad:notes', JSON.stringify({ bad: true }));
    expect(loadStored('scratchpad', 'notes', ['x'])).toEqual(['x']);
    disk.set('toolbox:api-client:request', JSON.stringify({ ...emptyRequest(), headers: [null] }));
    expect(loadStored('api-client', 'request', emptyRequest(), isApiRequest)).toEqual(emptyRequest());
  });
});
