import Link from "next/link";
import { prisma } from "@/lib/db";
import { FormulaireAdmin } from "@/components/admin/formulaire-admin";
import { controlerJustificatif, purgerJustificatif } from "../../actions";
import { formatTaille } from "@/lib/upload-constantes";
import { formatDate, formatDateLongue, formatMontant, LIBELLES_CATEGORIE, masquerEmail } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Justificatifs({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filtre = typeof params.etat === "string" ? params.etat : "EN_ATTENTE";

  const pieces = await prisma.justificatif.findMany({
    where: filtre === "TOUS" ? {} : { etat: filtre as "EN_ATTENTE" | "CONTROLE" | "REFUSE" },
    orderBy: { deposeLe: "asc" },
    take: 60,
    include: {
      signalement: {
        include: { entreprise: { select: { denomination: true, slug: true, siren: true } } },
      },
    },
  });

  return (
    <div>
      <h1 className="rf-h1 rf-h1--petit">Contrôle des justificatifs</h1>
      <p className="rf-texte rf-mt-8" style={{ maxWidth: 820 }}>
        Le contrôle porte sur la <strong>réalité du signalement</strong>, jamais sur le bien-fondé de la
        réclamation. Vérifiez la cohérence entre le nom de l’entreprise, la date et le montant déclarés, et la
        pièce fournie. Accepter la pièce fait passer le signalement en signalement vérifié : il entre alors dans
        les statistiques publiques.
      </p>

      <div className="rf-ligne rf-mt-20" style={{ gap: 8 }}>
        {[
          { cle: "EN_ATTENTE", libelle: "En attente" },
          { cle: "CONTROLE", libelle: "Contrôlées" },
          { cle: "REFUSE", libelle: "Refusées" },
          { cle: "TOUS", libelle: "Toutes" },
        ].map((f) => (
          <Link
            key={f.cle}
            href={`/admin/justificatifs?etat=${f.cle}`}
            className={`rf-btn rf-btn--xs ${filtre === f.cle ? "rf-btn--primaire" : "rf-btn--neutre"}`}
          >
            {f.libelle}
          </Link>
        ))}
      </div>

      <div className="rf-pile rf-mt-20" style={{ gap: 12 }}>
        {pieces.map((p) => {
          const s = p.signalement;
          return (
            <article key={p.id} className="rf-carte" style={{ padding: "20px 22px" }}>
              <div className="rf-ligne--entre" style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
                <div className="rf-flex1">
                  <div className="rf-ligne" style={{ gap: 10 }}>
                    <span className="rf-mono" style={{ fontSize: 13, fontWeight: 700 }}>
                      {s.reference}
                    </span>
                    <span
                      className={`rf-badge rf-badge--xs ${
                        p.etat === "CONTROLE"
                          ? "rf-badge--succes"
                          : p.etat === "REFUSE"
                            ? "rf-badge--erreur"
                            : "rf-badge--alerte"
                      }`}
                    >
                      {p.etat === "CONTROLE" ? "Contrôlée" : p.etat === "REFUSE" ? "Refusée" : "En attente"}
                    </span>
                    <span
                      className={`rf-badge rf-badge--xs ${s.niveauVerification === "VERIFIE" ? "rf-badge--verifie-doux" : "rf-badge--non-verifie"}`}
                    >
                      Signalement {s.niveauVerification === "VERIFIE" ? "vérifié" : "déclaré"}
                    </span>
                  </div>

                  <div className="rf-mt-10" style={{ fontSize: 15, fontWeight: 700 }}>
                    {s.entreprise ? (
                      <Link href={`/entreprises/${s.entreprise.slug}`} target="_blank">
                        {s.entreprise.denomination}
                      </Link>
                    ) : (
                      `${s.entrepriseLibreNom ?? "Entreprise non identifiée"} (saisie libre)`
                    )}
                  </div>

                  <div className="rf-tuiles rf-mt-12">
                    <div className="rf-tuile rf-tuile--moyenne">
                      <div className="rf-etiquette">Catégorie</div>
                      <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 4 }}>
                        {LIBELLES_CATEGORIE[s.categorie]}
                      </div>
                    </div>
                    <div className="rf-tuile rf-tuile--moyenne">
                      <div className="rf-etiquette">Montant déclaré</div>
                      <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 4 }}>
                        {s.montant ? formatMontant(Number(s.montant)) : "non déclaré"}
                      </div>
                    </div>
                    <div className="rf-tuile rf-tuile--moyenne">
                      <div className="rf-etiquette">Date des faits</div>
                      <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 4 }}>
                        {formatDateLongue(s.dateFaits)}
                      </div>
                    </div>
                    <div className="rf-tuile rf-tuile--moyenne">
                      <div className="rf-etiquette">Consommateur</div>
                      <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 4 }}>
                        {s.prenom} {s.nom.charAt(0)}. · {masquerEmail(s.email)}
                      </div>
                    </div>
                  </div>

                  <div className="rf-carte rf-carte--legere rf-mt-12" style={{ padding: "12px 14px" }}>
                    <div className="rf-etiquette">Faits déclarés (non publiés)</div>
                    <p className="rf-texte rf-mt-6" style={{ fontSize: 13.5 }}>
                      {s.resume}
                    </p>
                  </div>
                </div>

                <div className="rf-flexnone" style={{ width: 280 }}>
                  <div className="rf-carte rf-carte--douce" style={{ padding: "14px 16px" }}>
                    <div className="rf-etiquette">Pièce déposée</div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 6, wordBreak: "break-word" }}>
                      {p.nomOrigine}
                    </div>
                    <div className="rf-micro rf-mt-4">
                      {p.typeMime} · {formatTaille(p.taille)} · déposée le {formatDate(p.deposeLe)}
                    </div>
                    <a
                      href={`/api/justificatifs/${p.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rf-btn rf-btn--secondaire rf-btn--sm rf-btn--bloc rf-mt-12"
                    >
                      Ouvrir la pièce
                    </a>
                    <p className="rf-micro rf-mt-8">
                      Accès tracé. La pièce n’est jamais publiée ni transmise à l’entreprise.
                    </p>
                  </div>

                  {p.etat === "EN_ATTENTE" ? (
                    <div className="rf-mt-12">
                      <FormulaireAdmin
                        action={controlerJustificatif}
                        champsCaches={{ id: p.id }}
                        boutons={[
                          { valeur: "accepter", libelle: "Valider — signalement vérifié", variante: "primaire" },
                          { valeur: "refuser", libelle: "Refuser", variante: "danger" },
                        ]}
                      >
                        <label className="rf-vh" htmlFor={`motif-${p.id}`}>
                          Motif de refus
                        </label>
                        <input
                          id={`motif-${p.id}`}
                          name="motif"
                          className="rf-input"
                          placeholder="Motif si refus (envoyé au consommateur)"
                          style={{ fontSize: 13, minHeight: 40, padding: "8px 10px" }}
                        />
                      </FormulaireAdmin>
                    </div>
                  ) : (
                    <div className="rf-mt-12">
                      <p className="rf-micro">
                        {p.etat === "CONTROLE" ? "Contrôlée" : "Refusée"} le {formatDate(p.controleLe)} par{" "}
                        {p.controlePar ?? "—"}
                        {p.motifRefus ? ` · ${p.motifRefus}` : ""}
                      </p>
                      <div className="rf-mt-8">
                        <FormulaireAdmin
                          action={purgerJustificatif}
                          champsCaches={{ id: p.id }}
                          compact
                          boutons={[{ valeur: "purger", libelle: "Supprimer la pièce du stockage", variante: "danger" }]}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </article>
          );
        })}

        {pieces.length === 0 ? (
          <div className="rf-carte" style={{ padding: "32px 24px", textAlign: "center" }}>
            <p style={{ fontSize: 15, fontWeight: 600 }}>Aucune pièce dans cette file.</p>
            <p className="rf-texte rf-mt-6">Les nouveaux dépôts apparaissent ici automatiquement.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
