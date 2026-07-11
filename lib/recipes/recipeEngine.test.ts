import { describe, expect, it } from "vitest";
import { validateCatalog } from "./recipeEngine";
import { SEED_RECIPES } from "./recipes";

describe("validateCatalog", () => {
  it("holder seed-kataloget gyldigt", () => {
    expect(validateCatalog(SEED_RECIPES)).toEqual([]);
  });

  it("afviser opskrifter med ingrediens-id'er der ikke findes i registry", () => {
    const broken = [
      {
        ...SEED_RECIPES[0],
        id: "broken-registry-link",
        ingredients: [
          ...SEED_RECIPES[0].ingredients,
          {
            ingredientId: "ukendt_sovs",
            displayName: "ukendt sovs",
            role: "fleksibel" as const,
            amountText: "1 glas",
          },
        ],
      },
    ];

    expect(validateCatalog(broken)).toEqual([
      { recipeId: "broken-registry-link", problem: "ukendt ingrediens-id i registry" },
    ]);
  });
});
