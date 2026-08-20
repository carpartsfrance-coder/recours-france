import Link from "next/link";
import type { Metadata } from "next";
import { Page } from "@/components/chrome";
import { formatNombre } from "@/lib/format";
import { SECTEURS, cheminSecteur, decomptes } from "@/lib/maillage";

/**
 * Le décompte par secteur balaie toute la table : on ne le refait pas à chaque
 * visite. Une fois par jour suffit — le répertoire Sirene n'est lui-même publié
 * qu'une fois par mois.
 */
/**
 * Rendue à la demande, jamais à la compilation.
 *
 * Avec `revalidate`, Next pré-rendait cette page pendant le build, donc
 * interrogeait la base — et chez l'hébergeur la compilation tourne sans
 * DATABASE_URL. Un déploiement échouait sur une page d'annuaire.
 *
 * Le coût est nul : `decomptes()` lit la table de compteurs recalculée chaque
 * nuit, seize lignes. Ce sont les comptages en direct sur treize millions de
 * lignes qui coûtaient deux secondes, et ils ont déjà disparu.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Annuaire des entreprises par secteur et par ville",
  description:
    "Parcourez les entreprises françaises par secteur d’activité, département et commune. Consultez les litiges déclarés par les consommateurs et signalez le vôtre.",
  alternates: { canonical: "/annuaire" },
};

export default async function AnnuaireRacine() {
  const parSecteur = await decomptes();
  const total = [...parSecteur.values()].reduce((s, n) => s + n, 0);

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
