export async function onRequest(context) {

  const cookie = context.request.headers.get("Cookie") || "";
  const tokenMatch = cookie.match(/acha_access_token=([^;]+)/);

  if (!tokenMatch) {
    return new Response("Unauthorized", { status: 401 });
  }

  const accessToken = tokenMatch[1];

  try {

    // Supabase validates the JWT here — if token is expired/invalid it returns 401
    const response = await fetch(
      `${context.env.SUPABASE_URL}/auth/v1/user`,
      {
        headers: {
          apikey: context.env.SUPABASE_ANON_KEY,
          Authorization: `Bearer ${accessToken}`
        }
      }
    );

    if (!response.ok) {
      return new Response("Unauthorized", { status: 401 });
    }

    const user = await response.json();

    return Response.json({
      authenticated: true,
      email: user.email
    });

  } catch {

    return new Response("Unauthorized", { status: 401 });

  }

}