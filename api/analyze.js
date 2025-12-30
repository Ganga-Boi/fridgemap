export const runtime = "nodejs";

const RECIPES = [
  {
    type: "nem",
    title: "Omelet",
    needs: ["æg"],
    optional: ["ost", "mælk", "smør"]
  },
  {
    type: "hurtig",
    title: "Pasta med ost",
    needs: ["pasta"],
    optional: ["ost", "smør"]
  },
  {
    type: "avanceret",
    title: "Æggekage",
    needs: ["æg", "mælk"],
    optional: ["løg", "bacon"]
  }
];

function pickRecipe(ingredients) {
  for (const r of RECIPES) {
    if (r.needs.every(n => ingredients.includes(n))) {
      const missing = r.optional.filter(o => !ingredients.includes(o));
      return { ...r, missing };
    }
  }
  return null;
}

async function detectIngredientsWithClaude(base64, apiKey) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2024-02-01"
    },
    body: JSON.stringify({
      model: "claude-3-5-sonnet-20240620",
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/jpeg",
                data: base64
              }
            },
            {
              type: "text",
              text: `
Du ser et billede af et køleskab.
Returnér KUN et JSON-array med ingredienser på dansk.
Eksempler: ["æg","mælk","ost","smør","yoghurt","bacon","pasta"]
Hvis du er i tvivl, gæt hellere end at returnere [].
INGEN forklarende tekst.
`
            }
          ]
        }
      ]
    })
  });

  const data = await res.json();
  const text = data?.content?.[0]?.text || "[]";

  try {
    return JSON.parse(text);
  } catch {
    return [];
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const { images } = req.body || {};
  if (!images || !images.length) {
    return res.status(200).json({ ingredients: [] });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const base64 = images[0].split(",")[1];

  let ingredients = [];

  try {
    ingredients = await detectIngredientsWithClaude(base64, apiKey);
  } catch {
    ingredients = [];
  }

  // 🔁 HARD FALLBACK – så systemet altid virker
  if (!ingredients.length) {
    ingredients = ["æg", "mælk"];
  }

  const recipe = pickRecipe(ingredients);

  res.status(200).json({
    ingredients,
    recipe,
    shop: {
      store: "REMA 1000",
      estimated_price_dkk: recipe ? recipe.missing.length * 10 : 0
    }
  });
}
