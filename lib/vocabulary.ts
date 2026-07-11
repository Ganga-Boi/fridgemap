/**
 * VOKABULAR — genereres ALTID fra ret-kataloget.
 * Retter og vokabular kan derfor aldrig divergere (trin 1-beslutning).
 */
import { SEED_RECIPES } from "./recipes/recipes";

export function buildVocabulary(): string[] {
  const ids = new Set<string>();
  for (const r of SEED_RECIPES) for (const i of r.ingredients) ids.add(i.ingredientId);
  return [...ids].sort();
}
