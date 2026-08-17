import type { Metadata } from "next";
import { Page } from "@/components/chrome";
import { FormulaireSignalement, type EntrepriseChoisie } from "./formulaire";
import { prisma } from "@/lib/db";
import { synchroniserEntreprise } from "@/lib/sources";
import { adressePostale } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Signaler un litige",
  description:
    "Signalez gratuitement un litige de consommation. Un seul formulaire, sans création de compte : vous recevez vos démarches dans le bon ordre et la liste des preuves à conserver.",
};

export default async function Signaler({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const siren = typeof params.siren === "string" ? params.siren.replace(/\D/g, "") : "";
  const modeInitial = params.mode === "libre" ? "libre" : "annuaire";

  let entrepriseInitiale: EntrepriseChoisie | null = null;
  if (siren.length === 9) {
    let entreprise = await prisma.entreprise.findUnique({ where: { siren } });
    if (!entreprise) {
      const resultat = await synchroniserEntreprise(siren).catch(() => null);
      if (resultat) entreprise = await prisma.entreprise.findUnique({ where: { id: resultat.entrepriseId } });
    }
    if (entreprise) {
      entrepriseInitiale = {
        siren: entreprise.siren,
        denomination: entreprise.denomination,
        adresse: adressePostale(entreprise) ?? "",
        activite: entreprise.nafLibelle ?? "",
        slug: entreprise.slug,
        connue: true,
      };
    }
  }

  return (
    <Page entete={{ sansCta: true }} piedComplet={false}>
      <div className="rf-conteneur" style={{ padding: "34px 32px 12px" }}>
        <h1 className="rf-h1 rf-h1--moyen">Signaler un litige</h1>
        <p className="rf-texte rf-texte--fort rf-mt-12" style={{ maxWidth: 720 }}>
          Un seul formulaire, 3 à 5 minutes, sans création de compte. Vous recevez par email votre signalement
          avec sa référence, la liste des preuves à conserver et les démarches à effectuer dans le bon ordre.
        </p>
        <div className="rf-ligne rf-mt-16" style={{ gap: 8 }}>
          <span className="rf-badge rf-badge--succes">Gratuit</span>
          <span className="rf-badge rf-badge--contour">Sans compte à créer</span>
          <span className="rf-badge rf-badge--contour">Justificatifs facultatifs</span>
          <span className="rf-badge rf-badge--contour">Pièces jamais publiées</span>
        </div>
      </div>

      <FormulaireSignalement entrepriseInitiale={entrepriseInitiale} modeInitial={modeInitial} />
    </Page>
  );
}
