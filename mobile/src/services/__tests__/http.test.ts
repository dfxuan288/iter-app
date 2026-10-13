import { healthService } from '../healthService';
import { requestJson } from '../http';

function jsonResponse(body: unknown, status = 200): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as unknown as Response;
}

describe('requestJson', () => {
  it('returns the parsed body on success', async () => {
    const fetchImpl = jest.fn(async () => jsonResponse({ hello: 'world' }));
    const result = await requestJson<{ hello: string }>('https://example.test/x', { fetchImpl });
    expect(result).toEqual({ ok: true, data: { hello: 'world' } });
  });

  it('sends a JSON body on POST', async () => {
    const fetchImpl = jest.fn(async () => jsonResponse({}));
    await requestJson('https://example.test/x', { method: 'POST', body: { a: 1 }, fetchImpl });
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://example.test/x',
      expect.objectContaining({ method: 'POST', body: '{"a":1}', headers: { 'Content-Type': 'application/json' } }),
    );
  });

  it('reports "offline" when the network call fails, without throwing', async () => {
    const fetchImpl = jest.fn(async () => {
      throw new TypeError('Network request failed');
    });
    await expect(requestJson('https://example.test/x', { fetchImpl })).resolves.toEqual({
      ok: false,
      reason: 'offline',
    });
  });

  it('reports "timeout" when the server takes too long', async () => {
    const fetchImpl = jest.fn(
      (_url: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    );
    const result = await requestJson('https://example.test/x', { fetchImpl, timeoutMs: 10 });
    expect(result).toEqual({ ok: false, reason: 'timeout' });
  });

  it('reports "server" with the status for error responses', async () => {
    const fetchImpl = jest.fn(async () => jsonResponse({ error: 'x' }, 503));
    await expect(requestJson('https://example.test/x', { fetchImpl })).resolves.toEqual({
      ok: false,
      reason: 'server',
      status: 503,
    });
  });

  it('reports "invalid_response" when the reply is not JSON', async () => {
    const fetchImpl = jest.fn(
      async () =>
        ({
          ok: true,
          status: 200,
          json: async () => {
            throw new SyntaxError('Unexpected token <');
          },
        }) as unknown as Response,
    );
    await expect(requestJson('https://example.test/x', { fetchImpl })).resolves.toEqual({
      ok: false,
      reason: 'invalid_response',
      status: 200,
    });
  });
});

describe('healthService.check', () => {
  it('accepts a well-formed health reply', async () => {
    const health = { status: 'ok', service: 'iter-server', version: '0.1.0', time: 'now', aiConfigured: false };
    const result = await healthService.check({ fetchImpl: jest.fn(async () => jsonResponse(health)) });
    expect(result).toEqual({ ok: true, data: health });
  });

  it('rejects a reply that is not from the ITER server', async () => {
    const result = await healthService.check({ fetchImpl: jest.fn(async () => jsonResponse({ status: 'weird' })) });
    expect(result).toEqual({ ok: false, reason: 'invalid_response' });
  });
});
