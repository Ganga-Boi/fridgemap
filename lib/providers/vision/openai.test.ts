import { describe, expect, it } from "vitest";
import { buildIngredientVocabulary } from "../../ingredientRegistry";
import { parseAndValidateVisionResponse } from "./scanContract";

const VOCABULARY = buildIngredientVocabulary();

describe("parseAndValidateVisionResponse", () => {
  it("bevarer ukendte fund som rawLabel med null ingredientId", () => {
    const result = parseAndValidateVisionResponse(
      JSON.stringify({
        sceneType: "food",
        items: [
          {
            rawLabel: "glas med rester",
            ingredientId: null,
            quantity: "noget",
            confidence: 0.62,
          },
        ],
      }),
      VOCABULARY
    );

    expect(result).toEqual({
      sceneType: "food",
      items: [
        {
          rawLabel: "glas med rester",
          ingredientId: null,
          quantity: "noget",
          confidence: 0.62,
        },
      ],
    });
  });

  it("bruger lokal registry-mapping naar rawLabel matcher et alias", () => {
    const result = parseAndValidateVisionResponse(
      JSON.stringify({
        sceneType: "food",
        items: [
          {
            rawLabel: "Heinz ketchup",
            ingredientId: null,
            quantity: "noget",
            confidence: 0.91,
          },
        ],
      }),
      VOCABULARY
    );

    expect(result).toEqual({
      sceneType: "food",
      items: [
        {
          rawLabel: "Heinz ketchup",
          ingredientId: "ketchup",
          quantity: "noget",
          confidence: 0.91,
        },
      ],
    });
  });

  it("stopper ikke-mad billeder og kasserer eventuelle fund", () => {
    const result = parseAndValidateVisionResponse(
      JSON.stringify({
        sceneType: "non_food",
        items: [
          {
            rawLabel: "bog",
            ingredientId: null,
            quantity: "noget",
            confidence: 0.98,
          },
        ],
      }),
      VOCABULARY
    );

    expect(result).toEqual({
      sceneType: "non_food",
      items: [],
    });
  });
});
