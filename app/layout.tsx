import "./globals.css";

export const metadata = {
  title: "Aftensmad",
  description: "Kom hjem. Aftensmaden er besluttet.",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="da">
      <body>{children}</body>
    </html>
  );
}
