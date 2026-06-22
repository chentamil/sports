export async function onRequestPost(context) {

  const SUPABASE_URL     = context.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = context.env.SUPABASE_ANON_KEY;

  try {

    const body = await context.request.json();

    const response = await fetch(
      `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
      {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: body.email,
          password: body.password
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return new Response(JSON.stringify(data), { status: 401 });
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: {
          "Content-Type": "application/json",
          // HttpOnly cookie — JS cannot read this, safer against XSS.
          // Max-Age=86400 means cookie expires in 24 hours.
          "Set-Cookie": `acha_access_token=${data.access_token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=86400`
        }
      }
    );

  } catch (err) {

    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500 }
    );

  }

}