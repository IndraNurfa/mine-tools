export interface HttpStatus {
  code: number;
  name: string;
  desc: string;
}

export const HTTP_STATUS: HttpStatus[] = [
  [100, 'Continue', 'Server received the headers; client should send the body.'],
  [101, 'Switching Protocols', 'Server is switching protocols as requested (e.g. WebSocket upgrade).'],
  [102, 'Processing', 'WebDAV: request accepted, still processing.'],
  [103, 'Early Hints', 'Preload hints sent before the final response.'],
  [200, 'OK', 'Request succeeded.'],
  [201, 'Created', 'Resource created; Location header usually points to it.'],
  [202, 'Accepted', 'Accepted for processing, not completed yet.'],
  [203, 'Non-Authoritative Information', 'Response modified by a transforming proxy.'],
  [204, 'No Content', 'Success with no body.'],
  [205, 'Reset Content', 'Success; client should reset the document view.'],
  [206, 'Partial Content', 'Range request fulfilled.'],
  [207, 'Multi-Status', 'WebDAV: multiple independent results.'],
  [301, 'Moved Permanently', 'Resource has a new permanent URL; method may change to GET.'],
  [302, 'Found', 'Temporary redirect; method may change to GET.'],
  [303, 'See Other', 'Redirect to another URL using GET.'],
  [304, 'Not Modified', 'Cached copy is still valid.'],
  [307, 'Temporary Redirect', 'Temporary redirect, method and body preserved.'],
  [308, 'Permanent Redirect', 'Permanent redirect, method and body preserved.'],
  [400, 'Bad Request', 'Malformed syntax or invalid request.'],
  [401, 'Unauthorized', 'Authentication missing or invalid.'],
  [402, 'Payment Required', 'Reserved; used by some APIs for billing limits.'],
  [403, 'Forbidden', 'Authenticated but not allowed.'],
  [404, 'Not Found', 'Resource does not exist (or is hidden).'],
  [405, 'Method Not Allowed', 'HTTP method not supported for this resource.'],
  [406, 'Not Acceptable', 'No representation matches the Accept headers.'],
  [407, 'Proxy Authentication Required', 'Authenticate with the proxy first.'],
  [408, 'Request Timeout', 'Server timed out waiting for the request.'],
  [409, 'Conflict', 'Conflicts with current resource state (e.g. edit conflict, duplicate).'],
  [410, 'Gone', 'Resource permanently removed.'],
  [411, 'Length Required', 'Content-Length header required.'],
  [412, 'Precondition Failed', 'A conditional header (If-Match…) failed.'],
  [413, 'Content Too Large', 'Request body exceeds server limits.'],
  [414, 'URI Too Long', 'URL is longer than the server accepts.'],
  [415, 'Unsupported Media Type', 'Content-Type not supported.'],
  [416, 'Range Not Satisfiable', 'Requested range is outside the resource.'],
  [417, 'Expectation Failed', 'Expect header could not be met.'],
  [418, "I'm a teapot", 'April Fools RFC 2324; sometimes used for blocked bots.'],
  [421, 'Misdirected Request', 'Request sent to a server that cannot respond.'],
  [422, 'Unprocessable Content', 'Syntax OK but semantically invalid (validation errors).'],
  [423, 'Locked', 'WebDAV: resource is locked.'],
  [424, 'Failed Dependency', 'WebDAV: depended on a failed request.'],
  [425, 'Too Early', 'Server unwilling to risk replay.'],
  [426, 'Upgrade Required', 'Client must switch protocol.'],
  [428, 'Precondition Required', 'Request must be conditional.'],
  [429, 'Too Many Requests', 'Rate limited; see Retry-After.'],
  [431, 'Request Header Fields Too Large', 'Headers too big.'],
  [451, 'Unavailable For Legal Reasons', 'Blocked for legal reasons.'],
  [500, 'Internal Server Error', 'Generic server failure.'],
  [501, 'Not Implemented', 'Server does not support the functionality.'],
  [502, 'Bad Gateway', 'Upstream server returned an invalid response.'],
  [503, 'Service Unavailable', 'Overloaded or down for maintenance; may send Retry-After.'],
  [504, 'Gateway Timeout', 'Upstream server timed out.'],
  [505, 'HTTP Version Not Supported', 'HTTP version not supported.'],
  [507, 'Insufficient Storage', 'WebDAV: server out of storage.'],
  [508, 'Loop Detected', 'WebDAV: infinite loop detected.'],
  [511, 'Network Authentication Required', 'Captive portal: authenticate to gain network access.'],
].map(([code, name, desc]) => ({ code: code as number, name: name as string, desc: desc as string }));

export function searchStatus(q: string): HttpStatus[] {
  const s = q.trim().toLowerCase();
  if (!s) return HTTP_STATUS;
  return HTTP_STATUS.filter(
    (h) =>
      String(h.code).startsWith(s) ||
      h.name.toLowerCase().includes(s) ||
      h.desc.toLowerCase().includes(s) ||
      (/^[1-5]xx$/.test(s) && String(h.code)[0] === s[0]),
  );
}
