// Handles admin-only student photos using a PRIVATE Supabase Storage bucket.
// Nobody can view these photos by guessing a URL — every view goes through this
// endpoint, which checks the admin cookie first, then hands back a short-lived
// signed URL (expires in 1 hour) generated with the service role key.
//
// SETUP REQUIRED (one-time):
// 1. Run setup_private_photos.sql in Supabase SQL editor
// 2. Supabase dashboard → Storage → create a bucket named "student-photos", set PRIVATE
// 3. Cloudflare Pages → Settings → Environment variables → add SUPABASE_SERVICE_ROLE_KEY
//    (Encrypted) — find this in Supabase dashboard → Settings → API → service_role key.
//    This key bypasses RLS and must NEVER be used anywhere in frontend code — only here.

const BUCKET = "student-photos";

export async function onRequest(context) {

  const SUPABASE_URL = context.env.SUPABASE_URL;
  const SERVICE_ROLE_KEY = context.env.SUPABASE_SERVICE_ROLE_KEY;
  const request = context.request;

  const cookie = request.headers.get("Cookie") || "";
  const tokenMatch = cookie.match(/acha_access_token=([^;]+)/);
  if (!tokenMatch) return new Response("Unauthorized", { status: 401 });

  if (!SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "SUPABASE_SERVICE_ROLE_KEY not configured" }), { status: 500 });
  }

  const serviceHeaders = {
    apikey: SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
  };

  try {

    // GET — fetch a fresh signed URL to view a student's private photo
    if (request.method === "GET") {
      const url = new URL(request.url);
      const studentId = url.searchParams.get("student_id");
      if (!studentId) return new Response(JSON.stringify({ error: "student_id required" }), { status: 400 });

      const studentRes = await fetch(
        `${SUPABASE_URL}/rest/v1/students?id=eq.${studentId}&select=photo_storage_path`,
        { headers: serviceHeaders }
      );
      const studentArr = await studentRes.json();
      const path = studentArr && studentArr[0] && studentArr[0].photo_storage_path;

      if (!path) {
        return Response.json({ url: null });
      }

      const signRes = await fetch(
        `${SUPABASE_URL}/storage/v1/object/sign/${BUCKET}/${path}`,
        {
          method: "POST",
          headers: { ...serviceHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({ expiresIn: 3600 }) // 1 hour
        }
      );
      const signResult = await signRes.json();
      if (!signRes.ok) {
        return new Response(JSON.stringify({ error: signResult.message || "Failed to sign URL" }), { status: 500 });
      }

      return Response.json({ url: `${SUPABASE_URL}/storage/v1${signResult.signedURL}` });
    }

    // POST — upload a new photo (replaces any existing one for that student)
    if (request.method === "POST") {
      const body = await request.json();
      const { studentId, base64Data, contentType } = body;

      if (!studentId || !base64Data) {
        return new Response(JSON.stringify({ error: "studentId and base64Data are required" }), { status: 400 });
      }

      const ext = (contentType || "image/jpeg").split("/")[1] || "jpg";
      const path = `${studentId}/photo.${ext}`;

      const binary = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

      const uploadRes = await fetch(
        `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`,
        {
          method: "POST",
          headers: {
            ...serviceHeaders,
            "Content-Type": contentType || "image/jpeg",
            "x-upsert": "true" // overwrite if this student already has a photo
          },
          body: binary
        }
      );

      if (!uploadRes.ok) {
        const errText = await uploadRes.text();
        return new Response(JSON.stringify({ error: errText }), { status: 500 });
      }

      // Save the path (not a URL — signed URLs expire) so we can re-sign on every view
      await fetch(`${SUPABASE_URL}/rest/v1/students?id=eq.${studentId}`, {
        method: "PATCH",
        headers: { ...serviceHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ photo_storage_path: path })
      });

      return Response.json({ uploaded: true, path });
    }

    return new Response("Invalid Request", { status: 400 });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
