/**
 * VOKABULAR — genereres fra INGREDIENS-REGISTRET (supersæt af opskrifterne).
 * Registret må kende varer, ingen ret bruger endnu (fx ketchup).
 * recipeEngine.validateRecipe sikrer, at opskrifter kun bruger registrerede id'er.
 */
import { buildIngredientVocabulary } from "./ingredientRegistry";

export function buildVocabulary(): string[] {
  return buildIngredientVocabulary();
}
