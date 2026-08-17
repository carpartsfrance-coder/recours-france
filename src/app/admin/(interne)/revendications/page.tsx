import Link from "next/link";
import { prisma } from "@/lib/db";
import { FormulaireAdmin } from "@/components/admin/formulaire-admin";
import { traiterRevendication } from "../../actions";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Revendications() {
  const demandes = await prisma.revendication.findMany({
    orderBy: [{ etat: "asc" }, { creeLe: "desc" }],
    take: 60,
    include: { entreprise: { select: { denomination: true, slug: true, siren: true } } },
  });

  return (
    <div>
      <h1 className="rf-h1 rf-h1--petit">Revendications d’entreprises</h1>
      <p className="rf-texte rf-mt-8" style={{ maxWidth: 820 }}>
        Vérifiez la qualité du demandeur à représenter l’entreprise : nom de domaine de l’email professionnel,
        cohérence avec le représentant légal publié, SIRET indiqué. Une revendication acceptée permet de
        corriger les données publiques et les coordonnées de service consommateurs — elle n’ouvre <strong>aucun
        droit de réponse publié</strong> aux signalements dans cette version de la plateforme.
      </p>

      <div className="rf-pile rf-mt-20" style={{ gap: 12 }}>
        {demandes.map((d) => (
          <article key={d.id} className="rf-carte" style={{ padding: "18px 20px" }}>
            <div className="rf-ligne--entre" style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
              <div className="rf-flex1">
                <div className="rf-ligne" style={{ gap: 10 }}>
                  <Link href={`/entreprises/${d.entreprise.slug}`} target="_blank" style={{ fontSize: 15, fontWeight: 700 }}>
                    {d.entreprise.denomination}
                  </Link>
                  <span
                    className={`rf-badge rf-badge--xs ${
                      d.etat === "ACCEPTEE"
                        ? "rf-badge--succes"
                        : d.etat === "REFUSEE"
                          ? "rf-badge--erreur"
                          : d.etat === "EN_COURS"
                            ? "rf-badge--alerte"
                            : "rf-badge--non-verifie"
                    }`}
                  >
                    {d.etat === "ACCEPTEE"
                      ? "Acceptée"
                      : d.etat === "REFUSEE"
                        ? "Refusée"
                        : d.etat === "EN_COURS"
                          ? "En cours"
                          : "En attente"}
                  </span>
                  <span className="rf-legende">{formatDate(d.creeLe)}</span>
                </div>

                <div className="rf-tuiles rf-mt-12">
                  <div className="rf-tuile rf-tuile--moyenne">
                    <div className="rf-etiquette">Demandeur</div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 4 }}>{d.nomContact}</div>
                  </div>
                  <div className="rf-tuile rf-tuile--moyenne">
                    <div className="rf-etiquette">Fonction</div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 4 }}>{d.fonction}</div>
                  </div>
                  <div className="rf-tuile rf-tuile--moyenne">
                    <div className="rf-etiquette">Email professionnel</div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 4, wordBreak: "break-all" }}>
                      {d.emailPro}
                    </div>
                  </div>
                  <div className="rf-tuile rf-tuile--moyenne">
                    <div className="rf-etiquette">SIRET indiqué</div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 4 }}>{d.siretJustifie ?? "—"}</div>
                  </div>
                </div>

                {d.message ? (
                  <p className="rf-texte rf-mt-12" style={{ fontSize: 13.5 }}>
                    {d.message}
                  </p>
                ) : null}
                {d.reponse ? (
                  <p className="rf-encart rf-encart--doux rf-mt-12">
                    Réponse envoyée le {formatDate(d.traiteLe)} par {d.traitePar ?? "—"} : {d.reponse}
                  </p>
                ) : null}
              </div>

              <div className="rf-flexnone" style={{ width: 280 }}>
                <FormulaireAdmin
                  action={traiterRevendication}
                  champsCaches={{ id: d.id }}
                  boutons={[
                    { valeur: "accepter", libelle: "Accepter", variante: "primaire" },
                    { valeur: "encours", libelle: "En cours", variante: "neutre" },
                    { valeur: "refuser", libelle: "Refuser", variante: "danger" },
                  ]}
                >
                  <label className="rf-etiquette" htmlFor={`rep-${d.id}`}>
                    Réponse envoyée au demandeur
                  </label>
                  <textarea
                    id={`rep-${d.id}`}
                    name="reponse"
                    rows={4}
                    className="rf-textarea"
                    style={{ fontSize: 13, marginTop: 4 }}
                    placeholder="Rappelez le périmètre : correction des données publiques et des coordonnées, sans droit de réponse publié."
                  />
                </FormulaireAdmin>
              </div>
            </div>
          </article>
        ))}

        {demandes.length === 0 ? (
          <div className="rf-carte" style={{ padding: "32px 24px", textAlign: "center" }}>
            <p style={{ fontSize: 15, fontWeight: 600 }}>Aucune revendication en attente.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
