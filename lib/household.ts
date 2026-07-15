/**
 * DEFAULT_HOUSEHOLD — neutral produktionsprofil (P6).
 * Fixtures er testdata og må aldrig importeres i app-kode.
 * Erstattes af rigtig onboarding i et senere trin.
 */
import type { Household } from "../types/contracts";

export const DEFAULT_HOUSEHOLD: Household = {
  adults: 2,
  children: 0,
  likedRecipeIds: [],
  dislikedIngredients: [],
  allergies: [],
  supermarket: "andet",
  createdAt: "2026-01-01T00:00:00.000Z",
};
