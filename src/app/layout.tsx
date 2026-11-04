import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  axes: ["opsz"],
  style: ["normal", "italic"],
  variable: "--font-display",
});

const sans = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Shop Studio — Como começar no TikTok Shop",
  description:
    "O guia prático do Shop Studio em formato de app: 12 capítulos, assistente de IA e gerador de roteiros para sair do zero à primeira venda no TikTok Shop.",
  applicationName: "Shop Studio",
  appleWebApp: { title: "Shop Studio", statusBarStyle: "default" },
  openGraph: {
    title: "Shop Studio — Como começar no TikTok Shop",
    description:
      "Do zero à primeira venda: guia interativo, assistente de IA e gerador de roteiros.",
    type: "website",
  },
};

export const viewport: Viewport = { themeColor: "#F6E3E5" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
