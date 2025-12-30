export const runtime = "edge";

/**
 * FridgeMap – MVP Mock (EDGE) v1.1
 * Deterministisk mock baseret på antal billeder + people
 */

const HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json; charset=utf-8",
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: HEADERS });

const normalizePeople = (raw) => {
  if (raw === "4+" || raw === "4") return "4+";
  if (raw === "2-3" || raw === "2" || raw === "3") return "2-3";
  return "1";
};

const pickHave = (count) => {
  const n = Math.min(count, 8);
  return n === 1
    ? ["mælk", "æg"]
    : ["æg", "gulerod", "kylling", "potatis"];
};

const pickRecipe = (have) => {
  if (!have.length) {
    return {
      recipe: {
        title: "Intet at lave endnu",
        difficulty: "nem",
        description: "Der blev ikke genkendt nok ingredienser."
      },
      missing: ["mælk", "æg", "brød"]
    };
  }

  const s = new Set(have);

  if (s.has("æg") && s.has("mælk")) {
    return {
      recipe: {
        title: "Omelet",
        difficulty: "nem",
        description: "Pisk æg med mælk og steg på pande."
      },
      missing: ["salt", "peber"]
    };
  }

  if (s.has("kylling")) {
    return {
      recipe: {
        title: "Kylling med grønt",
        difficulty: "nem",
        description: "Steg kylling og grøntsager sammen."
      },
      missing: ["olie", "salt", "peber"]
    };
  }

  return {
    recipe: {
      title: "Hurtig køleskabs-salat",
      difficulty: "nem",
      description: "Skær det du har og bland."
    },
    missing: ["dressing"]
  };
};

export default async function handler(req) {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: HEADERS });
  }

  if (req.method === "GET") {
    return json({ status: "API OK", runtime: "edge" });
  }

  if (req.method !== "POST") {
    return json({ error: "METHOD_NOT_ALLOWED" }, 405);
  }

  const body = await req.json().catch(() => ({}));
  const images = Array.isArray(body.images) ? body.images : [];
  const people = normalizePeople(body.people);

  if (!images.length) {
    return json({
      ingredients: { have: [], missing: [] },
      recipe: { title: "", difficulty: "", description: "" },
      priceEstimate: { min: 0, max: 0, currency: "DKK", store: "" }
    });
  }

  const have = pickHave(images.length);
  const chosen = pickRecipe(have);

  const factor = people === "4+" ? 2 : people === "2-3" ? 1.4 : 1;
  const price = {
    min: Math.round(20 * factor),
    max: Math.round(60 * factor),
    currency: "DKK",
    store: "Mock pris-estimat"
  };

  const title =
    people === "4+" ? `${chosen.recipe.title} til 4 personer` : chosen.recipe.title;

  return json({
    ingredients: { have, missing: chosen.missing },
    recipe: { ...chosen.recipe, title },
    priceEstimate: price
  });
}
