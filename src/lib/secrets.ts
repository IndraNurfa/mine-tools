/**
 * Saved keys (`<toolId>:<key>`) that can hold secrets, and how to strip them.
 * `lib/storage` applies these unless the user ticks "Remember secrets".
 * Returning `undefined` saves nothing.
 */
import { redactCurl, redactRequest } from '../core/http/redact.ts';
import type { ApiRequest } from '../core/http/request.ts';
import { SAMPLE_JWT } from '../core/jwt/jwt.ts';

export const REDACTORS: Record<string, (value: any) => unknown> = {
  'api-client:request': (r: ApiRequest) => redactRequest(r),
  'api-client:history': (items: { req: ApiRequest }[]) => items.map((h) => ({ ...h, req: redactRequest(h.req) })),
  // Any variable may be a credential, so none are saved.
  'api-client:vars': () => ({}),
  'curl:vars': () => ({}),
  'curl:input': (command: string) => redactCurl(command),
  'jwt:input': (token: string) => (token === SAMPLE_JWT ? token : undefined),
};
