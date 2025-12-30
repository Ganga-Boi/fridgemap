export const runtime = "edge";

export default function handler() {
  return new Response(
    JSON.stringify({ ok: true, message: "EDGE API OK" }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    }
  );
}

