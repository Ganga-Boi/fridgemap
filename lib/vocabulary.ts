/**
 * VOKABULAR — genereres ALTID fra ret-kataloget.
 * Retter og vokabular kan derfor aldrig divergere (trin 1-beslutning).
 */
import { buildIngredientVocabulary } from "./ingredientRegistry";
import { SEED_RECIPES } from "./recipes/recipes";

export function buildVocabulary(): string[] {
  return buildIngredientVocabulary(SEED_RECIPES);
}
