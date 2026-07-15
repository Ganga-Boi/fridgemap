/**
 * MATCHER — deterministisk kerne. Ingen AI herinde, med vilje.
 * ============================================================
 * Tre ansvar:
 *  1. filterCandidates : HÅRD filtrering (allergier, dislikes, approved).
 *                        AI (MenuProvider) ser KUN retter, der har passeret her.
 *  2. rankFallback     : Deterministisk rangering — sikkerhedsnet når
 *                        MenuCache er tom, gammel eller AI-kaldet fejler.
 *  3. buildAnswer      : Ret + lager → Answer (mangler + copyKey).
 *
 * Regler fra fundamentet, håndhævet her:
 *  - En ret med >1 manglende bærende ingrediens kan ALDRIG foreslås.
 *  - En ret med en allergen fra husstanden kan ALDRIG passere filteret.
 *  - Konfidens vises aldrig — den oversættes til copyKey.
 */

import {
  ACCEPTED_CONFIDENCE_CUTOFF,
} from "../types/contracts";
import type {
  Answer,
  AnswerCopyKey,
  Deduction,
  Household,
  Pantry,
  PantryItem,
  Recipe,
  RecipeIngredient,
} from "../types/contracts";

/* ---------------- Konstanter (justeres kun med godkendelse) -------- */

const MAX_MISSING_CORE = 1;        // "mangler kun én ting" — aldrig to
const REPEAT_PENALTY_DAYS = 6;     // straf retter lavet inden for X dage
// P4: tærsklen bor i contracts (ACCEPTED_CONFIDENCE_CUTOFF) — én kilde.
const CONFIDENCE_DECAY_PER_DAY = 0.08; // lagertillid falder pr. dag siden scan

/* ---------------- Hjælpere ----------------------------------------- */

function daysBetween(aIso: string, bIso: string): number {
  const ms = Math.abs(new Date(aIso).getTime() - new Date(bIso).getTime());
  return ms / (1000 * 60 * 60 * 24);
}

/** Effektiv konfidens: rå konfidens minus ælde siden varen sidst blev set. */
export function effectiveConfidence(item: PantryItem, nowIso: string): number {
  const age = daysBetween(item.seenAt, nowIso);
  return Math.max(0, item.confidence - age * CONFIDENCE_DECAY_PER_DAY);
}

function pantryIndex(pantry: Pantry): Map<string, PantryItem> {
  const m = new Map<string, PantryItem>();
  for (const item of pantry.items) {
    if (!item.ingredientId) continue;
    m.set(item.ingredientId, item);
  }
  return m;
}

/* ---------------- 1. Hård filtrering ------------------------------- */

export function filterCandidates(
  recipes: Recipe[],
  household: Pick<Household, "allergies" | "dislikedIngredients">
): Recipe[] {
  const disliked = new Set(household.dislikedIngredients);
  const allergies = new Set(household.allergies);

  return recipes.filter((r) => {
    if (!r.approved) return false;
    // Allergen-match = ude. Ingen undtagelser, ingen AI-skøn.
    if (r.allergens.some((a) => allergies.has(a))) return false;
    // Disliket BÆRENDE ingrediens = ude. Disliket fleksibel er ok
    // (den udelades bare af retten — håndteres i buildAnswer).
    if (r.ingredients.some((i) => i.role === "bærende" && disliked.has(i.ingredientId)))
      return false;
    return true;
  });
}

/* ---------------- 2. Fallback-rangering ---------------------------- */

export interface RankedRecipe {
  recipe: Recipe;
  score: number;
  missingCore: RecipeIngredient[];
}

export function rankFallback(
  candidates: Recipe[],
  pantry: Pantry,
  household: Pick<Household, "likedRecipeIds">,
  recentDeductions: Deduction[],
  nowIso: string
): RankedRecipe[] {
  const idx = pantryIndex(pantry);
  const liked = new Set(household.likedRecipeIds);
  const lastCategory = lastMadeCategory(candidates, recentDeductions);

  const ranked: RankedRecipe[] = [];

  for (const recipe of candidates) {
    const core = recipe.ingredients.filter((i) => i.role === "bærende");
    const flex = recipe.ingredients.filter((i) => i.role === "fleksibel");

    const missingCore = core.filter((i) => !has(idx, i.ingredientId, nowIso));
    if (missingCore.length > MAX_MISSING_CORE) continue; // fundament-regel

    const coreCoverage = core.length
      ? (core.length - missingCore.length) / core.length
      : 1;
    const flexCoverage = flex.length
      ? flex.filter((i) => has(idx, i.ingredientId, nowIso)).length / flex.length
      : 1;

    let score = coreCoverage * 0.7 + flexCoverage * 0.15;
    if (missingCore.length === 0) score += 0.2;          // "har det hele"-bonus
    if (liked.has(recipe.id)) score += 0.1;

    // Gentagelses-straf: samme ret inden for REPEAT_PENALTY_DAYS
    const lastMade = [...recentDeductions]
      .filter((d) => d.recipeId === recipe.id)
      .sort((a, b) => new Date(b.madeAt).getTime() - new Date(a.madeAt).getTime())[0];
    if (lastMade && daysBetween(lastMade.madeAt, nowIso) < REPEAT_PENALTY_DAYS)
      score -= 0.5;

    // Variations-straf: samme kategori som senest lavede ret
    if (lastCategory && recipe.category === lastCategory) score -= 0.15;

    ranked.push({ recipe, score, missingCore });
  }

  return ranked.sort((a, b) => b.score - a.score);
}

function has(idx: Map<string, PantryItem>, ingredientId: string, nowIso: string): boolean {
  const item = idx.get(ingredientId);
  if (!item) return false;
  if (item.quantity === "lidt" && effectiveConfidence(item, nowIso) < 0.3) return false;
  return effectiveConfidence(item, nowIso) > 0.15;
}

function lastMadeCategory(recipes: Recipe[], deductions: Deduction[]): Recipe["category"] | null {
  if (!deductions.length) return null;
  const latest = [...deductions].sort(
    (a, b) => new Date(b.madeAt).getTime() - new Date(a.madeAt).getTime()
  )[0];
  return recipes.find((r) => r.id === latest.recipeId)?.category ?? null;
}

/* ---------------- 3. Svar-bygning ----------------------------------- */

export function buildAnswer(recipe: Recipe, pantry: Pantry, nowIso: string): Answer {
  const idx = pantryIndex(pantry);

  const missingCore = recipe.ingredients.filter(
    (i) => i.role === "bærende" && !has(idx, i.ingredientId, nowIso)
  );
  const missingFlex = recipe.ingredients.filter(
    (i) => i.role === "fleksibel" && !has(idx, i.ingredientId, nowIso)
  );

  // Lav-konfidens på en bærende ingrediens vi TROR er der → "tjek lige"
  const shakyCore = recipe.ingredients.some((i) => {
    if (i.role !== "bærende") return false;
    const item = idx.get(i.ingredientId);
    if (!item) return false;
    const eff = effectiveConfidence(item, nowIso);
    return eff > 0.15 && eff < ACCEPTED_CONFIDENCE_CUTOFF;
  });

  let copyKey: AnswerCopyKey;
  if (missingCore.length > 0) copyKey = "mangler_en_ting";
  else if (shakyCore) copyKey = "tjek_lige";
  else if (missingFlex.length > 0) copyKey = "springer_over";
  else copyKey = "har_det_hele";

  return {
    recipe,
    missing: [...missingCore, ...missingFlex],
    copyKey,
  };
}
