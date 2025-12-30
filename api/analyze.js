export const runtime = "nodejs";

/* =========================
   OPSKRIFTER (BASE)
========================= */
const RECIPES = [
  {
    level: "nem",
    title: "Omelet med ost",
    basePortions: 1,
    requires: ["æg", "ost"],
    extras: ["smør"],
    basePrice: 35
  },
  {
    level: "hurtig",
    title: "Pasta med tomatsauce",
    basePortions: 1,
    requires: ["pasta"],
    extras: ["tomatsauce", "løg"],
    basePrice: 50
  },
  {
    level: "avanceret",
    title: "Kyllingesalat",
    basePortions: 1,
    requires: ["salat"],
    extras: ["kylling", "dressing"],
    basePrice: 75
  }
];

/* =========================
   HELPERS
========================= */
function normalize(arr = []) {
  return [...new Set(arr.map(x => String(x).toLowerCase().trim()))];
}

function pickRecipe(level, ingredients) {
  return (
    RECIPES.find(r =>
      r.level === level &&
      r.requires.every(i => ingredients.includes(i))
    ) ||
    RECIPES.find(r => r.level === level) // fallback pr niveau
  );
}

function scalePrice(base, portions) {
  return Math.round(base * portions);
}

/* =========================
   HANDLER
========================= */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).json({ status: "API OK" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch {}
  }

  const portions = Math.min(Math.max(Number(body?.portions || 1), 1), 4);
  let ingredients = [];

  /* ---- Claude (valgfri / non-blocking) ---- */
  try {
    if (body?.images?.length && process.env.ANTHROPIC_API_KEY) {
      const image = body.images[0];
      const base64 = image.split(",").pop();

      const controller = new AbortController();
      setTimeout(() => controller.abort(), 7000);

      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2024-02-01"
        },
        body: JSON.stringify({
          model: "claude-3-5-sonnet-20240620",
          max_tokens: 300,
          messages: [{
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: "image/jpeg", data: base64 } },
              { type: "text", text: "Returner KUN et JSON array med danske ingredienser." }
            ]
          }]
        })
      });

      const j = await r.json();
      ingredients = normalize(JSON.parse(j?.content?.[0]?.text || "[]"));
    }
  } catch {
    ingredients = [];
  }

  /* ---- Opskrifter ---- */
  const simple = pickRecipe("nem", ingredients);
  const fast = pickRecipe("hurtig", ingredients);
  const advanced = pickRecipe("avanceret", ingredients);

  function formatRecipe(r) {
    return {
      level: r.level,
      title: r.title,
      portions,
      estimated_price: `${scalePrice(r.basePrice, portions)} kr`,
      store: "REMA 1000 (estimat)",
      shopping_list: r.extras.filter(x => !ingredients.includes(x))
    };
  }

  return res.status(200).json({
    ingredients_detected: ingredients,
    recipes: {
      simple: formatRecipe(simple),
      fast: formatRecipe(fast),
      advanced: formatRecipe(advanced)
    }
  });
}
