export async function onRequest(context) {

  const SUPABASE_URL =
    context.env.SUPABASE_URL;

  const SUPABASE_KEY =
    context.env.SUPABASE_ANON_KEY;

  const today =
    new Date()
    .toLocaleDateString('sv-SE');

  try {

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/announcements?active=eq.true&start_date=lte.${today}&end_date=gte.${today}&order=id.desc`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`
        }
      }
    );

    const data =
      await response.json();

    return Response.json(data);

  } catch (err) {

    return new Response(
      JSON.stringify({
        error: err.message
      }),
      {
        status: 500
      }
    );

  }

}