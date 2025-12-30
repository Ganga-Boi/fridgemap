export const runtime = "edge";

const HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json; charset=utf-8",
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: HEADERS });

const normalizePeople = (raw) => {
  const v = String(raw || "").trim();
  if (v === "4+" || v === "4") return "4+";
  if (v === "2-3" || v === "2" || v === "3") return "2-3";
  return "1";
};

const pickHave = (count) => {
  const n = Math.min(count, 8);
  return n === 1 ? ["mælk", "æg"] : ["æg", "gulerod", "kylling", "potatis"];
};

const pickRecipe = (have) => {
  if (!Array.isArray(have) || have.length === 0) {
    return {
      recipe: {
        title: "Intet at lave endnu",
        difficulty: "nem",
        description: "Der blev ikke genkendt nok ingredienser."
      },
      missing: ["mælk", "æg", "brød"]
    };
  }

  const s = new Set(have.map(x => String(x).toLowerCase()));
  if (s.has("æg") && s.has("mælk")) {
    return { recipe: { title: "Omelet", difficulty: "nem", description: "Pisk æg med mælk og steg på pande." }, missing: ["salt", "peber"] };
  }
  if (s.has("kylling") && (s.has("gulerod") || s.has("potatis"))) {
    return { recipe: { title: "Kylling med grønt", difficulty: "nem", description: "Steg kylling og grøntsager sammen." }, missing: ["olie", "salt", "peber"] };
  }
  return { recipe: { title: "Hurtig køleskabs-salat", difficulty: "nem", description: "Skær det du har og bland." }, missing: ["dressing"] };
};

const isReasonableBase64 = (str) => {
  if (typeof str !== "string") return false;
  return str.length <= 3_000_000; // ~2.25 MB image
};

export default async function handler(req) {
  try {
    if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: HEADERS });
    if (req.method === "GET") return json({ status: "API OK", runtime: "edge" });
    if (req.method !== "POST") return json({ error_code: "METHOD_NOT_ALLOWED" }, 405);

    let rawBody = "";
    try {
      rawBody = await req.text();
      if (!rawBody) throw new Error("Empty body");
      const body = JSON.parse(rawBody);

      const images = Array.isArray(body.images) ? body.images : [];
      const people = normalizePeople(body.people);

      if (images.length === 0) {
        return json({
          ingredients: { have: [], missing: [] },
          recipe: { title: "", difficulty: "", description: "" },
          priceEstimate: { min: 0, max: 0, currency: "DKK", store: "" },
          error_code: "NO_IMAGES"
        });
      }

      const oversized = images.findIndex(img => !isReasonableBase64(img));
      if (oversized !== -1) {
        return json({
          ingredients: { have: [], missing: [] },
          recipe: { title: "", difficulty: "", description: "" },
          priceEstimate: { min: 0, max: 0, currency: "DKK", store: "" },
          error_code: "IMAGE_TOO_LARGE",
          debug: process.env.NODE_ENV === "development" ? `Image ${oversized} too large` : undefined
        }, 413);
      }

      const have = pickHave(images.length);
      const chosen = pickRecipe(have);
      const factor = people === "4+" ? 2 : people === "2-3" ? 1.4 : 1;
      const price = {
        min: Math.round(20 * factor),
        max: Math.round(60 * factor),
        currency: "DKK",
        store: "Estimat (ingen butik-integration)"
      };
      const title = people === "4+" ? `${chosen.recipe.title} til 4 personer` : chosen.recipe.title;

      return json({
        ingredients: { have, missing: chosen.missing },
        recipe: { ...chosen.recipe, title },
        priceEstimate: price
      });

    } catch (parseErr) {
      return json({
        ingredients: { have: [], missing: [] },
        recipe: { title: "", difficulty: "", description: "" },
        priceEstimate: { min: 0, max: 0, currency: "DKK", store: "" },
        error_code: "INVALID_JSON",
        debug: process.env.NODE_ENV === "development" ? parseErr.message : undefined
      }, 400);
    }

  } catch (err) {
    return json({
      ingredients: { have: [], missing: [] },
      recipe: { title: "", difficulty: "", description: "" },
      priceEstimate: { min: 0, max: 0, currency: "DKK", store: "" },
      error_code: "INTERNAL_ERROR",
      debug: process.env.NODE_ENV === "development" ? `${err.name}: ${err.message}` : undefined
    }, 500);
  }
}
