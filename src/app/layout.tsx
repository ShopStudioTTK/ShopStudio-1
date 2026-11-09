import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Instrument_Serif, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

// Títulos: grotesca arredondada e expressiva. Destaques: serifada em itálico. Texto: Jakarta.
const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
});

const accent = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-accent",
});

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
    <html lang="pt-BR" className={`${display.variable} ${accent.variable} ${sans.variable}`}>
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
