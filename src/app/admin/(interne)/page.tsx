import Link from "next/link";
import { prisma } from "@/lib/db";
import { debutFenetre } from "@/lib/stats";
import {
  formatDate,
  formatNombre,
  LIBELLES_CATEGORIE,
  avecJustificatif,
  classeBadgeVerification,
  LIBELLES_VERIFICATION_COURTS,
} from "@/lib/format";
import { etatDesTaches } from "@/lib/taches";

export const dynamic = "force-dynamic";

export default async function TableauDeBord() {
  const depuis = debutFenetre(12);
  const [
    entreprises,
    signalements,
    verifies,
    enAttentePieces,
    avisEnAttente,
    corrections,
    revendications,
    resolus,
    derniers,
    parCategorie,
  ] = await Promise.all([
    // Estimation plutôt que comptage exact : voir nombreApprocheDeFiches
    // dans lib/stats.ts. Neuf secondes gagnées à chaque ouverture du tableau
    // de bord, pour un chiffre qui n'a jamais besoin d'être à l'unité.
    prisma.$queryRaw<{ n: bigint | null }[]>`
      SELECT reltuples::bigint AS n FROM pg_class WHERE relname = 'Entreprise'
    `.then((r) => Number(r[0]?.n ?? 0)),
    prisma.signalement.count({ where: { moderation: "PUBLIE" } }),
    prisma.signalement.count({
      where: { moderation: "PUBLIE", niveauVerification: { in: ["PIECE_DEPOSEE", "PIECE_EXAMINEE"] } },
    }),
    prisma.justificatif.count({ where: { etat: "EN_ATTENTE" } }),
    prisma.avis.count({ where: { moderation: "EN_ATTENTE" } }),
    prisma.correction.count({ where: { etat: "EN_ATTENTE" } }),
    prisma.revendication.count({ where: { etat: "EN_ATTENTE" } }),
    prisma.signalement.count({ where: { moderation: "PUBLIE", resolutionConfirmee: true } }),
    prisma.signalement.findMany({
      orderBy: { creeLe: "desc" },
      take: 8,
      include: { entreprise: { select: { denomination: true, slug: true } }, justificatifs: true },
    }),
    prisma.signalement.groupBy({
      by: ["categorie"],
      where: { moderation: "PUBLIE", creeLe: { gte: depuis } },
      _count: true,
    }),
  ]);

  // Un ordonnanceur arrêté ne se voit nulle part ailleurs : le site continue
  // d'afficher des dates de vérification qui ne bougent plus.
  const taches = await etatDesTaches();
  const tachesEnRetard = taches.filter((t) => t.enRetard);

  const files = [
    { libelle: "Justificatifs à examiner", valeur: enAttentePieces, href: "/admin/justificatifs", delai: "sur contestation" },
    { libelle: "Avis à modérer", valeur: avisEnAttente, href: "/admin/avis", delai: "3 jours ouvrés" },
    { libelle: "Erreurs signalées", valeur: corrections, href: "/admin/corrections", delai: "15 jours" },
    { libelle: "Revendications", valeur: revendications, href: "/admin/revendications", delai: "15 jours ouvrés" },
  ];

  return (
    <div>
      <h1 className="rf-h1 rf-h1--petit">Tableau de bord</h1>
      <p className="rf-texte rf-mt-8">
        Files d’attente de modération et volumétrie de la plateforme. Les délais affichés sont ceux annoncés
        publiquement dans la charte de modération : ils sont opposables.
      </p>

      {tachesEnRetard.length ? (
        <div
          className="rf-carte rf-mt-24"
          style={{ padding: "18px 22px", borderLeft: "4px solid var(--rf-rouge, #a32a22)" }}
        >
          <strong style={{ display: "block", marginBottom: 6 }}>
            {tachesEnRetard.length === 1
              ? "Une tâche planifiée ne tourne plus"
              : `${tachesEnRetard.length} tâches planifiées ne tournent plus`}
          </strong>
          <p className="rf-texte" style={{ margin: 0 }}>
            Tant qu’elles sont arrêtées, les dates de dernière vérification affichées sur les fiches se figent
            sans que rien ne l’indique aux visiteurs.
          </p>
          <ul className="rf-mt-12" style={{ margin: 0, paddingLeft: 18 }}>
            {tachesEnRetard.map((t) => (
              <li key={t.nom} className="rf-texte">
                {t.libelle} —{" "}
                {t.jamaisExecutee
                  ? "jamais exécutée"
                  : `dernière réussite il y a ${t.heuresDepuis} h (${formatDate(t.derniereReussite)})`}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="rf-grille rf-grille--260 rf-mt-24">
        {files.map((f) => (
          <Link
            key={f.libelle}
            href={f.href}
            className="rf-carte"
            style={{ padding: "20px 22px", textDecoration: "none", color: "inherit", display: "block" }}
          >
            <div
              className="rf-nombres"
              style={{ fontSize: 34, fontWeight: 700, color: f.valeur > 0 ? "var(--rf-cobalt)" : "var(--rf-texte-desactive)", lineHeight: 1 }}
            >
              {f.valeur}
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 10 }}>{f.libelle}</div>
            <div className="rf-micro rf-mt-4">Délai annoncé : {f.delai}</div>
          </Link>
        ))}
      </div>

      <div className="rf-tuiles rf-mt-20">
        <div className="rf-tuile">
          <div className="rf-tuile__valeur">{formatNombre(entreprises)}</div>
          <div className="rf-tuile__libelle">fiches entreprises</div>
        </div>
        <div className="rf-tuile">
          <div className="rf-tuile__valeur">{formatNombre(signalements)}</div>
          <div className="rf-tuile__libelle">signalements publiés</div>
        </div>
        <div className="rf-tuile">
          <div className="rf-tuile__valeur">{formatNombre(verifies)}</div>
          <div className="rf-tuile__libelle">avec justificatif</div>
          <div className="rf-tuile__base">
            {signalements ? Math.round((verifies / signalements) * 100) : 0} % du total
          </div>
        </div>
        <div className="rf-tuile">
          <div className="rf-tuile__valeur">{formatNombre(resolus)}</div>
          <div className="rf-tuile__libelle">résolutions confirmées</div>
          <div className="rf-tuile__base">confirmées par le consommateur</div>
        </div>
      </div>

      <div className="rf-grille rf-grille--320 rf-mt-24" style={{ alignItems: "start" }}>
        <div className="rf-carte">
          <div className="rf-carte__tete rf-carte__tete--simple">
            <span style={{ fontSize: 14, fontWeight: 700 }}>Derniers signalements</span>
            <Link href="/admin/signalements" style={{ fontSize: 12.5, fontWeight: 600 }}>
              Tout voir
            </Link>
          </div>
          <div className="rf-tableau__defilement">
            <table className="rf-tableau">
              <thead>
                <tr>
                  <th>Référence</th>
                  <th>Entreprise</th>
                  <th>Catégorie</th>
                  <th>Niveau</th>
                  <th>Pièces</th>
                  <th>Déposé</th>
                </tr>
              </thead>
              <tbody>
                {derniers.map((s) => (
                  <tr key={s.id}>
                    <td className="rf-mono" style={{ fontSize: 12 }}>
                      {s.reference}
                    </td>
                    <td>{s.entreprise?.denomination ?? s.entrepriseLibreNom ?? "—"}</td>
                    <td>{LIBELLES_CATEGORIE[s.categorie]}</td>
                    <td>
                      <span
                        className={`rf-badge rf-badge--xs ${classeBadgeVerification(s.niveauVerification).split(" ").pop()}`}
                      >
                        {LIBELLES_VERIFICATION_COURTS[s.niveauVerification]}
                      </span>
                    </td>
                    <td>{s.justificatifs.length}</td>
                    <td className="rf-nombres">{formatDate(s.creeLe)}</td>
                  </tr>
                ))}
                {derniers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="rf-legende">
                      Aucun signalement pour l’instant.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rf-carte">
          <div className="rf-carte__tete rf-carte__tete--simple">
            <span style={{ fontSize: 14, fontWeight: 700 }}>Motifs sur 12 mois</span>
          </div>
          <div style={{ padding: "18px 22px" }}>
            {parCategorie.length ? (
              parCategorie
                .sort((a, b) => b._count - a._count)
                .map((c) => {
                  const total = parCategorie.reduce((t, x) => t + x._count, 0);
                  const pct = total ? Math.round((c._count / total) * 100) : 0;
                  return (
                    <div key={c.categorie} style={{ marginBottom: 14 }}>
                      <div className="rf-ligne--entre" style={{ display: "flex", marginBottom: 6 }}>
                        <span style={{ fontSize: 13.5 }}>{LIBELLES_CATEGORIE[c.categorie]}</span>
                        <span className="rf-nombres rf-legende">
                          {pct} % · {c._count}
                        </span>
                      </div>
                      <div className="rf-barre" style={{ height: 8 }}>
                        <div className="rf-barre__valeur" style={{ height: 8, width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })
            ) : (
              <p className="rf-legende">Aucune donnée sur la période.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
