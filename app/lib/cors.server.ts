const ALLOWED_ORIGINS = new Set([
  "https://extensions.shopifycdn.com",
  "https://cdn.shopify.com",
]);

export function getCorsHeaders(request: Request) {
  const origin = request.headers.get("origin") ?? "";

  const allowOrigin = ALLOWED_ORIGINS.has(origin)
    ? origin
    : "https://extensions.shopifycdn.com";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    Vary: "Origin",
  };
}

export function corsPreflight(request: Request) {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(request),
  });
}

export function corsJson(
  request: Request,
  data: unknown,
  init?: ResponseInit,
) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...getCorsHeaders(request),
      ...(init?.headers ?? {}),
    },
  });
}

export async function withCors(
  request: Request,
  handler: () => Promise<Response>,
) {
  if (request.method === "OPTIONS") {
    return corsPreflight(request);
  }

  const response = await handler();
  const headers = new Headers(response.headers);

  Object.entries(getCorsHeaders(request)).forEach(([key, value]) => {
    headers.set(key, value);
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}