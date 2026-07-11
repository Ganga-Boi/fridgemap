/**
 * VOKABULAR — genereres ALTID fra ret-kataloget.
 * Retter og vokabular kan derfor aldrig divergere (trin 1-beslutning).
 */
import { buildIngredientVocabulary } from "./ingredientRegistry";

export function buildVocabulary(): string[] {
  return buildIngredientVocabulary();
}
