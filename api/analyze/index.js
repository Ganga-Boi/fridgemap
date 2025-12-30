export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
  }

  const { images = [], people = "1" } = req.body || {};

  const have =
    images.length === 1
      ? ["mælk", "æg"]
      : ["æg", "gulerod", "kylling", "kartofler"];

  res.status(200).json({
    ingredients: {
      have,
      missing: ["salt", "peber"]
    },
    recipe: {
      title: people === "4+" ? "Omelet til 4 personer" : "Omelet",
      difficulty: "nem",
      description: "Pisk æg med mælk og steg på pande."
    },
    priceEstimate: {
      min: 20,
      max: people === "4+" ? 120 : 60,
      currency: "DKK",
      store: "Mock"
    }
  });
}
