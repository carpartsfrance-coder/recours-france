import Link from "next/link";
import { prisma } from "@/lib/db";
import { FormulaireAdmin } from "@/components/admin/formulaire-admin";
import { trancherContestation } from "../../actions";
import { formatDate, LIBELLES_CATEGORIE } from "@/lib/format";
import { LIBELLES_CONTESTATION, DELAI_REPONSE_JOURS } from "@/lib/contestations";

export const dynamic = "force-dynamic";

export default async function Contestations() {
  const [aExaminer, enCours, closes] = await Promise.all([
    prisma.contestation.findMany({
      where: { etat: "PIECE_FOURNIE" },
      orderBy: { repondueLe: "asc" },
      include: {
        signalement: {
          include: {
            entreprise: { select: { denomination: true, slug: true } },
            justificatifs: { select: { id: true, nomOrigine: true, anomalies: true, observations: true } },
          },
        },
      },
    }),
    prisma.contestation.findMany({
      where: { etat: "PIECE_DEMANDEE" },
      orderBy: { echeanceReponse: "asc" },
      include: { signalement: { select: { reference: true } } },
    }),
    prisma.contestation.findMany({
      where: { etat: { in: ["RETIREE_SANS_REPONSE", "ACCEPTEE", "REJETEE"] } },
      orderBy: { trancheeLe: "desc" },
      take: 20,
      include: { signalement: { select: { reference: true } } },
    }),
  ]);

  return (
    <div>
      <h1 className="rf-h1 rf-h1--petit">Contestations</h1>
      <p className="rf-texte rf-mt-8">
        Seules les contestations auxquelles le consommateur a <strong>répondu</strong> appellent une décision.
        Celles restées sans réponse sont tranchées automatiquement à l’échéance, par la tâche planifiée — il
        n’y a rien à y faire.
      </p>

      <h2 className="rf-h2 rf-mt-28">À examiner ({aExaminer.length})</h2>
      {aExaminer.length === 0 ? (
        <p className="rf-texte rf-mt-12">Aucune contestation en attente d’examen.</p>
      ) : (
        <div className="rf-pile rf-mt-16" style={{ gap: 14 }}>
          {aExaminer.map((c) => (
            <div key={c.id} className="rf-carte" style={{ padding: 22 }}>
              <div className="rf-ligne" style={{ gap: 10, flexWrap: "wrap" }}>
                <strong>{c.signalement.reference}</strong>
                <span className="rf-micro">
                  {LIBELLES_CATEGORIE[c.signalement.categorie]} ·{" "}
                  {c.signalement.entreprise?.denomination ?? c.signalement.entrepriseLibreNom}
                </span>
              </div>

              <div className="rf-carte rf-carte--legere rf-mt-12" style={{ padding: "12px 14px" }}>
                <div className="rf-etiquette">Motivation de l’entreprise</div>
                <p className="rf-texte rf-mt-8" style={{ fontSize: 13.5 }}>
                  {c.motif}
                </p>
                <p className="rf-micro rf-mt-8">
                  {c.nom} — {c.qualite} · déposée le {formatDate(c.creeLe)} · réponse du consommateur le{" "}
                  {formatDate(c.repondueLe)}
                </p>
              </div>

              <div className="rf-mt-12">
                <div className="rf-etiquette">Pièces du dossier</div>
                {c.signalement.justificatifs.length === 0 ? (
                  <p className="rf-micro rf-mt-8">Aucune pièce.</p>
                ) : (
                  <ul className="rf-mt-8" style={{ margin: 0, paddingLeft: 16 }}>
                    {c.signalement.justificatifs.map((j) => (
                      <li key={j.id} className="rf-micro">
                        <a href={`/api/justificatifs/${j.id}`} target="_blank" rel="noreferrer">
                          {j.nomOrigine}
                        </a>
                        {[...j.anomalies, ...j.observations].length ? (
                          <span> — {[...j.anomalies, ...j.observations].join(" · ")}</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rf-mt-16">
                <FormulaireAdmin
                  action={trancherContestation}
                  champsCaches={{ id: c.id }}
                  boutons={[
                    { valeur: "ecarter", libelle: "Écarter — la pièce étaye, maintenir", variante: "primaire" },
                    { valeur: "retenir", libelle: "Retenir — retirer le signalement", variante: "danger" },
                  ]}
                >
                  <label className="rf-vh" htmlFor={`motif-${c.id}`}>
                    Motif de la décision
                  </label>
                  <input
                    id={`motif-${c.id}`}
                    name="motif"
                    className="rf-input"
                    placeholder="Motif de la décision (communiqué aux deux parties)"
                  />
                </FormulaireAdmin>
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 className="rf-h2 rf-mt-32">Délai en cours ({enCours.length})</h2>
      <p className="rf-texte rf-mt-8" style={{ fontSize: 13.5 }}>
        Le consommateur a {DELAI_REPONSE_JOURS} jours pour produire sa pièce. Aucune action de votre part.
      </p>
      {enCours.length ? (
        <table className="rf-table rf-mt-12">
          <thead>
            <tr>
              <th>Dossier</th>
              <th>Contestée le</th>
              <th>Échéance</th>
            </tr>
          </thead>
          <tbody>
            {enCours.map((c) => (
              <tr key={c.id}>
                <td>{c.signalement.reference}</td>
                <td>{formatDate(c.creeLe)}</td>
                <td>{formatDate(c.echeanceReponse)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      <h2 className="rf-h2 rf-mt-32">Closes</h2>
      {closes.length === 0 ? (
        <p className="rf-texte rf-mt-12">Aucune contestation close.</p>
      ) : (
        <table className="rf-table rf-mt-12">
          <thead>
            <tr>
              <th>Dossier</th>
              <th>Issue</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {closes.map((c) => (
              <tr key={c.id}>
                <td>{c.signalement.reference}</td>
                <td>{LIBELLES_CONTESTATION[c.etat]}</td>
                <td>{formatDate(c.trancheeLe)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p className="rf-micro rf-mt-24">
        Règle appliquée : <Link href="/charte-de-moderation">charte de modération</Link>.
      </p>
    </div>
  );
}
