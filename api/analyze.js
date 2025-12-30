export const runtime = "edge";

export default function handler() {
  return new Response(
    JSON.stringify({
      ok: true,
      message: "API ALIVE",
      ingredients: {
        have: ["æg", "mælk"],
        missing: ["salt", "peber"]
      },
      recipe: {
        title: "Omelet",
        difficulty: "nem",
        description: "Pisk æg med mælk og steg på pande."
      },
      priceEstimate: {
        min: 20,
        max: 60,
        currency: "DKK",
        store: "Mock"
      }
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    }
  );
}
