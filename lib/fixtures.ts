/**
 * TEST-FIXTURE — kun til trin 3-gennemsyn af forsiden.
 * Slettes når Dexie-persistens og scan-flowet kobles på (trin 5-6).
 * Scenarie: familie på 4, intet allergisk, køleskab der kan bære
 * one-pot pasta fuldt og karry med én manglende vare.
 */
import type { Household, Pantry } from "../types/contracts";

const NOW = new Date().toISOString();

export const FIXTURE_HOUSEHOLD: Household = {
  adults: 2,
  children: 2,
  likedRecipeIds: ["one-pot-pasta-kylling", "spaghetti-koedsovs-klassisk"],
  dislikedIngredients: [],
  allergies: [],
  supermarket: "netto",
  createdAt: NOW,
};

export const FIXTURE_PANTRY: Pantry = {
  items: [
    "kyllingebryst", "pasta_skruer", "floede", "loeg", "hvidloeg",
    "revet_ost", "ris", "karrypasta", "gulerod", "broccoli", "kartofler",
  ].map((ingredientId) => ({
    rawLabel: ingredientId.replace(/_/g, " "),
    ingredientId,
    quantity: "noget" as const,
    confidence: 0.9,
    source: "scan" as const,
    seenAt: NOW,
  })),
  lastScanAt: NOW,
  deductions: [],
};
