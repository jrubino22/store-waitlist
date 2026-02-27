export async function requirePosIdToken(request: Request) {
    const authHeader = request.headers.get("authorization") ?? "";
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    const token = match?.[1];
  
    if (!token) {
      throw new Response(JSON.stringify({ error: "Missing Authorization token" }), {
        status: 401,
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    }
  
    return { token };
}