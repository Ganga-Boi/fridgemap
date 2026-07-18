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
  description: "Brug det, du har. Få et konkret bud til aftensmad og mindre madspild.",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="da">
      <body className={`${display.variable} ${body.variable}`}>{children}</body>
    </html>
  );
}
