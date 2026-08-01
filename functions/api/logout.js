export async function onRequest() {

  // Clears the auth cookie by setting Max-Age=0
  return new Response(
    JSON.stringify({ success: true }),
    {
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": "acha_access_token=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0"
      }
    }
  );

}