/** Runtime checks for request data read back from storage. */
import { emptyRequest, type ApiRequest, type KV } from './request.ts';
import { matchesShape } from '../../lib/shape.ts';

const isKv = (x: unknown) => matchesShape(x, { key: '', value: '', enabled: true } satisfies KV);

export const isApiRequest = (r: ApiRequest) =>
  matchesShape(r, emptyRequest()) && r.headers.every(isKv) && r.form.every(isKv);

export const isStringRecord = (r: Record<string, string>) => Object.values(r).every((v) => typeof v === 'string');
