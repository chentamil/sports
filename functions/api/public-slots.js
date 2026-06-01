export async function onRequest(context) {

  const ENABLE_CACHE = false;

  //  const ENABLE_CACHE = false;
  // cache is enabled by default, but can be disabled by replacing true with false, during testing/debug
  // s-maxage=300 means the response will be cached for 5 minutes, and stale-while-revalidate=60 means that if the cache is stale, it can still be served while a new response is being fetched in the background for up to 1 minute
  

  const SUPABASE_URL = context.env.SUPABASE_URL;
  const SUPABASE_KEY = context.env.SUPABASE_ANON_KEY;

  const cache = caches.default;

  const cacheKey = new Request(context.request.url, context.request);

  // Cache read
  if (ENABLE_CACHE) {

    const cached = await cache.match(cacheKey);

    if (cached) {
      return cached;
    }

  }

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
        ...(ENABLE_CACHE && {
          "Cache-Control": "public, s-maxage=150, stale-while-revalidate=30"
        }),
        "x-generated-at": Date.now().toString()
      }
    });

    // Cache write
    if (ENABLE_CACHE) {

      context.waitUntil(
        cache.put(cacheKey, response.clone())
      );

    }

    return response;

  } catch (err) {

    return new Response(JSON.stringify({
      error: err.message
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json"
      }
    });

  }
}