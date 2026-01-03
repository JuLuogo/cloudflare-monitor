export function onRequest(context) {
  return new Response("Edge Functions is working!", {
    headers: { "content-type": "text/plain" }
  });
}
