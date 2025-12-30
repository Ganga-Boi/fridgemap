export const runtime = "nodejs";

/**
 * STABIL BASELINE v1
 * - POST /api/analyze
 * - Input: { images: [dataUrlBase64, ...] }
 * - Output:
 *   {
 *     ingredients: { have:[], missing:[] },
 *     recipe: { title, difficulty, description },
 *     priceEstimate: { min, max, currency, store }
 *   }
 */

function pickRecipe(have) {
  const set = new Set(have.map(s => s.toLowerCase()));

  // super-simple regler (udskiftes senere af “rigtig” logik)
  if (set.has("æg") && (set.has("brød") || set.has("rugbrød"))) {
    return {
      recipe: { title: "Spejlæg på brød", difficulty: "nem", description: "Steg 2 æg. Rist brød. Server med salt/peber." },
      missing: ["salt", "peber"]
    };
  }

  if (set.has("yoghurt")) {
    return {
      recipe: { title: "Yoghurt med frugt", difficulty: "nem", description: "Bland yoghurt med frugt. Top med evt. honning." },
      missing: ["frugt"]
    };
  }

  return {
    recipe: { title: "Hurtig køleskabs-salat", difficulty: "nem", description: "Skær det du har i tern. Rør en hurtig dressing. Bland og spis." },
    missing: ["dressing"]
  };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS, GET");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method === "GET") {
    return res.status(200).json({ status: "API OK", endpoint: "/api/analyze" });
  }

  if (req.method !== "POST") return res.status(405).end();

  try {
    let body = req.body;
    if (typeof body === "string") {
      try { body = JSON.parse(body); } catch { body = {}; }
    }

    const images = body?.images || [];
    if (!Array.isArray(images) || images.length === 0) {
      // Stabilt svar (ingen hard fail)
      return res.status(200).json({
        ingredients: { have: [], missing: [] },
        recipe: { title: "", difficulty: "", description: "" },
        priceEstimate: { min: 0, max: 0, currency: "DKK", store: "" },
        error_code: "NO_IMAGES"
      });
    }

    // BASELINE: Vi “simulerer” at vi fandt noget, så UX virker.
    // Du kan udskifte have[] med rigtig vision senere (Claude).
    const have = ["æg", "brød", "smør"]; // <- kan ændres senere
    const chosen = pickRecipe(have);

    const missing = chosen.missing;

    // Pris-estimat (placeholder)
    const priceEstimate = {
      min: missing.length ? 20 : 0,
      max: missing.length ? 60 : 0,
      currency: "DKK",
      store: "Pris-estimat er placeholder (ikke butik-integration endnu)"
    };

    return res.status(200).json({
      ingredients: { have, missing },
      recipe: chosen.recipe,
      priceEstimate
    });

  } catch (err) {
    return res.status(200).json({
      ingredients: { have: [], missing: [] },
      recipe: { title: "", difficulty: "", description: "" },
      priceEstimate: { min: 0, max: 0, currency: "DKK", store: "" },
      error_code: "INTERNAL_ERROR",
      debug: String(err?.message || err)
    });
  }
}
