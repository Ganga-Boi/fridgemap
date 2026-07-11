import { Fraunces, Source_Sans_3 } from "next/font/google";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
});

const body = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata = {
  title: "FridgeMap",
  description: "Tag et billede af køleskabet og få forslag til retter og manglende ingredienser.",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="da">
      <body className={`${display.variable} ${body.variable}`}>{children}</body>
    </html>
  );
}
