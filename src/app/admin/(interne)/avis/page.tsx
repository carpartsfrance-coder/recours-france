import Link from "next/link";
import { prisma } from "@/lib/db";
import { FormulaireAdmin } from "@/components/admin/formulaire-admin";
import { modererAvis } from "../../actions";
import { Etoiles } from "@/components/ui";
import {
  formatDate,
  masquerEmail,
  avecJustificatif,
  LIBELLES_VERIFICATION_COURTS,
} from "@/lib/format";

export const dynamic = "force-dynamic";

const FILTRES = [
  { cle: "EN_ATTENTE", libelle: "À modérer" },
  { cle: "PUBLIE", libelle: "Publiés" },
  { cle: "REJETE", libelle: "Rejetés" },
  { cle: "TOUS", libelle: "Tous" },
];

export default async function Avis({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filtre = typeof params.etat === "string" ? params.etat : "EN_ATTENTE";

  const avis = await prisma.avis.findMany({
    where: filtre === "TOUS" ? {} : { moderation: filtre as "EN_ATTENTE" | "PUBLIE" | "REJETE" | "RETIRE" },
    orderBy: { creeLe: "desc" },
    take: 60,
    include: {
      entreprise: { select: { denomination: true, slug: true } },
      signalement: { select: { reference: true, niveauVerification: true } },
    },
  });

  return (
    <div>
      <h1 className="rf-h1 rf-h1--petit">Modération des avis</h1>
      <p className="rf-texte rf-mt-8" style={{ maxWidth: 820 }}>
        Refusez les propos injurieux, les accusations pénales présentées comme des faits établis, les données
        personnelles de tiers et les dépôts qui ne relèvent pas de l’expérience personnelle de leur auteur.
        Délai annoncé : 3 jours ouvrés.
      </p>

      <div className="rf-ligne rf-mt-20" style={{ gap: 8 }}>
        {FILTRES.map((f) => (
          <Link
            key={f.cle}
            href={`/admin/avis?etat=${f.cle}`}
            className={`rf-btn rf-btn--xs ${filtre === f.cle ? "rf-btn--primaire" : "rf-btn--neutre"}`}
          >
            {f.libelle}
          </Link>
        ))}
      </div>

      <div className="rf-pile rf-mt-20" style={{ gap: 12 }}>
        {avis.map((a) => (
          <article key={a.id} className="rf-carte" style={{ padding: "18px 20px" }}>
            <div className="rf-ligne--entre" style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
              <div className="rf-flex1">
                <div className="rf-ligne" style={{ gap: 10 }}>
                  <span style={{ fontSize: 14 }}>
                    <Etoiles note={a.note} />
                  </span>
                  <strong style={{ fontSize: 14 }}>{a.auteur}</strong>
                  <span className="rf-legende">
                    {a.ville ? `${a.ville} · ` : ""}
                    {formatDate(a.creeLe)} · {masquerEmail(a.email)}
                  </span>
                  <span className={`rf-badge rf-badge--xs ${a.verifie ? "rf-badge--verifie-doux" : "rf-badge--non-verifie"}`}>
                    {a.verifie ? "Rattaché à un dossier avec justificatif" : "Sans justificatif"}
                  </span>
                </div>
                <p className="rf-mt-10" style={{ fontSize: 14, lineHeight: 1.65 }}>
                  {a.texte}
                </p>
                <div className="rf-ligne rf-mt-10" style={{ gap: 14 }}>
                  <Link href={`/entreprises/${a.entreprise.slug}`} target="_blank" style={{ fontSize: 13, fontWeight: 600 }}>
                    {a.entreprise.denomination}
                  </Link>
                  {a.signalement ? (
                    <span className="rf-mono rf-micro">
                      {a.signalement.reference} · {LIBELLES_VERIFICATION_COURTS[a.signalement.niveauVerification].toLowerCase()}
                    </span>
                  ) : (
                    <span className="rf-micro">Aucun signalement rattaché</span>
                  )}
                </div>
                {a.motifModeration ? <p className="rf-micro rf-mt-8">Motif : {a.motifModeration}</p> : null}
              </div>

              <div className="rf-flexnone" style={{ width: 260 }}>
                <FormulaireAdmin
                  action={modererAvis}
                  champsCaches={{ id: a.id }}
                  boutons={[
                    { valeur: "publier", libelle: "Publier", variante: "primaire" },
                    { valeur: "rejeter", libelle: "Rejeter", variante: "danger" },
                  ]}
                >
                  <input
                    name="motif"
                    className="rf-input"
                    placeholder="Motif de rejet"
                    style={{ fontSize: 13, minHeight: 38, padding: "8px 10px" }}
                  />
                </FormulaireAdmin>
              </div>
            </div>
          </article>
        ))}

        {avis.length === 0 ? (
          <div className="rf-carte" style={{ padding: "32px 24px", textAlign: "center" }}>
            <p style={{ fontSize: 15, fontWeight: 600 }}>Aucun avis dans cette file.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
