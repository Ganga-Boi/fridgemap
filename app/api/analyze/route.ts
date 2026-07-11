import { NextResponse } from "next/server";

export const runtime = "edge";

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

const SYNONYMS: Record<string, string> = {
  majonæse: "mayonnaise",
  mayo: "mayonnaise",
  yoghurt: "yoghurt",
  kartoffel: "kartofler",
  kartoffler: "kartofler",
  kartofler: "kartofler",
  løg: "løg",
  onions: "løg",
  milk: "mælk",
  cheese: "ost",
  butter: "smør",
  oil: "olie",
  lemon: "citron",
  beer: "øl",
  eggs: "æg",
  egg: "æg",
};

const INGREDIENTS: Record<string, string> = {
  brød: "base",
  kartofler: "base",
  pasta: "base",
  ris: "base",
  yoghurt: "base",
  skyr: "base",
  æg: "protein",
  kylling: "protein",
  fisk: "protein",
  ost: "supplement",
  smør: "supplement",
  olie: "supplement",
  mayonnaise: "supplement",
  citron: "smag",
  chili: "smag",
  ketchup: "smag",
  sennep: "smag",
  hvidløg: "smag",
  salt: "smag",
  peber: "smag",
  kaffe: "drik",
  mælk: "drik",
  øl: "drik",
};

const RECIPES = [
  {
    title: "Ostemad",
    desc: "Simpel klassiker.",
    requires: ["ost", "brød"],
    optional: ["smør"],
    minBase: 1,
  },
  {
    title: "Smørstegte kartofler",
    desc: "Sprødt og enkelt på pande.",
    requires: ["kartofler"],
    optional: ["smør", "olie", "salt", "peber"],
    minBase: 1,
  },
  {
    title: "Omelet",
    desc: "Pisk æg (mælk er valgfrit) og steg.",
    requires: ["æg"],
    optional: ["mælk", "salt", "peber", "smør"],
    minBase: 0,
  },
  {
    title: "Cremet dressing",
    desc: "Skyr/yoghurt + citron + krydderier.",
    requires: ["skyr"],
    optional: ["yoghurt", "citron", "salt", "peber", "sennep"],
    minBase: 0,
  },
  {
    title: "Mayo-dip",
    desc: "Mayonnaise + citron/chili giver hurtig dip.",
    requires: ["mayonnaise"],
    optional: ["citron", "chili", "salt", "peber"],
    minBase: 0,
  },
  {
    title: "Kaffe med mælk",
    desc: "Sort eller mild – dit valg.",
    requires: ["kaffe"],
    optional: ["mælk"],
    minBase: 0,
  },
];

function normalizeWord(word: string) {
  let normalized = (word || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.,;:!?()"]/g, "");

  normalized = normalized.replace(/ene$/g, "");
  normalized = normalized.replace(/et$/g, "");
  normalized = normalized.replace(/en$/g, "");
  normalized = normalized.replace(/er$/g, "");

  if (SYNONYMS[normalized]) normalized = SYNONYMS[normalized];
  if (SYNONYMS[normalized]) normalized = SYNONYMS[normalized];

  return normalized;
}

function isFoodKey(key: string) {
  return Object.prototype.hasOwnProperty.call(INGREDIENTS, key);
}

function uniq(items: string[]) {
  const output: string[] = [];
  const seen = new Set<string>();

  for (const item of items || []) {
    const normalized = normalizeWord(item);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    output.push(normalized);
  }

  return output;
}

function peopleLabel(people: string) {
  if (people === "4") return "4+ personer";
  if (people === "3") return "3 personer";
  if (people === "2") return "2 personer";
  return "1 person";
}

function hasBase(chosen: Set<string>) {
  for (const item of chosen) {
    if (INGREDIENTS[item] === "base") return true;
  }
  return false;
}

function scoreRecipe(recipe: (typeof RECIPES)[number], chosen: Set<string>) {
  const required = recipe.requires || [];
  const optional = recipe.optional || [];

  const overlapRequired = required.filter((item) => chosen.has(item)).length;
  const overlapOptional = optional.filter((item) => chosen.has(item)).length;
  const missingRequired = required.filter((item) => !chosen.has(item));

  const overlapRatio = required.length ? overlapRequired / required.length : 0;
  const baseBonus = hasBase(chosen) ? 0.22 : 0;
  const completeBonus = missingRequired.length === 0 ? 0.25 : 0;
  const optionalBonus = Math.min(0.18, overlapOptional * 0.06);
  const needsBase = (recipe.minBase || 0) > 0;
  const basePenalty = !hasBase(chosen) && needsBase ? -0.25 : 0;

  return {
    score: overlapRatio * 0.7 + baseBonus + completeBonus + optionalBonus + basePenalty,
    missingRequired,
  };
}

function buildSuggestions(chosenItems: string[], people: string) {
  const chosen = new Set(chosenItems);

  return RECIPES.map((recipe) => {
    const { score } = scoreRecipe(recipe, chosen);
    const overlapAny =
      recipe.requires.some((item) => chosen.has(item)) ||
      recipe.optional.some((item) => chosen.has(item));

    if (!overlapAny) return null;

    if ((recipe.minBase || 0) > 0 && !hasBase(chosen)) {
      const requiredOverlap = recipe.requires.filter((item) => chosen.has(item)).length;
      if (requiredOverlap === 0) return null;
    }

    const uses = [
      ...recipe.requires.filter((item) => chosen.has(item)),
      ...recipe.optional.filter((item) => chosen.has(item)),
    ];

    const missing = [
      ...recipe.requires.filter((item) => !chosen.has(item)),
      ...recipe.optional.filter((item) => !chosen.has(item)),
    ].slice(0, 6);

    let title = recipe.title;
    if (people === "4") title += " (×4)";
    else if (people === "3") title += " (×3)";
    else if (people === "2") title += " (×2)";

    let desc = recipe.desc;
    if (people === "4") desc += " Brug ca. dobbelt mængde og smag til.";
    if (people === "3") desc += " Skru mængderne op og smag til.";
    if (people === "2") desc += " Lav lidt ekstra – smag til.";

    return {
      title,
      desc,
      uses,
      missing,
      score: Math.round(score * 100) / 100,
    };
  })
    .filter(Boolean)
    .sort((a, b) => b!.score - a!.score)
    .slice(0, 6);
}

function toOpenAIImageContent(dataUrl: string) {
  return { type: "input_image", image_url: dataUrl };
}

async function visionExtractWords(images: string[], apiKey: string) {
  const system = `
Du udleder KUN madvarer/ingredienser som rå ord fra køleskabsbilleder.
Returnér KUN JSON:
{ "safe": [...], "unsure": [...] }
Ingen forklaringer.
`.trim();

  const payload = {
    model: "gpt-4.1-mini",
    input: [
      { role: "system", content: [{ type: "input_text", text: system }] },
      {
        role: "user",
        content: [
          { type: "input_text", text: "Find ingredienser på billederne. Returnér kun JSON." },
          ...images.slice(0, 6).map(toOpenAIImageContent),
        ],
      },
    ],
    max_output_tokens: 260,
  };

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    return { safe: [], unsure: [], error: `OPENAI_ERROR: ${text.slice(0, 400)}` };
  }

  const data = await response.json();
  let text = typeof data.output_text === "string" ? data.output_text : "";
  if (!text && Array.isArray(data.output)) {
    for (const item of data.output) {
      if (item?.type !== "message" || !Array.isArray(item.content)) continue;
      for (const content of item.content) {
        if ((content?.type === "output_text" || content?.type === "text") && typeof content.text === "string") {
          text += content.text;
        }
      }
    }
  }

  try {
    const parsed = JSON.parse((text || "").trim());
    return {
      safe: Array.isArray(parsed.safe) ? parsed.safe : [],
      unsure: Array.isArray(parsed.unsure) ? parsed.unsure : [],
      error: null,
    };
  } catch {
    return { safe: [], unsure: [], error: "OPENAI_JSON_PARSE_ERROR" };
  }
}

export async function GET() {
  return json({ ok: true, message: "API ROUTE OK" });
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const images = Array.isArray(body.images) ? body.images : [];
    const ingredients = Array.isArray(body.ingredients) ? body.ingredients : [];
    const people = String(body.people || "1");

    if (ingredients.length) {
      const normalized = uniq(ingredients).map(normalizeWord).filter(Boolean);
      const nonFoodFromChosen = normalized.filter((item) => !isFoodKey(item));
      const chosen = normalized.filter((item) => isFoodKey(item));

      if (nonFoodFromChosen.length) {
        return json({
          ok: true,
          mode: "ingredients",
          nonFoodFromChosen: uniq(nonFoodFromChosen),
        });
      }

      return json({
        ok: true,
        mode: "ingredients",
        chosen,
        peopleLabel: peopleLabel(people),
        recipes: buildSuggestions(chosen, people),
      });
    }

    if (images.length) {
      const apiKey =
        typeof process !== "undefined" && process.env && process.env.OPENAI_API_KEY
          ? process.env.OPENAI_API_KEY
          : undefined;

      if (!apiKey) {
        return json({
          ok: true,
          mode: "images",
          ingredients: { safe: [], unsure: [], nonFood: [] },
          message: "OPENAI_API_KEY_MISSING",
        });
      }

      const vision = await visionExtractWords(images, apiKey);
      const safeNorm = uniq(vision.safe).map(normalizeWord).filter(Boolean);
      const unsureNorm = uniq(vision.unsure).map(normalizeWord).filter(Boolean);

      const safeFood = uniq(safeNorm.filter(isFoodKey));
      const unsureFood = uniq(unsureNorm.filter(isFoodKey)).filter((item) => !safeFood.includes(item));
      const nonFood = uniq([
        ...safeNorm.filter((item) => !isFoodKey(item)),
        ...unsureNorm.filter((item) => !isFoodKey(item)),
      ]);

      return json({
        ok: true,
        mode: "images",
        ingredients: {
          safe: safeFood,
          unsure: unsureFood,
          nonFood,
        },
      });
    }

    return json({
      ok: true,
      mode: "empty",
      ingredients: { safe: [], unsure: [], nonFood: [] },
      message: "NO_INPUT",
    });
  } catch (error) {
    return json(
      {
        ok: false,
        error: "SERVER_ERROR",
        details: String((error as Error)?.message || error),
      },
      500
    );
  }
}
