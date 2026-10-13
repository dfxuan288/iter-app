/** A backend endpoint: takes a standard web Request and returns a standard web Response. */
export type Handler = (request: Request) => Response | Promise<Response>;

export interface ErrorBody {
  error: string;
  message: string;
}

/** A JSON reply. API replies are never cached unless an endpoint says otherwise. */
export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
  });
}

export function errorResponse(status: number, error: string, message: string): Response {
  return json({ error, message } satisfies ErrorBody, status);
}

/**
 * Wraps an endpoint so that an unexpected failure becomes a tidy JSON 500 instead of a crash,
 * and the details stay in the server log rather than being shown to the user.
 */
export function safely(handler: Handler): Handler {
  return async (request) => {
    try {
      return await handler(request);
    } catch (error) {
      console.error(`[${request.method} ${new URL(request.url).pathname}]`, error);
      return errorResponse(500, 'server_error', 'Something went wrong on the server.');
    }
  };
}
