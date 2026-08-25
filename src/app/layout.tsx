import type { Metadata } from "next";
import { Public_Sans } from "next/font/google";
import "./globals.css";
import { ADRESSE } from "@/lib/adresse";

// Police chargée localement (auto-hébergée par Next au build), pas depuis Google Fonts.
//
// La graisse 800 manquait, alors que la charte l'emploie partout où elle porte
// la structure : le nom de l'entreprise, les titres de section, les chiffres de
// synthèse, le logotype. Le navigateur la fabriquait en épaississant le 700,
// ce qui donne un gras approximatif et des lettres légèrement déformées.
const publicSans = Public_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--rf-police",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(ADRESSE),
  title: {
    default: "Recours France — signaler gratuitement un litige de consommation",
    template: "%s — Recours France",
  },
  description:
    "Plateforme privée indépendante de signalement des litiges de consommation. Fiches d'entreprises constituées à partir des registres publics (Sirene, RNE/INPI, BODACC).",
  applicationName: "Recours France",
  robots: { index: true, follow: true },
  /**
   * iOS transforme d'autorité en liens ce qu'il prend pour un numéro de
   * téléphone ou une adresse postale. Sur une fiche d'entreprise, « 432 892
   * 412 » — un SIREN — devenait un lien d'appel bleu souligné, et l'adresse du
   * siège un lien vers Plans. Les deux sont des données du registre, pas des
   * actions ; les présenter comme cliquables est faux et abîme la page.
   */
  formatDetection: { telephone: false, address: false },
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
