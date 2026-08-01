export async function onRequest(context) {

  // Set true to enable Cloudflare edge caching (good for production).
  // Set false to always fetch fresh data (good for testing/debug).
  // s-maxage=300 means the response will be cached for 5 minutes, and stale-while-revalidate=60 means that if the cache is stale, it can still be served while a new response is being fetched in the background for up to 1 minute
  //  const ENABLE_CACHE = true;

  const ENABLE_CACHE = false;

  const SUPABASE_URL = context.env.SUPABASE_URL;
  const SUPABASE_KEY = context.env.SUPABASE_ANON_KEY;

  const cache = caches.default;
  const cacheKey = new Request(context.request.url, context.request);

  // ==================
  // CACHE READ
  // ==================

  if (ENABLE_CACHE) {
    const cached = await cache.match(cacheKey);
    if (cached) return cached;
  }

  // ==================
  // FETCH FROM SUPABASE
  // ==================

  try {

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/slots?select=*,courts(id,name)`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`
        }
      }
    );

    const data = await res.json();

    const response = new Response(JSON.stringify(data), {
      headers: {
        "Content-Type": "application/json",
        // Cache-Control header is only added when caching is enabled.
        // s-maxage=150 → CDN caches for 150 seconds.
        // stale-while-revalidate=30 → serves stale while refreshing in background.
        ...(ENABLE_CACHE && {
          "Cache-Control": "public, s-maxage=150, stale-while-revalidate=30"
        }),
        "x-generated-at": Date.now().toString()
      }
    });

    // ==================
    // CACHE WRITE
    // ==================

    if (ENABLE_CACHE) {
      context.waitUntil(cache.put(cacheKey, response.clone()));
    }

    return response;

  } catch (err) {

    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );

  }

}
