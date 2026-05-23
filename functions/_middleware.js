// Middleware to protect /test/* pages
export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  // Protect only /test/*
  if (!url.pathname.startsWith("/test/")) return context.next();

  // Allow login page
  if (url.pathname === "/test/login") return context.next();

  // Check cookie
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(/auth=([^;]+)/);

  if (!match) {
    return Response.redirect(url.origin + "/test/login", 302);
  }

  try {
    const token = match[1];
    const [payloadB64, sig] = token.split(".");
    const payload = JSON.parse(atob(payloadB64));

    // Verify HMAC signature
    const valid = await verifyHMAC(payloadB64, sig);
    if (!valid) throw "invalid signature";

    // Check expiration
    if (Date.now() > payload.exp) throw "expired";

    return context.next();
  } catch {
    return Response.redirect(url.origin + "/test/login?error=expired", 302);
  }
}

// Verify HMAC signature using Web Crypto API
async function verifyHMAC(payload, sig) {
  const secret = "sdj@2026!secureKeyfx7YFWyKfH"; // change to strong random string
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );

  const decodedSig = Uint8Array.from(atob(sig), c => c.charCodeAt(0));
  const data = new TextEncoder().encode(payload);
  return crypto.subtle.verify("HMAC", key, decodedSig, data);
}