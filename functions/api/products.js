export async function onRequest(context) {
  const { request, env } = context;

  // ✅ Verify auth cookie properly
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(/auth=([^;]+)/);

  if (!match) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const token = match[1];
    const [payloadB64, sig] = token.split(".");
    const payload = JSON.parse(atob(payloadB64));

    // ✅ Verify HMAC signature
    const valid = await verifyHMAC(payloadB64, sig);

    if (!valid) throw "invalid signature";

    // ✅ Check expiration
    if (Date.now() > payload.exp) throw "expired";

  } catch (err) {
    return new Response("Unauthorized", { status: 401 });
  }

  // ✅ Routes
  if (request.method === "GET") {
    return getProducts(env);
  }

  if (request.method === "POST") {
    return updateProducts(request, env);
  }

  return new Response("Method not allowed", { status: 405 });
}

// ✅ GET products
async function getProducts(env) {
  const res = await fetch(
    `https://api.github.com/repos/${env.GITHUB_REPO}/contents/data/products.json`,
    {
      headers: {
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        "User-Agent": "cf-pages"
      }
    }
  );

  if (!res.ok) {
    return new Response("Failed to fetch products", { status: 500 });
  }

  const file = await res.json();

  // GitHub content is base64 with line breaks
  const decoded = atob(file.content.replace(/\n/g, ""));
  const content = JSON.parse(decoded);

  return new Response(JSON.stringify(content), {
    headers: {
      "Content-Type": "application/json"
    }
  });
}

// ✅ UPDATE products
async function updateProducts(request, env) {
  try {
    const body = await request.json();

    // 1️⃣ Get existing file from GitHub
    const getRes = await fetch(
      `https://api.github.com/repos/${env.GITHUB_REPO}/contents/data/products.json`,
      {
        headers: {
          Authorization: `Bearer ${env.GITHUB_TOKEN}`,
          "User-Agent": "cf-pages"
        }
      }
    );

    if (!getRes.ok) {
      return new Response("Failed to read existing file", { status: 500 });
    }

    const file = await getRes.json();

    // 2️⃣ Convert updated JSON to base64
    const updatedContent = btoa(
      JSON.stringify(body.products, null, 2)
    );

    // 3️⃣ Commit updated file
    const putRes = await fetch(
      `https://api.github.com/repos/${env.GITHUB_REPO}/contents/data/products.json`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${env.GITHUB_TOKEN}`,
          "Content-Type": "application/json",
          "User-Agent": "cf-pages"
        },
        body: JSON.stringify({
          message: "Update products from admin dashboard",
          content: updatedContent,
          sha: file.sha
        })
      }
    );

    if (!putRes.ok) {
      const errorText = await putRes.text();
      return new Response(errorText, { status: 500 });
    }

    return new Response(
      JSON.stringify({
        success: true
      }),
      {
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({
        success: false,
        error: err.toString()
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }
}

// ✅ Verify HMAC signature
async function verifyHMAC(payload, sig) {
  const secret = "sdj@2026!secureKeyfx7YFWyKfH";

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    {
      name: "HMAC",
      hash: "SHA-256"
    },
    false,
    ["verify"]
  );

  const decodedSig = Uint8Array.from(
    atob(sig),
    c => c.charCodeAt(0)
  );

  return crypto.subtle.verify(
    "HMAC",
    key,
    decodedSig,
    new TextEncoder().encode(payload)
  );
}