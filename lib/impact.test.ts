import { describe, expect, it } from "vitest";
import {
  EMPTY_IMPACT,
  ESTIMATED_VALUE_PER_INGREDIENT_DKK,
  readImpactStats,
  recordRescuedMeal,
} from "./impact";

describe("recordRescuedMeal", () => {
  it("registrerer en reddet ret og dens brugte varer", () => {
    const next = recordRescuedMeal(EMPTY_IMPACT, "pasta:scan-1", 4, "2026-07-18");

    expect(next.mealsRescued).toBe(1);
    expect(next.ingredientsUsed).toBe(4);
    expect(next.estimatedSavingsDkk).toBe(4 * ESTIMATED_VALUE_PER_INGREDIENT_DKK);
  });

  it("tæller ikke den samme ret og scanning to gange", () => {
    const first = recordRescuedMeal(EMPTY_IMPACT, "pasta:scan-1", 4, "2026-07-18");
    const second = recordRescuedMeal(first, "pasta:scan-1", 4, "2026-07-18");

    expect(second).toEqual(first);
  });
});

describe("readImpactStats", () => {
  it("falder sikkert tilbage ved ugyldige lokale data", () => {
    expect(readImpactStats("ikke-json")).toEqual(EMPTY_IMPACT);
  });
});
