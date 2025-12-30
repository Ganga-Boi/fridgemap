export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
  }

  // Ingen billedanalyse endnu → ingen gæt
  return res.status(200).json({
    ingredients: { have: [], missing: [] },
    recipe: {
      title: "Analyse ikke aktiv",
      difficulty: "",
      description:
        "Billedgenkendelse er ikke slået til endnu. Dette er en teknisk MVP uden gæt."
    },
    priceEstimate: { min: 0, max: 0, currency: "DKK", store: "" },
    meta: {
      mode: "no-guess",
      note: "Mock slukket. Klar til rigtig billedanalyse."
    }
  });
}
