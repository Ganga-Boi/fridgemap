export const config = {
  maxDuration: 60,
  api: {
    bodyParser: {
      sizeLimit: "12mb",
    },
  },
};

/* ============================
   RECIPE DATABASE
============================ */
const RECIPE_DATABASE = {
  simple: [
    { title: "Omelet med ost", requires: ["æg", "ost"] },
    { title: "Spejlæg", requires: ["æg"] },
    { title: "Brød med ost", requires: ["brød", "ost"] },
    { title: "Yoghurt med frugt", requires: ["yoghurt"] },
    { title: "Rugbrød med smør", requires: ["brød", "smør"] }
  ],
  advanced: [
    { title: "Æggekage med grønt", requires: ["æg"], missing: ["løg", "peberfrugt", "fløde"] },
    { title: "Pasta carbonara", requires: ["æg", "ost"], missing: ["pasta", "bacon", "fløde"] },
    { title: "Kyllingesalat", requires: ["salat"], missing: ["kylling", "dressing"] }
  ]
};

/* ============================
   NORMALIZATION
============================ */
function normalizeIngredient(value) {
  const map = {
    egg: "æg", eggs: "æg", æg: "æg",
    cheese: "ost", ost: "ost",
    milk: "mælk", mælk: "mælk",
    butter: "smør", smør: "smør",
    bread: "brød", brød: "brød",
    yogurt: "yoghurt", yoghurt: "yoghurt",
    ham: "skinke", skinke: "skinke",
    bacon: "bacon",
    onion: "løg", løg: "løg",
    tomato: "tomat", tomat: "tomat",
    lettuce: "salat", salat: "salat",
    chicken: "kylling", kylling: "kylling",
    carrot: "gulerod", gulerod: "gulerod",
    cream: "fløde", fløde: "fløde",
    pepper: "peberfrugt", peberfrugt: "peberfrugt",
    mayonnaise: "mayonnaise", mayo: "mayonnaise",
    kartofler: "kartoffel", kartoffel: "kartoffel"
  };

  const key = String(value || "").toLowerCase().trim();
  return map[key] || key;
}

/* ============================
   BASE64 HELPERS
============================ */
function extractBase64(dataUrlOrBase64) {
  const match = String(dataUrlOrBase64).match(/^data:[^;]+;base64,(.+)$/);
  return match ? match[1] : String(dataUrlOrBase64);
}

function detectMediaType(dataUrlOrBase64) {
  const s = String(dataUrlOrBase64);

  // Data URL prefix
  const m = s.match(/^data:([^;]+);base64,/);
  if (m) return m[1];

  // Raw base64 signatures (first bytes)
  const raw = s.slice(0, 20);
  if (raw.startsWith("/9j/")) return "image/jpeg";
  if (raw.startsWith("iVBOR")) return "image/png";
  if (raw.startsWith("R0lG")) return "image/gif";
  if (raw.startsWith("UklG")) return "image/webp";

  return "image/jpeg";
}

/* ============================
   SAFE PARSE (JSON ARRAY)
============================ */
function safeParseArray(text) {
  try {
    const match = String(text || "").match(/\[[\s\S]*\]/);
    if (!match) return [];
    const parsed = JSON.parse(match[0]);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/* ============================
   LOCAL IMAGE PICKER (CONTRACT-TRO)
   - bruger må sende flere billeder
   - backend vælger ÉT billede deterministisk
============================ */
function pickBestImage(images) {
  // Robust og enkel: vælg det største base64 payload (ofte mest detalje)
  let best = images[0];
  let bestLen = extractBase64(best).length;

  for (const img of images) {
    const len = extractBase64(img).length;
    if (len > bestLen) {
      best = img;
      bestLen = len;
    }
  }
  return best;
}

/* ============================
   RECIPE SELECTION
============================ */
function findRecipes(ingredients) {
  const has = i => ingredients.includes(i);

  const simple = RECIPE_DATABASE.simple.find(r => r.requires.every(has))
    || { title: "", missing: [] };

  const advanced = RECIPE_DATABASE.advanced.find(r => r.requires.every(has))
    || { title: "", missing: [] };

  return { simple, advanced };
}

/* ============================
   CLAUDE CALL (ÉT billede pr request)
============================ */
async function analyzeSingleImageWithClaude({ image, apiKey }) {
  const mediaType = detectMediaType(image);
  const base64Data = extractBase64(image);

  // meget vigtig sanity check
  if (!base64Data || base64Data.length < 20000) {
    return { ok: false, error_code: "IMAGE_TOO_SMALL" };
  }

  const content = [
    {
      type: "image",
      source: {
        type: "base64",
        media_type: mediaType,
        data: base64Data
      }
    },
    {
      type: "text",
      text:
`Identificer alle fødevarer og ingredienser du kan se i dette køleskabsbillede.

Returner KUN et gyldigt JSON array med danske ingrediensnavne.
Ingen tekst før eller efter.
Hvis intet kan identificeres, returner [].

Eksempel: ["yoghurt","smør","mayonnaise","kartoffel"]`
    }
  ];

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2024-02-01"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      messages: [{ role: "user", content }]
    })
  });

  if (!resp.ok) {
    const errText = await resp.text();
    return {
      ok: false,
      error_code: "API_ERROR",
      debug: errText.slice(0, 400)
    };
  }

  const data = await resp.json();
  const text = data?.content?.[0]?.text ?? "[]";
  const raw = safeParseArray(text);

  return { ok: true, ingredients: raw };
}

/* ============================
   HANDLER
============================ */
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  try {
    // Robust body parse
    let body = req.body;
    if (typeof body === "string") {
      try { body = JSON.parse(body); } catch { body = {}; }
    }

    const images = body?.images || (body?.image ? [body.image] : []);
    if (!Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: "NO_IMAGES" });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "NO_API_KEY" });
    }

    // CONTRACT-TRO: vælg ÉT billede deterministisk
    const bestImage = pickBestImage(images);

    // Claude: ÉT billede pr request
    const analysis = await analyzeSingleImageWithClaude({ image: bestImage, apiKey });

    if (!analysis.ok) {
      return res.status(200).json({
        ingredients_detected: [],
        recipes: { simple: { title: "", missing: [] }, advanced: { title: "", missing: [] } },
        shopping_list: [],
        error_code: analysis.error_code || "ANALYSIS_FAILED",
        debug: analysis.debug
      });
    }

    // Normalize + dedupe
    const ingredients = [...new Set((analysis.ingredients || []).map(normalizeIngredient))]
      .filter(x => x && x.length > 1);

    if (ingredients.length === 0) {
      return res.status(200).json({
        ingredients_detected: [],
        recipes: { simple: { title: "", missing: [] }, advanced: { title: "", missing: [] } },
        shopping_list: [],
        error_code: "NO_INGREDIENTS_DETECTED",
        message: "Kunne ikke finde ingredienser. Tag et tydeligere billede med bedre lys."
      });
    }

    const recipes = findRecipes(ingredients);
    const shopping = [...new Set([
      ...(recipes.simple.missing || []),
      ...(recipes.advanced.missing || [])
    ])];

    return res.status(200).json({
      ingredients_detected: ingredients,
      recipes,
      shopping_list: shopping
    });

  } catch (err) {
    return res.status(200).json({
      ingredients_detected: [],
      recipes: { simple: { title: "", missing: [] }, advanced: { title: "", missing: [] } },
      shopping_list: [],
      error_code: "INTERNAL_ERROR",
      debug: String(err?.message || err)
    });
  }
}
