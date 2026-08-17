import Link from "next/link";
import { prisma } from "@/lib/db";
import { FormulaireAdmin } from "@/components/admin/formulaire-admin";
import { declasserSignalement, modererSignalement } from "../../actions";
import {
  classeBadgeStatut,
  formatDate,
  formatMontant,
  LIBELLES_CATEGORIE,
  LIBELLES_STATUT,
  masquerEmail,
} from "@/lib/format";

export const dynamic = "force-dynamic";

const FILTRES = [
  { cle: "TOUS", libelle: "Tous" },
  { cle: "PUBLIE", libelle: "Publiés" },
  { cle: "EN_ATTENTE", libelle: "En attente" },
  { cle: "REJETE", libelle: "Rejetés" },
  { cle: "RETIRE", libelle: "Retirés" },
];

export default async function Signalements({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filtre = typeof params.etat === "string" ? params.etat : "TOUS";
  const q = typeof params.q === "string" ? params.q.trim() : "";

  const signalements = await prisma.signalement.findMany({
    where: {
      AND: [
        filtre === "TOUS" ? {} : { moderation: filtre as "PUBLIE" | "EN_ATTENTE" | "REJETE" | "RETIRE" },
        q
          ? {
              OR: [
                { reference: { contains: q.toUpperCase() } },
                { email: { contains: q, mode: "insensitive" } },
                { entreprise: { denomination: { contains: q, mode: "insensitive" } } },
              ],
            }
          : {},
      ],
    },
    orderBy: { creeLe: "desc" },
    take: 80,
    include: {
      entreprise: { select: { denomination: true, slug: true } },
      justificatifs: { select: { etat: true } },
    },
  });

  return (
    <div>
      <h1 className="rf-h1 rf-h1--petit">Signalements</h1>
      <p className="rf-texte rf-mt-8" style={{ maxWidth: 820 }}>
        Un signalement retiré sort immédiatement de toutes les statistiques publiques. Le déclassement retire la
        vérification sans supprimer le signalement : il est réservé aux contestations établies, pièces à
        l’appui.
      </p>

      <form method="get" className="rf-ligne rf-mt-20" style={{ gap: 8 }}>
        <input
          name="q"
          defaultValue={q}
          className="rf-input"
          placeholder="Référence, email ou entreprise"
          style={{ maxWidth: 320, fontSize: 13.5, minHeight: 38, padding: "8px 12px" }}
        />
        <input type="hidden" name="etat" value={filtre} />
        <button type="submit" className="rf-btn rf-btn--xs rf-btn--primaire">
          Rechercher
        </button>
        {FILTRES.map((f) => (
          <Link
            key={f.cle}
            href={`/admin/signalements?etat=${f.cle}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            className={`rf-btn rf-btn--xs ${filtre === f.cle ? "rf-btn--primaire" : "rf-btn--neutre"}`}
          >
            {f.libelle}
          </Link>
        ))}
      </form>

      <div className="rf-carte rf-mt-20 rf-tableau__defilement">
        <table className="rf-tableau">
          <thead>
            <tr>
              <th>Référence</th>
              <th>Entreprise</th>
              <th>Catégorie</th>
              <th>Montant</th>
              <th>Niveau</th>
              <th>Statut déclaré</th>
              <th>Pièces</th>
              <th>Consommateur</th>
              <th>Déposé</th>
              <th>Modération</th>
            </tr>
          </thead>
          <tbody>
            {signalements.map((s) => (
              <tr key={s.id}>
                <td className="rf-mono" style={{ fontSize: 12 }}>
                  {s.reference}
                </td>
                <td>
                  {s.entreprise ? (
                    <Link href={`/entreprises/${s.entreprise.slug}`} target="_blank">
                      {s.entreprise.denomination}
                    </Link>
                  ) : (
                    <span className="rf-legende">{s.entrepriseLibreNom ?? "—"} (libre)</span>
                  )}
                </td>
                <td>{LIBELLES_CATEGORIE[s.categorie]}</td>
                <td className="rf-nombres">{s.montant ? formatMontant(Number(s.montant)) : "—"}</td>
                <td>
                  <span
                    className={`rf-badge rf-badge--xs ${s.niveauVerification === "VERIFIE" ? "rf-badge--verifie-doux" : "rf-badge--non-verifie"}`}
                  >
                    {s.niveauVerification === "VERIFIE" ? "Vérifié" : "Déclaré"}
                  </span>
                </td>
                <td>
                  <span className={classeBadgeStatut(s.statut)}>{LIBELLES_STATUT[s.statut]}</span>
                  {s.resolutionConfirmee ? (
                    <div className="rf-micro" style={{ color: "var(--rf-succes)" }}>
                      résolution confirmée
                    </div>
                  ) : null}
                </td>
                <td className="rf-nombres">
                  {s.justificatifs.filter((j) => j.etat === "CONTROLE").length}/{s.justificatifs.length}
                </td>
                <td className="rf-legende">{masquerEmail(s.email)}</td>
                <td className="rf-nombres">{formatDate(s.creeLe)}</td>
                <td style={{ minWidth: 260 }}>
                  <div className="rf-legende" style={{ marginBottom: 6 }}>
                    {s.moderation === "PUBLIE" ? "Publié" : s.moderation === "EN_ATTENTE" ? "En attente" : s.moderation === "REJETE" ? "Rejeté" : "Retiré"}
                    {s.motifModeration ? ` — ${s.motifModeration}` : ""}
                  </div>
                  <FormulaireAdmin
                    action={modererSignalement}
                    champsCaches={{ id: s.id }}
                    compact
                    boutons={[
                      { valeur: "publier", libelle: "Publier", variante: "primaire" },
                      { valeur: "retirer", libelle: "Retirer", variante: "danger" },
                    ]}
                  >
                    <input
                      name="motif"
                      className="rf-input"
                      placeholder="Motif"
                      style={{ fontSize: 12, minHeight: 32, padding: "6px 8px" }}
                    />
                  </FormulaireAdmin>
                  {s.niveauVerification === "VERIFIE" ? (
                    <div className="rf-mt-8">
                      <FormulaireAdmin
                        action={declasserSignalement}
                        champsCaches={{ id: s.id }}
                        compact
                        boutons={[{ valeur: "declasser", libelle: "Déclasser (retirer la vérification)", variante: "neutre" }]}
                      >
                        <input
                          name="motif"
                          className="rf-input"
                          placeholder="Motif de déclassement (obligatoire)"
                          style={{ fontSize: 12, minHeight: 32, padding: "6px 8px" }}
                        />
                      </FormulaireAdmin>
                    </div>
                  ) : null}
                </td>
              </tr>
            ))}
            {signalements.length === 0 ? (
              <tr>
                <td colSpan={10} className="rf-legende">
                  Aucun signalement pour ce filtre.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
