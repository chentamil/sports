export async function onRequest(context) {

  const cookie =
    context.request.headers.get("Cookie") || "";

  const tokenMatch =
    cookie.match(/acha_access_token=([^;]+)/);

  if (!tokenMatch) {

    return new Response("Unauthorized", {
      status: 401
    });

  }

  return Response.json({
    authenticated: true
  });

}