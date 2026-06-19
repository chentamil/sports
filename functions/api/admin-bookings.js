export async function onRequest(context) {

  const SUPABASE_URL =
    context.env.SUPABASE_URL;

  const request =
    context.request;

  const cookie =
    request.headers.get("Cookie") || "";

  const tokenMatch =
    cookie.match(
      /acha_access_token=([^;]+)/
    );

  if (!tokenMatch) {

    return new Response(
      "Unauthorized",
      { status: 401 }
    );

  }

  const accessToken =
    tokenMatch[1];

  try {

    // ==================
    // LOAD BOOKINGS
    // ==================

    if (
      request.method === "GET"
    ) {

      const response =
        await fetch(

`${SUPABASE_URL}/rest/v1/bookings?select=*&order=id.desc`,

          {
            headers: {
              apikey:
                context.env
                .SUPABASE_ANON_KEY,

              Authorization:
                `Bearer ${accessToken}`
            }
          }
        );

      const data =
        await response.json();

      return Response.json(data);

    }

    // ==================
    // ADD BOOKING
    // ==================

    if (
      request.method === "POST"
    ) {

      const body =
        await request.json();

      if (
        body.action === "add"
      ) {

        const response =
          await fetch(

`${SUPABASE_URL}/rest/v1/bookings`,

            {
              method:"POST",

              headers:{
                apikey:
                  context.env
                  .SUPABASE_ANON_KEY,

                Authorization:
                  `Bearer ${accessToken}`,

                "Content-Type":
                  "application/json",

                Prefer:
                  "return=minimal"
              },

              body:
                JSON.stringify([
                  body.data
                ])
            }
          );

        return new Response(
          response.ok
            ? "ok"
            : "failed",
          {
            status:
              response.ok
                ? 200
                : 500
          }
        );

      }

    }

    return new Response(
      "Invalid Request",
      {
        status:400
      }
    );

  }
  catch(err){

    return new Response(
      JSON.stringify({
        error:err.message
      }),
      {
        status:500
      }
    );

  }

}