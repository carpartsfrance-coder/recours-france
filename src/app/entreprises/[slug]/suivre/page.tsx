import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Page } from "@/components/chrome";
import { FormulaireAction } from "@/components/formulaire-action";
import { prisma } from "@/lib/db";
import { suivreEntreprise } from "../actions";
import { formatSiren } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const entreprise = await prisma.entreprise.findUnique({ where: { slug } });
  return {
    title: entreprise ? `Suivre ${entreprise.denomination}` : "Suivre une entreprise",
    robots: { index: false, follow: true },
  };
}

export default async function SuivreFiche({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entreprise = await prisma.entreprise.findUnique({ where: { slug } });
  if (!entreprise) notFound();

  return (
    <Page
      fil={[
        { libelle: "Annuaire des entreprises", href: "/entreprises" },
        { libelle: entreprise.denomination, href: `/entreprises/${slug}` },
        { libelle: "Suivre la fiche" },
      ]}
    >
      <div className="rf-conteneur" style={{ padding: "36px 32px 56px", maxWidth: 760 }}>
        <h1 className="rf-h1 rf-h1--moyen">Suivre {entreprise.denomination}</h1>
        <p className="rf-texte rf-texte--fort rf-mt-12">
          Recevez une alerte par email lorsqu’un événement légal est publié sur cette entreprise (SIREN{" "}
          {formatSiren(entreprise.siren)}) ou lorsque son indice de transparence évolue : dépôt de comptes,
          changement de siège, procédure collective, radiation.
        </p>

        <div className="rf-carte rf-mt-24" style={{ padding: 24 }}>
          <FormulaireAction
            action={suivreEntreprise}
            libelle="Activer le suivi"
            note="Aucun compte n’est créé. Vous pouvez vous désinscrire en un clic depuis n’importe quelle alerte."
          >
            <input type="hidden" name="slug" value={slug} />
            <label className="rf-champ__label" htmlFor="email">
              Votre adresse email
            </label>
            <input id="email" name="email" type="email" required className="rf-input" placeholder="vous@courriel.fr" />
          </FormulaireAction>
        </div>

        <div className="rf-encart rf-encart--doux rf-mt-20">
          Les alertes portent uniquement sur des données publiques (Sirene, RNE/INPI, BODACC) et sur l’évolution
          des indices publiés. Elles ne contiennent aucune information nominative sur les consommateurs ayant
          signalé un litige.
        </div>

        <p className="rf-mt-20">
          <Link href={`/entreprises/${slug}`} style={{ fontSize: 14, fontWeight: 600 }}>
            Revenir à la fiche
          </Link>
        </p>
      </div>
    </Page>
  );
}
