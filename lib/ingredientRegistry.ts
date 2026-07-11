import type { Recipe } from "../types/contracts";

export interface IngredientDefinition {
  ingredientId: string;
  displayName: string;
  aliases: string[];
}

const CANONICAL_INGREDIENTS: IngredientDefinition[] = [
  { ingredientId: "aeg", displayName: "æg", aliases: ["aeg", "ag"] },
  { ingredientId: "agurk", displayName: "agurk", aliases: ["agurk", "cucumber"] },
  { ingredientId: "bacon", displayName: "bacon", aliases: ["bacon"] },
  { ingredientId: "broccoli", displayName: "broccoli", aliases: ["broccoli"] },
  { ingredientId: "bouillon_terning", displayName: "bouillonterning", aliases: ["bouillon", "bouillonterning", "terning bouillon"] },
  { ingredientId: "creme_fraiche", displayName: "creme fraiche", aliases: ["creme fraiche", "cremefraiche"] },
  { ingredientId: "floede", displayName: "fløde", aliases: ["floede", "flode", "madlavningsflode", "piskeflode"] },
  { ingredientId: "gulerod", displayName: "gulerod", aliases: ["gulerod", "gulerodder"] },
  { ingredientId: "hakket_oksekoed", displayName: "hakket oksekød", aliases: ["hakket oksekoed", "oksekoed", "hakkekod", "minced beef"] },
  { ingredientId: "hvedemel", displayName: "hvedemel", aliases: ["hvedemel", "mel"] },
  { ingredientId: "hvidloeg", displayName: "hvidløg", aliases: ["hvidloeg", "hvidlog"] },
  { ingredientId: "karrypasta", displayName: "karry", aliases: ["karry", "karrypasta", "curry paste"] },
  { ingredientId: "kartofler", displayName: "kartofler", aliases: ["kartofler", "kartoffel", "poteter", "potato"] },
  { ingredientId: "ketchup", displayName: "ketchup", aliases: ["ketchup", "tomatketchup", "tomat ketchup", "heinz ketchup", "heinz"] },
  { ingredientId: "kokosmaelk", displayName: "kokosmælk", aliases: ["kokosmaelk", "coconut milk"] },
  { ingredientId: "kyllingebryst", displayName: "kyllingebryst", aliases: ["kylling", "kyllingebryst", "kyllingefilet"] },
  { ingredientId: "loeg", displayName: "løg", aliases: ["loeg", "log", "gule log"] },
  { ingredientId: "maelk", displayName: "mælk", aliases: ["maelk", "milk"] },
  { ingredientId: "mayonnaise", displayName: "mayonnaise", aliases: ["mayonnaise", "mayo"] },
  { ingredientId: "mozzarella_frisk", displayName: "mozzarella", aliases: ["mozzarella", "frisk mozzarella", "mozarella"] },
  { ingredientId: "parmesan", displayName: "parmesan", aliases: ["parmesan"] },
  { ingredientId: "pasta_skruer", displayName: "pastaskruer", aliases: ["pastaskruer", "pasta skruer", "fusilli"] },
  { ingredientId: "peberfrugt", displayName: "peberfrugt", aliases: ["peberfrugt", "bell pepper"] },
  { ingredientId: "pesto", displayName: "pesto", aliases: ["pesto", "gron pesto", "groen pesto", "rod pesto"] },
  { ingredientId: "remoulade", displayName: "remoulade", aliases: ["remoulade"] },
  { ingredientId: "revet_ost", displayName: "revet ost", aliases: ["revet ost", "ost", "revet mozzarella", "revet cheddar"] },
  { ingredientId: "ris", displayName: "ris", aliases: ["ris", "rice"] },
  { ingredientId: "salami", displayName: "salami", aliases: ["salami"] },
  { ingredientId: "sennep", displayName: "sennep", aliases: ["sennep", "mustard"] },
  { ingredientId: "skinke", displayName: "skinke", aliases: ["skinke", "ham"] },
  { ingredientId: "skyr", displayName: "skyr", aliases: ["skyr"] },
  { ingredientId: "smoer", displayName: "smør", aliases: ["smoer", "smor", "butter", "lurpak"] },
  { ingredientId: "smoereost", displayName: "smøreost", aliases: ["smoereost", "philadelphia", "cream cheese"] },
  { ingredientId: "spaghetti", displayName: "spaghetti", aliases: ["spaghetti"] },
  { ingredientId: "tomat_frisk", displayName: "tomat", aliases: ["tomat", "tomater", "friske tomater"] },
  { ingredientId: "tomat_haakket_daase", displayName: "hakkede tomater", aliases: ["hakkede tomater", "tomater pa daase", "tomat paa daase", "daasetomater"] },
  { ingredientId: "yoghurt", displayName: "yoghurt", aliases: ["yoghurt", "yoghurt naturel"] },
];

const INGREDIENTS_BY_ID = new Map(CANONICAL_INGREDIENTS.map((ingredient) => [ingredient.ingredientId, ingredient]));

export function normalizeIngredientLookup(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/[\u00e6\u00c6]/g, "ae")
    .replace(/[\u00f8\u00d8]/g, "oe")
    .replace(/[\u00e5\u00c5]/g, "aa")
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ");
}

function registerLookup(inputToId: Map<string, string>, alias: string, ingredientId: string) {
  const key = normalizeIngredientLookup(alias);
  if (!key || inputToId.has(key)) return;
  inputToId.set(key, ingredientId);
}

export function buildIngredientRegistry(_recipes?: Recipe[]) {
  const inputToId = new Map<string, string>();

  for (const ingredient of CANONICAL_INGREDIENTS) {
    registerLookup(inputToId, ingredient.ingredientId, ingredient.ingredientId);
    registerLookup(inputToId, ingredient.ingredientId.replace(/_/g, " "), ingredient.ingredientId);
    registerLookup(inputToId, ingredient.displayName, ingredient.ingredientId);

    for (const alias of ingredient.aliases) {
      registerLookup(inputToId, alias, ingredient.ingredientId);
    }
  }

  return {
    ingredientIds: [...INGREDIENTS_BY_ID.keys()].sort(),
    definitions: [...CANONICAL_INGREDIENTS],
    hasIngredientId(ingredientId: string) {
      return INGREDIENTS_BY_ID.has(ingredientId);
    },
    displayIngredient(ingredientId: string) {
      return INGREDIENTS_BY_ID.get(ingredientId)?.displayName ?? ingredientId.replace(/_/g, " ");
    },
    findIngredientId(value: string) {
      return inputToId.get(normalizeIngredientLookup(value)) ?? null;
    },
  };
}

export function buildIngredientVocabulary(_recipes?: Recipe[]) {
  return [...INGREDIENTS_BY_ID.keys()].sort();
}
