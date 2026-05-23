// In-memory failed attempts store (IP → {count, firstAttempt})
const failedAttempts = new Map();

// Multiple users
const USERS = {
  sdj1: "1234",
  sdj2: "5678",
  admin: "123"
};

// Rate limiter config
const MAX_ATTEMPTS = 5;
const BLOCK_TIME = 10 * 60 * 1000; // 10 minutes in ms

export async function onRequestPost(context) {
  const { request } = context;
  const url = new URL(request.url);
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";

  // Rate limiter check
  const attempt = failedAttempts.get(ip) || { count: 0, firstAttempt: Date.now() };
  if (attempt.count >= MAX_ATTEMPTS && Date.now() - attempt.firstAttempt < BLOCK_TIME) {
    return Response.redirect(url.origin + "/test/login?error=rate", 302);
  }

  // Reset after block time
  if (Date.now() - attempt.firstAttempt > BLOCK_TIME) {
    failedAttempts.set(ip, { count: 0, firstAttempt: Date.now() });
  }

  const form = await request.formData();
  const username = form.get("username");
  const password = form.get("password");

  // Check credentials
  if (!USERS[username] || USERS[username] !== password) {
    // Increment failed attempts
    failedAttempts.set(ip, { count: attempt.count + 1, firstAttempt: attempt.firstAttempt });
    return Response.redirect(url.origin + "/test/login?error=invalid", 302);
  }

  // Successful login → reset attempts
  failedAttempts.delete(ip);

  // Create session payload
  const payload = {
    u: username,
    exp: Date.now() + 60 * 60 * 1000 // 1 hour
  };

  const payloadB64 = btoa(JSON.stringify(payload));
  const sig = await signHMAC(payloadB64);
  const token = `${payloadB64}.${sig}`;

  return new Response(null, {
    status: 302,
    headers: {
    //   "Set-Cookie": `auth=${token}; HttpOnly; Secure; Path=/test; SameSite=Strict`,
    // Path=/test; to  Path=/; Now cookie works for:/test/* /api/*dashboard page can access API
      "Set-Cookie": `auth=${token}; HttpOnly; Secure; Path=/; SameSite=Strict`,
      "Location": "/test/ka" // redirect after login
    }
  });
}

// Sign payload using HMAC
async function signHMAC(payload) {
  const secret = "sdj@2026!secureKeyfx7YFWyKfH"; // must match middleware
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const sigBuffer = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return btoa(String.fromCharCode(...new Uint8Array(sigBuffer)));
}