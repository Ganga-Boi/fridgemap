/**
 * RECIPE ENGINE — katalogets vogter.
 * Bruges i kuratering (de 120 retter) og som runtime-værn:
 * en ret der ikke består validate(), kan aldrig få approved=true.
 */
import type { Recipe } from "../../types/contracts";
import { buildIngredientRegistry } from "../ingredientRegistry";
import { SEED_RECIPES } from "./recipes";

const INGREDIENT_REGISTRY = buildIngredientRegistry();

export function allApprovedRecipes(): Recipe[] {
  return SEED_RECIPES.filter((r) => r.approved);
}

export interface ValidationError { recipeId: string; problem: string; }

export function validateRecipe(r: Recipe): ValidationError[] {
  const errors: ValidationError[] = [];
  const err = (problem: string) => errors.push({ recipeId: r.id, problem });

  if (!/^[a-z0-9-]+$/.test(r.id)) err("id skal være et slug (a-z, 0-9, bindestreg)");
  if (r.minutes < 10 || r.minutes > 45) err("minutes skal være 10-45 (fundament: hverdagsretter)");
  if (!r.ingredients.some((i) => i.role === "bærende")) err("mindst én bærende ingrediens");
  if (r.steps.length < 3) err("mindst 3 trin");
  if (r.steps.some((s) => s.length > 120)) err("trin skal være korte (max 120 tegn)");

  const ids = r.ingredients.map((i) => i.ingredientId);
  if (new Set(ids).size !== ids.length) err("dublet-ingrediens");
  if (ids.some((ingredientId) => !INGREDIENT_REGISTRY.hasIngredientId(ingredientId))) {
    err("ukendt ingrediens-id i registry");
  }

  return errors;
}

export function validateCatalog(recipes: Recipe[]): ValidationError[] {
  const errors = recipes.flatMap(validateRecipe);
  const allIds = recipes.map((r) => r.id);
  if (new Set(allIds).size !== allIds.length)
    errors.push({ recipeId: "*", problem: "dublet-ret-id i kataloget" });
  return errors;
}
