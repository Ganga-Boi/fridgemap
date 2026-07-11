import { describe, expect, it } from "vitest";
import type { RankedRecipe } from "./matcher";
import {
  advanceSuggestion,
  applyEveningRule,
  createInitialSuggestionState,
  rejectCurrentSuggestion,
} from "./homeState";

function rankedRecipe(id: string, missingCoreCount: number): RankedRecipe {
  return {
    recipe: {
      id,
      name: id,
      minutes: 20,
      category: "gryde",
      childFriendly: true,
      ingredients: [],
      steps: [],
      allergens: [],
      approved: true,
    },
    score: 1,
    missingCore: Array.from({ length: missingCoreCount }, (_, index) => ({
      ingredientId: `${id}-${index}`,
      displayName: `${id}-${index}`,
      role: "bærende",
      amountText: "1 stk",
    })),
  };
}

describe("applyEveningRule", () => {
  it("bevarer kun fuld dækning efter kl. 17, når de findes", () => {
    const ranked = [
      rankedRecipe("complete", 0),
      rankedRecipe("missing-one", 1),
      rankedRecipe("complete-two", 0),
    ];

    expect(applyEveningRule(ranked, 17).map((item) => item.recipe.id)).toEqual([
      "complete",
      "complete-two",
    ]);
  });

  it("bevarer hele listen efter kl. 17, når ingen har fuld dækning", () => {
    const ranked = [rankedRecipe("missing-one", 1), rankedRecipe("missing-two", 1)];

    expect(applyEveningRule(ranked, 18).map((item) => item.recipe.id)).toEqual([
      "missing-one",
      "missing-two",
    ]);
  });
});

describe("rejectCurrentSuggestion", () => {
  it("rykker cursoren for hvert afslag, også ved hurtige gentagelser", () => {
    const first = rejectCurrentSuggestion(createInitialSuggestionState(), 4);
    const second = rejectCurrentSuggestion(first, 4);

    expect(first).toEqual({ cursor: 1, rejections: 1 });
    expect(second).toEqual({ cursor: 2, rejections: 2 });
  });

  it("stopper på sidste forslag uden at miste afvisningstælleren", () => {
    const state = { cursor: 2, rejections: 2 };

    expect(rejectCurrentSuggestion(state, 3)).toEqual({
      cursor: 2,
      rejections: 3,
    });
  });
});

describe("advanceSuggestion", () => {
  it("flytter cursoren uden at tælle det som en afvisning", () => {
    const state = { cursor: 0, rejections: 2 };

    expect(advanceSuggestion(state, 4)).toEqual({
      cursor: 1,
      rejections: 2,
    });
  });

  it("stopper på sidste forslag uden at ændre afvisningstælleren", () => {
    const state = { cursor: 2, rejections: 2 };

    expect(advanceSuggestion(state, 3)).toEqual({
      cursor: 2,
      rejections: 2,
    });
  });
});
