export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    message: "API ROUTE OK",
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
  });
}
