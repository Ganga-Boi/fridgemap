export const runtime = "edge";

const HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: HEADERS });

export default async function handler(request) {
  try {
    // OPTIONS
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 200, headers: HEADERS });
    }

    // GET test
    if (request.method === "GET") {
      return json({ ok: true, message: "EDGE API OK" });
    }

    if (request.method !== "POST") {
      return json({ error: "METHOD_NOT_ALLOWED" }, 405);
    }

    const body = await request.json();
    const images = Array.isArray(body.images) ? body.images : [];
    const people = body.people || "1";

    if (!images.length) {
      return json({
        ingredients: { have: [], missing: [] },
        recipe: { title: "", difficulty: "", description: "" },
        priceEstimate: { min: 0, max: 0, currency: "DKK", store: "" },
        error_code: "NO_IMAGES"
      });
    }

    const have = images.length === 1
      ? ["mælk", "æg"]
      : ["æg", "gulerod", "kylling", "kartofler"];

    return json({
      ingredients: {
        have,
        missing: ["salt", "peber"]
      },
      recipe: {
        title: people === "4+" ? "Omelet til 4 personer" : "Omelet",
        difficulty: "nem",
        description: "Pisk æg med mælk og steg på pande."
      },
      priceEstimate: {
        min: 20,
        max: people === "4+" ? 120 : 60,
        currency: "DKK",
        store: "Mock"
      }
    });

  } catch (err) {
    return json({
      error: "INTERNAL_ERROR",
      message: err.message
    }, 500);
  }
}
