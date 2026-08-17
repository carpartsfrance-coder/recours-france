import type { Metadata } from "next";
import { Public_Sans } from "next/font/google";
import "./globals.css";

// Police chargée localement (auto-hébergée par Next au build), pas depuis Google Fonts.
const publicSans = Public_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--rf-police",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3200"),
  title: {
    default: "Recours France — signaler gratuitement un litige de consommation",
    template: "%s — Recours France",
  },
  description:
    "Plateforme privée indépendante de signalement des litiges de consommation. Fiches d'entreprises constituées à partir des registres publics (Sirene, RNE/INPI, BODACC).",
  applicationName: "Recours France",
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={publicSans.variable}>
      <body>
        <a className="rf-evitement" href="#contenu">
          Aller au contenu principal
        </a>
        {children}
      </body>
    </html>
  );
}
