export const config = {
  maxDuration: 60,
  api: {
    bodyParser: {
      sizeLimit: "12mb",
    },
  },
};

/* ============================
   RECIPE DATABASE (RULE-BASED)
============================ */
const RECIPE_DATABASE = {
  simple: [
    { title: "Omelet med ost", requires: ["æg", "ost"] },
    { title: "Spejlæg", requires: ["æg"] },
    { title: "Brød med ost", requires: ["brød", "ost"] },
    { title: "Yoghurt", requires: ["yoghurt"] }
  ],
  advanced: [
    { title: "Æggekage med grønt", requires: ["æg"], missing: ["løg", "peberfrugt", "fløde"] },
    { title: "Pasta carbonara", requires: ["æg", "ost"], missing: ["pasta", "bacon", "fløde"] },
    { title: "Kyllingesalat", requires: ["salat"], missing: ["kylling", "dressing"] }
  ]
};

/* ============================
   INGREDIENT NORMALIZATION
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
    carrot: "gulerod", gulerod: "gulerod"
  };

  const key = value.toLowerCase().trim();
  return map[key] || key;
}

/* ============================
   IMAGE QUALITY GATE
============================ */
function scoreImageQuality(base64) {
  const buffer = Buffer.from(base64, "base64");
  const bytes = new Uint8Array(buffer);

  let score = 50;

  const sizeKB = bytes.length / 1024;
  if (sizeKB > 120) score += 15;
  if (sizeKB < 25) score -= 25;

  let sum = 0;
  let sumSq = 0;
  const step = Math.max(1, Math.floor(bytes.length / 8000));

  for (let i = 0; i < bytes.length; i += step) {
    sum += bytes[i];
    sumSq += bytes[i] * bytes[i];
  }

  const n = Math.floor(bytes.length / step);
  const mean = sum / n;
  const variance = sumSq / n - mean * mean;

  if (variance > 4000) score += 20;
  else if (variance < 1200) score -= 20;

  if (mean < 50 || mean > 200) score -= 20;

  return Math.max(0, Math.min(100, score));
}

function qualityGate(images, maxImages = 3) {
  const scored = images.map(img => {
    const base64 = img.replace(/^data:image\/\w+;base64,/, "");
    return { image: img, score: scoreImageQuality(base64) };
  });

  const passed = scored.filter(i => i.score >= 40);
  if (!passed.length) return { ok: false };

  passed.sort((a, b) => b.score - a.score);
  return { ok: true, images: passed.slice(0, maxImages).map(i => i.image) };
}

/* ============================
   SAFE PARSE
============================ */
function safeParseIngredients(text) {
  try {
    const match = text.match(/\[[^\]]*\]/);
    if (!match) return [];
    const parsed = JSON.parse(match[0]);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/* ============================
   CLAUDE IMAGE ANALYSIS
============================ */
async function analyzeImagesWithClaude(images, apiKey) {
  const content = images.map(img => ({
    type: "image",
    source: {
      type: "base64",
      media_type: "image/jpeg",
      data: img.replace(/^data:image\/\w+;base64,/, "")
    }
  }));

  content.push({
    type: "text",
    text: `
Identificer alle fødevarer og ingredienser du kan se.
Returner KUN et gyldigt JSON array med danske ingrediensnavne.
Ingen tekst før eller efter.
Hvis intet kan identificeres, returner [].
`
  });

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      messages: [{ role: "user", content }]
    })
  });

  const data = await response.json();
  const text = data.content?.[0]?.text || "[]";
  return safeParseIngredients(text);
}

/* ============================
   MERGE + DEDUP
============================ */
function mergeIngredients(list) {
  return [...new Set(list.map(normalizeIngredient))];
}

/* ============================
   RECIPE SELECTION
============================ */
function findRecipes(ingredients) {
  const has = i => ingredients.includes(i);

  const simple =
    RECIPE_DATABASE.simple.find(r =>
      r.requires.every(has)
    ) || { title: "", missing: [] };

  const advanced =
    RECIPE_DATABASE.advanced.find(r =>
      r.requires.every(has)
    ) || { title: "", missing: [] };

  return { simple, advanced };
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
    // Robust body parsing (handles string or object)
    let body = req.body;
    if (typeof body === "string") {
      try { body = JSON.parse(body); } catch { body = {}; }
    }

    const images = body.images || (body.image ? [body.image] : []);
    if (!images.length) return res.status(400).json({ error: "NO_IMAGES" });

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "NO_API_KEY" });

    const gate = qualityGate(images);
    if (!gate.ok) {
      return res.status(200).json({
        ingredients_detected: [],
        recipes: { simple: { title: "", missing: [] }, advanced: { title: "", missing: [] } },
        shopping_list: [],
        error_code: "NO_USABLE_IMAGES"
      });
    }

    const rawIngredients = await analyzeImagesWithClaude(gate.images, apiKey);
    const ingredients = mergeIngredients(rawIngredients);

    if (!ingredients.length) {
      return res.status(200).json({
        ingredients_detected: [],
        recipes: { simple: { title: "", missing: [] }, advanced: { title: "", missing: [] } },
        shopping_list: [],
        error_code: "NO_INGREDIENTS_DETECTED"
      });
    }

    const recipes = findRecipes(ingredients);
    const shopping = [...new Set([...(recipes.simple.missing || []), ...(recipes.advanced.missing || [])])];

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
