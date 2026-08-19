import Link from "next/link";
import type { Metadata } from "next";
import { Page } from "@/components/chrome";
import { prisma } from "@/lib/db";
import { formatNombre } from "@/lib/format";
import { SECTEURS, cheminSecteur } from "@/lib/maillage";

/**
 * Le décompte par secteur balaie toute la table : on ne le refait pas à chaque
 * visite. Une fois par jour suffit — le répertoire Sirene n'est lui-même publié
 * qu'une fois par mois.
 */
export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Annuaire des entreprises par secteur et par ville",
  description:
    "Parcourez les entreprises françaises par secteur d’activité, département et commune. Consultez les litiges déclarés par les consommateurs et signalez le vôtre.",
  alternates: { canonical: "/annuaire" },
};

export default async function AnnuaireRacine() {
  const groupes = await prisma.entreprise.groupBy({
    by: ["secteur"],
    _count: { _all: true },
    where: { etatAdministratif: "ACTIVE" },
  });
  const parSecteur = new Map(groupes.map((g) => [g.secteur ?? "autre", g._count._all]));
  const total = groupes.reduce((s, g) => s + g._count._all, 0);

  return (
    <Page fil={[{ libelle: "Annuaire" }]} entete={{ navActive: "annuaire" }}>
      <div className="rf-conteneur" style={{ padding: "36px 32px 56px" }}>
        <h1 className="rf-h1 rf-h1--moyen">Annuaire par secteur</h1>
        <p className="rf-texte rf-texte--fort rf-mt-12" style={{ maxWidth: 720 }}>
          {formatNombre(total)} entreprises actives, classées par activité puis par territoire. Chaque
          fiche indique les litiges déclarés par des consommateurs et le médiateur compétent lorsqu’il
          est connu.
        </p>

        <div
          className="rf-mt-24"
          style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}
        >
          {SECTEURS.filter((s) => (parSecteur.get(s.code) ?? 0) > 0).map((s) => (
            <Link
              key={s.code}
              href={cheminSecteur(s.code)}
              className="rf-carte"
              style={{ padding: "16px 20px", textDecoration: "none", color: "inherit", display: "block" }}
            >
              <div style={{ fontSize: 15.5, fontWeight: 700 }}>{s.libelle}</div>
              <div className="rf-micro rf-mt-6">
                {formatNombre(parSecteur.get(s.code) ?? 0)} entreprises
              </div>
            </Link>
          ))}
        </div>

        <p className="rf-legende rf-mt-28" style={{ maxWidth: 720 }}>
          Fiches constituées à partir des registres publics (Sirene, RNE, BODACC). La présence d’une
          entreprise dans cet annuaire ne constitue ni un signalement ni une constatation de faute.
        </p>
      </div>
    </Page>
  );
}
