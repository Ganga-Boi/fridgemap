export const config = { runtime: "edge" };

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

/* -------- Normalisering + ordbog -------- */

const SYNONYMS = {
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

const INGREDIENTS = {
  // base
  brød: "base",
  kartofler: "base",
  pasta: "base",
  ris: "base",
  yoghurt: "base",
  skyr: "base",

  // protein
  æg: "protein",
  kylling: "protein",
  fisk: "protein",

  // supplement
  ost: "supplement",
  smør: "supplement",
  olie: "supplement",
  mayonnaise: "supplement",

  // smag
  citron: "smag",
  chili: "smag",
  ketchup: "smag",
  sennep: "smag",
  hvidløg: "smag",
  salt: "smag",
  peber: "smag",

  // drik
  kaffe: "drik",
  mælk: "drik",
  øl: "drik",
};

function normalizeWord(word) {
  let w = (word || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.,;:!?()"]/g, "");

  // simple plural/definite stripping
  // kartofler -> kartofl (for synonym step) er for aggressivt, så vi gør mildt
  w = w.replace(/ene$/g, ""); // æggene -> ægg
  w = w.replace(/et$/g, "");  // ægget -> ægg
  w = w.replace(/en$/g, "");  // kaffen -> kaff
  w = w.replace(/er$/g, "");  // kartofler -> kartofl (kan hjælpe via synonym map hvis du vil udbygge)

  // synonym map
  if (SYNONYMS[w]) w = SYNONYMS[w];

  // hvis stripping gav “kartofl”, ret tilbage via synonym hvis muligt
  if (SYNONYMS[w]) w = SYNONYMS[w];

  return w;
}

function isFoodKey(key) {
  return Object.prototype.hasOwnProperty.call(INGREDIENTS, key);
}

function uniq(arr) {
  const out = [];
  const seen = new Set();
  for (const x of (arr || [])) {
    const n = normalizeWord(x);
    if (!n) continue;
    if (seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }
  return out;
}

function peopleLabel(p) {
  if (p === "4") return "4+ personer";
  if (p === "3") return "3 personer";
  if (p === "2") return "2 personer";
  return "1 person";
}

/* -------- Opskriftsmotor -------- */

const RECIPES = [
  {
    title: "Ostemad",
    desc: "Simpel klassiker.",
    requires: ["ost", "brød"],
    optional: ["smør"],
    minBase: 1
  },
  {
    title: "Smørstegte kartofler",
    desc: "Sprødt og enkelt på pande.",
    requires: ["kartofler"],
    optional: ["smør", "olie", "salt", "peber"],
    minBase: 1
  },
  {
    title: "Omelet",
    desc: "Pisk æg (mælk er valgfrit) og steg.",
    requires: ["æg"],
    optional: ["mælk", "salt", "peber", "smør"],
    minBase: 0
  },
  {
    title: "Cremet dressing",
    desc: "Skyr/yoghurt + citron + krydderier.",
    requires: ["skyr"],
    optional: ["yoghurt", "citron", "salt", "peber", "sennep"],
    minBase: 0
  },
  {
    title: "Mayo-dip",
    desc: "Mayonnaise + citron/chili giver hurtig dip.",
    requires: ["mayonnaise"],
    optional: ["citron", "chili", "salt", "peber"],
    minBase: 0
  },
  {
    title: "Kaffe med mælk",
    desc: "Sort eller mild – dit valg.",
    requires: ["kaffe"],
    optional: ["mælk"],
    minBase: 0
  },
];

function hasBase(chosenSet) {
  for (const x of chosenSet) {
    if (INGREDIENTS[x] === "base") return true;
  }
  return false;
}

function scoreRecipe(recipe, chosenSet) {
  const req = recipe.requires || [];
  const opt = recipe.optional || [];

  const overlapReq = req.filter(i => chosenSet.has(i)).length;
  const overlapOpt = opt.filter(i => chosenSet.has(i)).length;
  const missingReq = req.filter(i => !chosenSet.has(i));

  const overlapRatio = req.length ? (overlapReq / req.length) : 0;

  const baseBonus = hasBase(chosenSet) ? 0.22 : 0;
  const completeBonus = missingReq.length === 0 ? 0.25 : 0;

  // mild bonus for optional overlap (men mindre end requires)
  const optionalBonus = Math.min(0.18, overlapOpt * 0.06);

  // penalty hvis ingen base men opskriften “forventer” base
  const needsBase = (recipe.minBase || 0) > 0;
  const basePenalty = (!hasBase(chosenSet) && needsBase) ? -0.25 : 0;

  const score = (overlapRatio * 0.70) + baseBonus + completeBonus + optionalBonus + basePenalty;

  return {
    score,
    overlapReq,
    overlapOpt,
    missingReq,
  };
}

function buildSuggestions(chosen, people) {
  const chosenSet = new Set(chosen);

  const ranked = RECIPES
    .map((r) => {
      const { score, missingReq } = scoreRecipe(r, chosenSet);

      // drop total irrelevante opskrifter
      const overlapAny = (r.requires || []).some(i => chosenSet.has(i)) || (r.optional || []).some(i => chosenSet.has(i));
      if (!overlapAny) return null;

      // drop hvis minBase kræves men ingen base og næsten ingen match
      if ((r.minBase || 0) > 0 && !hasBase(chosenSet)) {
        const reqOverlap = (r.requires || []).filter(i => chosenSet.has(i)).length;
        if (reqOverlap === 0) return null;
      }

      const uses = [
        ...(r.requires || []).filter(i => chosenSet.has(i)),
        ...(r.optional || []).filter(i => chosenSet.has(i)),
      ];

      // missing = først requires, derefter et par “gode” optional
      const missing = [
        ...(r.requires || []).filter(i => !chosenSet.has(i)),
        ...(r.optional || []).filter(i => !chosenSet.has(i)),
      ].slice(0, 6);

      let title = r.title;
      if (people === "4") title += " (×4)";
      else if (people === "3") title += " (×3)";
      else if (people === "2") title += " (×2)";

      let desc = r.desc;
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
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  return ranked;
}

/* -------- Vision (valgfri) -------- */

function toOpenAIImageContent(dataUrl) {
  return { type: "input_image", image_url: dataUrl };
}

async function visionExtractWords(images, apiKey) {
  const system = `
Du udleder KUN madvarer/ingredienser som rå ord fra køleskabsbilleder.
Returnér KUN JSON:
{ "safe": [...], "unsure": [...] }
Ingen forklaringer.
`.trim();

  const userText = `Find ingredienser på billederne. Returnér kun JSON.`;

  const payload = {
    model: "gpt-4.1-mini",
    input: [
      { role: "system", content: [{ type: "input_text", text: system }] },
      { role: "user", content: [
        { type: "input_text", text: userText },
        ...images.slice(0, 6).map(toOpenAIImageContent)
      ] }
    ],
    max_output_tokens: 260
  };

  const resp = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "authorization": `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!resp.ok) {
    const t = await resp.text().catch(() => "");
    return { safe: [], unsure: [], error: `OPENAI_ERROR: ${t.slice(0, 400)}` };
  }

  const data = await resp.json();
  let text = (typeof data.output_text === "string") ? data.output_text : "";
  if (!text && Array.isArray(data.output)) {
    for (const item of data.output) {
      if (item && item.type === "message" && Array.isArray(item.content)) {
        for (const c of item.content) {
          if (c && (c.type === "output_text" || c.type === "text") && typeof c.text === "string") {
            text += c.text;
          }
        }
      }
    }
  }

  text = (text || "").trim();

  try {
    const parsed = JSON.parse(text);
    return {
      safe: Array.isArray(parsed.safe) ? parsed.safe : [],
      unsure: Array.isArray(parsed.unsure) ? parsed.unsure : [],
      error: null
    };
  } catch {
    return { safe: [], unsure: [], error: "OPENAI_JSON_PARSE_ERROR" };
  }
}

/* -------- Handler -------- */

export default async function handler(request) {
  try {
    if (request.method === "GET") {
      return json({ ok: true, message: "API ROUTE OK" });
    }
    if (request.method !== "POST") {
      return json({ ok: false, error: "METHOD_NOT_ALLOWED" }, 405);
    }

    const body = await request.json().catch(() => ({}));
    const images = Array.isArray(body.images) ? body.images : [];
    const ingredients = Array.isArray(body.ingredients) ? body.ingredients : [];
    const people = String(body.people || "1");

    // Mode A: ingredients direkte (bekræftet liste fra frontend)
    if (ingredients.length) {
      const raw = uniq(ingredients);
      const normalized = raw.map(normalizeWord).filter(Boolean);

      const nonFoodFromChosen = normalized.filter(x => !isFoodKey(x));
      const chosen = normalized.filter(x => isFoodKey(x));

      // hvis der er ikke-mad i det valgte, så returnér dem så frontend kan fjerne dem
      if (nonFoodFromChosen.length) {
        return json({
          ok: true,
          mode: "ingredients",
          nonFoodFromChosen: uniq(nonFoodFromChosen),
        });
      }

      const recipes = buildSuggestions(chosen, people);

      return json({
        ok: true,
        mode: "ingredients",
        chosen,
        peopleLabel: peopleLabel(people),
        recipes,
      });
    }

    // Mode B: images (billedanalyse hvis API key findes)
    if (images.length) {
      const apiKey = (typeof process !== "undefined" && process.env && process.env.OPENAI_API_KEY)
        ? process.env.OPENAI_API_KEY
        : undefined;

      if (!apiKey) {
        // uden key: ingen gæt, men returnér tomt forslag
        return json({
          ok: true,
          mode: "images",
          ingredients: { safe: [], unsure: [], nonFood: [] },
          message: "OPENAI_API_KEY_MISSING"
        });
      }

      const vision = await visionExtractWords(images, apiKey);

      const safeRaw = uniq(vision.safe);
      const unsureRaw = uniq(vision.unsure);

      // normaliser og split i food vs non-food
      const safeNorm = safeRaw.map(normalizeWord).filter(Boolean);
      const unsureNorm = unsureRaw.map(normalizeWord).filter(Boolean);

      const safeFood = uniq(safeNorm.filter(isFoodKey));
      const unsureFood = uniq(unsureNorm.filter(isFoodKey)).filter(x => !safeFood.includes(x));

      const nonFood = uniq([
        ...safeNorm.filter(x => !isFoodKey(x)),
        ...unsureNorm.filter(x => !isFoodKey(x)),
      ]);

      return json({
        ok: true,
        mode: "images",
        ingredients: {
          safe: safeFood,
          unsure: unsureFood,
          nonFood
        }
      });
    }

    return json({
      ok: true,
      mode: "empty",
      ingredients: { safe: [], unsure: [], nonFood: [] },
      message: "NO_INPUT"
    });

  } catch (err) {
    return json({ ok: false, error: "SERVER_ERROR", details: String(err?.message || err) }, 500);
  }
}
