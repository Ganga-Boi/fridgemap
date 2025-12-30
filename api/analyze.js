export default async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json({ status: "API OK" });
  }

  if (req.method !== "POST") {
    return res.status(405).end();
  }

  return res.status(200).json({ status: "POST OK" });
}
