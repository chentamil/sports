export async function onRequest(context) {

  const SUPABASE_URL = context.env.SUPABASE_URL;
  const SUPABASE_KEY = context.env.SUPABASE_ANON_KEY;

    return new Response(
    JSON.stringify({
      SUPABASE_URL: context.env.SUPABASE_URL || null,
      HAS_KEY: !!context.env.SUPABASE_ANON_KEY
    }),
    {
      headers: {
        "Content-Type": "application/json"
      }
    }
  );

  try {

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/slots?select=*,courts(id,name)`,
      {
        headers: {
          apikey: SUPABASE_KEY
        }
      }
    );

    const data = await res.json();

    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {

    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}