import Link from "next/link";
import { prisma } from "@/lib/db";
import { FormulaireAdmin } from "@/components/admin/formulaire-admin";
import { definirSiteOfficiel, resynchroniserFiche } from "../../actions";
import { compteursAnnuaire } from "@/lib/stats";
import { couleurScore } from "@/lib/scoring";
import { formatDate, formatNombre, formatSiren } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Entreprises({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";

  const entreprises = await prisma.entreprise.findMany({
    where: q
      ? {
          OR: [
            { denomination: { contains: q, mode: "insensitive" } },
            { siren: { contains: q.replace(/\D/g, "") || "@@" } },
          ],
        }
      : {},
    orderBy: { majLe: "desc" },
    take: 50,
  });
  const compteurs = await compteursAnnuaire(entreprises.map((e) => e.id));

  return (
    <div>
      <h1 className="rf-h1 rf-h1--petit">Fiches entreprises</h1>
      <p className="rf-texte rf-mt-8" style={{ maxWidth: 820 }}>
        La resynchronisation relit Sirene, le RNE, le BODACC, l’annuaire des médiateurs et, si un site officiel
        est renseigné, les coordonnées du service consommateurs. Les indices sont recalculés dans la foulée.
      </p>

      <div className="rf-carte rf-mt-20" style={{ padding: "16px 20px" }}>
        <div className="rf-ligne" style={{ gap: 20, alignItems: "flex-end" }}>
          <form method="get" className="rf-ligne" style={{ gap: 8, flex: "1 1 320px" }}>
            <input
              name="q"
              defaultValue={q}
              className="rf-input"
              placeholder="Dénomination ou SIREN"
              style={{ maxWidth: 320, fontSize: 13.5, minHeight: 38, padding: "8px 12px" }}
            />
            <button type="submit" className="rf-btn rf-btn--xs rf-btn--primaire">
              Rechercher
            </button>
          </form>

          <div style={{ flex: "1 1 320px" }}>
            <span className="rf-etiquette">Constituer une fiche depuis un SIREN</span>
            <FormulaireAdmin
              action={resynchroniserFiche}
              compact
              boutons={[{ valeur: "sync", libelle: "Importer / resynchroniser", variante: "primaire" }]}
            >
              <input
                name="siren"
                className="rf-input"
                placeholder="9 chiffres, ex. 424059822"
                style={{ maxWidth: 320, fontSize: 13.5, minHeight: 38, padding: "8px 12px", marginTop: 6 }}
              />
            </FormulaireAdmin>
          </div>
        </div>
      </div>

      <div className="rf-pile rf-mt-20" style={{ gap: 12 }}>
        {entreprises.map((e) => {
          const c = compteurs.get(e.id) ?? { total: 0, verifies: 0, tauxReponse: null };
          return (
            <article key={e.id} className="rf-carte" style={{ padding: "18px 20px" }}>
              <div className="rf-ligne--entre" style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
                <div className="rf-flex1">
                  <div className="rf-ligne" style={{ gap: 10 }}>
                    <Link href={`/entreprises/${e.slug}`} target="_blank" style={{ fontSize: 16, fontWeight: 700 }}>
                      {e.denomination}
                    </Link>
                    <span className={`rf-badge rf-badge--xs ${e.etatAdministratif === "ACTIVE" ? "rf-badge--succes" : "rf-badge--erreur"}`}>
                      {e.etatAdministratif === "ACTIVE" ? "Active" : "Cessée"}
                    </span>
                  </div>
                  <div className="rf-legende rf-mt-6">
                    SIREN {formatSiren(e.siren)}
                    {e.nafLibelle ? ` · ${e.nafLibelle}` : ""}
                    {e.commune ? ` · ${e.commune} (${e.departement ?? ""})` : ""}
                  </div>
                  <div className="rf-micro rf-mt-8">
                    Sirene {formatDate(e.syncSirene)} · RNE {e.syncRne ? formatDate(e.syncRne) : "non connectée"} ·
                    BODACC {formatDate(e.syncBodacc)} · site{" "}
                    {e.syncSiteOfficiel ? formatDate(e.syncSiteOfficiel) : "non enrichi"}
                  </div>
                  <div className="rf-micro rf-mt-4">
                    {formatNombre(c.total)} signalement(s), dont {c.verifies} avec justificatif · {formatNombre(e.vues)}{" "}
                    consultation(s)
                  </div>
                </div>

                <div className="rf-flexnone" style={{ textAlign: "center", minWidth: 100 }}>
                  <div className="rf-etiquette">Indice</div>
                  <div
                    className="rf-nombres"
                    style={{ fontSize: 26, fontWeight: 700, color: couleurScore(e.indiceTransparence) }}
                  >
                    {e.indiceTransparence ?? "—"}
                  </div>
                  <div className="rf-micro">
                    {e.indiceExperience !== null ? `expérience ${e.indiceExperience}/100` : "expérience non publiée"}
                  </div>
                </div>

                <div className="rf-flexnone" style={{ width: 280 }}>
                  <FormulaireAdmin
                    action={definirSiteOfficiel}
                    champsCaches={{ id: e.id }}
                    compact
                    boutons={[{ valeur: "site", libelle: "Enregistrer et enrichir", variante: "neutre" }]}
                  >
                    <label className="rf-etiquette" htmlFor={`site-${e.id}`}>
                      Site officiel
                    </label>
                    <input
                      id={`site-${e.id}`}
                      name="siteWeb"
                      defaultValue={e.siteWeb ?? ""}
                      className="rf-input"
                      placeholder="exemple.fr"
                      style={{ fontSize: 13, minHeight: 36, padding: "7px 10px", marginTop: 4 }}
                    />
                  </FormulaireAdmin>
                  <div className="rf-mt-8">
                    <FormulaireAdmin
                      action={resynchroniserFiche}
                      champsCaches={{ siren: e.siren }}
                      compact
                      boutons={[{ valeur: "sync", libelle: "Resynchroniser les sources", variante: "primaire" }]}
                    />
                  </div>
                  {e.emailReclamation || e.telephoneReclamation ? (
                    <p className="rf-micro rf-mt-8">
                      SAV : {e.emailReclamation ?? "—"} {e.telephoneReclamation ? `· ${e.telephoneReclamation}` : ""}
                    </p>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}

        {entreprises.length === 0 ? (
          <div className="rf-carte" style={{ padding: "32px 24px", textAlign: "center" }}>
            <p style={{ fontSize: 15, fontWeight: 600 }}>Aucune fiche constituée pour cette recherche.</p>
            <p className="rf-texte rf-mt-6">
              Importez une entreprise depuis son SIREN, ou laissez une fiche se créer à la première consultation
              depuis l’annuaire public.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
