import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Journal() {
  const actions = await prisma.journalAction.findMany({
    orderBy: { creeLe: "desc" },
    take: 200,
    include: { admin: { select: { nom: true, email: true } } },
  });

  return (
    <div>
      <h1 className="rf-h1 rf-h1--petit">Journal d’audit</h1>
      <p className="rf-texte rf-mt-8" style={{ maxWidth: 820 }}>
        Toute décision de modération est tracée : validation ou refus d’un justificatif, publication ou retrait
        d’un signalement, déclassement, traitement d’une demande. Le journal est conservé cinq ans.
      </p>

      <div className="rf-carte rf-mt-20 rf-tableau__defilement">
        <table className="rf-tableau">
          <thead>
            <tr>
              <th>Date</th>
              <th>Opérateur</th>
              <th>Action</th>
              <th>Cible</th>
              <th>Détail</th>
            </tr>
          </thead>
          <tbody>
            {actions.map((a) => (
              <tr key={a.id}>
                <td className="rf-nombres">{formatDate(a.creeLe)}</td>
                <td>{a.admin?.nom ?? "—"}</td>
                <td className="rf-mono" style={{ fontSize: 12 }}>
                  {a.action}
                </td>
                <td>
                  {a.cible}
                  {a.cibleId ? <span className="rf-micro"> · {a.cibleId.slice(0, 8)}</span> : null}
                </td>
                <td className="rf-legende">{a.detail ?? "—"}</td>
              </tr>
            ))}
            {actions.length === 0 ? (
              <tr>
                <td colSpan={5} className="rf-legende">
                  Aucune action enregistrée.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
