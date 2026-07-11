import type { Recipe } from "../types/contracts";

type ExtraPantryIngredient = {
  ingredientId: string;
  displayName: string;
  aliases: string[];
};

const EXTRA_PANTRY_INGREDIENTS: ExtraPantryIngredient[] = [
  {
    ingredientId: "ketchup",
    displayName: "ketchup",
    aliases: ["ketchup", "tomatketchup", "tomat ketchup"],
  },
];

const COMMON_ALIASES: Record<string, string> = {
  aeg: "aeg",
  loeg: "loeg",
  hvidloeg: "hvidloeg",
  floede: "floede",
  maelk: "maelk",
  smoer: "smoer",
  ost: "revet_ost",
  tomat: "tomat_frisk",
  tomater: "tomat_frisk",
  kylling: "kyllingebryst",
  oksekoed: "hakket_oksekoed",
  "hakket oksekoed": "hakket_oksekoed",
};

function normalizeIngredientLookup(value: string) {
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

export function buildIngredientRegistry(recipes: Recipe[]) {
  const displayNameById = new Map<string, string>();
  const inputToId = new Map<string, string>();

  for (const recipe of recipes) {
    for (const ingredient of recipe.ingredients) {
      displayNameById.set(ingredient.ingredientId, ingredient.displayName);
      registerLookup(inputToId, ingredient.ingredientId, ingredient.ingredientId);
      registerLookup(inputToId, ingredient.ingredientId.replace(/_/g, " "), ingredient.ingredientId);
      registerLookup(inputToId, ingredient.displayName, ingredient.ingredientId);
    }
  }

  for (const ingredient of EXTRA_PANTRY_INGREDIENTS) {
    displayNameById.set(ingredient.ingredientId, ingredient.displayName);
    registerLookup(inputToId, ingredient.ingredientId, ingredient.ingredientId);
    registerLookup(inputToId, ingredient.displayName, ingredient.ingredientId);

    for (const alias of ingredient.aliases) {
      registerLookup(inputToId, alias, ingredient.ingredientId);
    }
  }

  for (const [alias, ingredientId] of Object.entries(COMMON_ALIASES)) {
    registerLookup(inputToId, alias, ingredientId);
  }

  return {
    ingredientIds: [...displayNameById.keys()].sort(),
    displayIngredient(ingredientId: string) {
      return displayNameById.get(ingredientId) ?? ingredientId.replace(/_/g, " ");
    },
    findIngredientId(value: string) {
      return inputToId.get(normalizeIngredientLookup(value)) ?? null;
    },
  };
}

export function buildIngredientVocabulary(recipes: Recipe[]) {
  return buildIngredientRegistry(recipes).ingredientIds;
}
