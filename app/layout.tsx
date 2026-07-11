import "./globals.css";

export const metadata = {
  title: "FridgeMap",
  description: "Tag et billede af køleskabet og få forslag til retter og manglende ingredienser.",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="da">
      <body>{children}</body>
    </html>
  );
}
