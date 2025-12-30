export const runtime = "edge";

/**
 * FridgeMap – MVP Mock (EDGE) v1.1 (POLISHED)
 * - POST /api/analyze
 * - Input: { images: [dataUrlBase64, ...], people: "1" | "2-3" | "4+" }
 * - Output:
 *   {
 *     ingredients: { have:[], missing:[] },
 *     recipe: { title, difficulty, description },
 *     priceEstimate: { min, max, currency, store }
 *   }
 *
 * NOTE:
 * - Ingen eksterne kald
 * - Ingen AI
 * - Deterministisk mock
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json; charset=utf-8",
};

function safeJson(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS_HEADERS });
}

function normalizePeople(raw) {
  const v = String(raw || "").trim();
  if (v === "4+" || v === "4") return "4+";
  if (v === "2-3" || v === "2" || v === "3") return "2-3";
  return "1";
}

function pickMockHave(imagesCount) {
  // Matcher frontend-begrænsning (1–8 billeder)
  const count = Math.min(imagesCount, 8);

  if (count === 1) return ["mælk", "æg"];
  return ["æg", "gulerod", "kylling", "potatis"];
}

function pickRecipeFromHave(have) {
  if (!Array.isArray(have) || have.length === 0) {
    return {
      recipe: {
        title: "Intet at lave endnu",
        difficulty: "nem",
        description: "Vi kunne ikke genkende nok ingredienser til en opskrift."
      },
      missing: ["mælk", "æg", "brød"]
    };
  }

  const set = new Set(have.map(s => String(s).toLowerCase()));

  if (set.has("æg") && set.has("mælk")) {
    return {
      recipe: {
        title: "Omelet",
        difficulty: "nem",
        description: "Pisk æg med mælk. Steg på pande. Smag til med salt og peber."
      },
      missing: ["salt", "peber"]
    };
  }

  if (set.has("kylling") && (set.has("gulerod") || set.has("potatis"))) {
    return {
      recipe: {
        title: "Kylling med grønt",
        difficulty: "nem",
        description: "Skær kylling og grønt. Steg eller bag det sammen."
      },
      missing: ["olie", "salt", "peber"]
    };
  }

  return {
    recipe: {
      title: "Hurtig køleskabs-salat",
      difficulty: "nem",
      description: "Skær det du har i tern. Rør en simpel dressing. Bland og spis."
    },
    missing: ["dressing"]
  };
}

function applyPeopleAdjustments(recipeTitle, priceEstimate, people) {
  if (people !== "4+") return { title: recipeTitle, price: priceEstimate };

  return {
    title: `${recipeTitle} til 4 personer`,
    price: {
      ...priceEstimate,
      min: Math.max(priceEstimate.min, 40),
      max: Math.max(priceEstimate.max, 120),
    }
  };
}

export default async function handler(req) {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: CORS_HEADERS });
  }

  if (req.method === "GET") {
    return safeJson({ status: "API OK", endpoint: "/api/analyze", runtime: "edge" }, 200);
  }

  if (req.method !== "POST") {
    return safeJson({ error_code: "METHOD_NOT_ALLOWED" }, 405);
  }

  try {
    let body = {};
    try {
      body = await req.json();
    } catch {}

    const images = Array.isArray(body?.images) ? body.images : [];
    const people = normalizePeople(body?.people);

    if (images.length === 0) {
      return safeJson({
        ingredients: { have: [], missing: [] },
        recipe: { title: "", difficulty: "", description: "" },
        priceEstimate: { min: 0, max: 0, currency: "DKK", store: "" },
        error_code: "NO_IMAGES"
      }, 200);
    }

    const have = pickMockHave(images.length);
    const chosen = pickRecipeFromHave(have);
    const missing = chosen.missing;

    // Pris – gulv på 10 kr (ingen 0-kr output)
    const peopleFactor = people === "4+" ? 2 : (people === "2-3" ? 1.4 : 1);
    const baseMin = Math.max(missing.length ? 20 : 10, 10);
    const baseMax = Math.max(missing.length ? 60 : 20, 20);

    let priceEstimate = {
      min: Math.round(baseMin * peopleFactor),
      max: Math.round(baseMax * peopleFactor),
      currency: "DKK",
      store: "Mock pris-estimat (ingen butik-integration)"
    };

    const adj = applyPeopleAdjustments(chosen.recipe.title, priceEstimate, people);

    return safeJson({
      ingredients: { have, missing },
      recipe: { ...chosen.recipe, title: adj.title },
      priceEstimate: adj.price
    }, 200);

  } catch (err) {
    return safeJson({
      ingredients: { have: [], missing: [] },
      recipe: { title: "", difficulty: "", description: "" },
      priceEstimate: { min: 0, max: 0, currency: "DKK", store: "" },
      error_code: "INTERNAL_ERROR",
      ...(process.env.NODE_ENV === "development"
        ? { debug: String(err?.message || err) }
        : {})
    }, 200);
  }
}
