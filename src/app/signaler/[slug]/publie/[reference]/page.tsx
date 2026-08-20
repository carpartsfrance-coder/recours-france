import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Page } from "@/components/chrome";
import { prisma } from "@/lib/db";
import { CIBLE_LIBRE } from "@/lib/tunnel";
import { mediateurPublie } from "@/lib/mediation";
import { construireGuide } from "@/lib/demarches";
import { declarationPublique, titreSignalement } from "@/lib/observatoire";
import {
  LIBELLES_DEMANDE,
  LIBELLES_ETAT_PRO,
  formatDateLongue,
  formatMontant,
  formatNombre,
} from "@/lib/format";

export const dynamic = "force-dynamic";

// Titre neutre : un signalement en saisie libre n'est pas publié, et l'onglet
// annoncerait le contraire.
export const metadata: Metadata = {
  title: "Votre signalement",
  robots: { index: false, follow: false },
};

/**
 * Écran de succès — la publication d'abord, le plan ensuite.
 *
 * L'ordre compte : la personne vient d'accomplir ce pour quoi elle est venue,
 * et c'est cela qu'il faut lui confirmer avant de lui proposer autre chose.
 * Annoncer d'emblée « voici vos démarches » reviendrait à lui donner du travail
 * au moment où elle attend une confirmation.
 */
export default async function Publie({
  params,
}: {
  params: Promise<{ slug: string; reference: string }>;
}) {
  const { slug, reference } = await params;
  // L'entreprise vient du signalement, non du brouillon : celui-ci est effacé
  // au moment de la publication, et une saisie libre n'aurait plus rien à quoi
  // se raccrocher — la page tombait en « n'existe pas » juste après un dépôt
  // réussi.
  const signalement = await prisma.signalement.findUnique({
    where: { reference },
    include: {
      jetons: { orderBy: { creeLe: "desc" }, take: 1 },
      entreprise: { select: { slug: true, denomination: true } },
    },
  });
  if (!signalement) notFound();

  const attendu = signalement.entreprise?.slug ?? CIBLE_LIBRE;
  if (slug !== attendu) notFound();

  const cible = {
    nom: signalement.entreprise?.denomination ?? signalement.entrepriseLibreNom ?? "l’entreprise",
    entrepriseId: signalement.entrepriseId,
    slugFiche: signalement.entreprise?.slug ?? null,
  };
  const publie = signalement.moderation === "PUBLIE";

  const total = cible.entrepriseId
    ? await prisma.signalement.count({
        where: { entrepriseId: cible.entrepriseId, moderation: "PUBLIE" },
      })
    : 0;

  const nom = cible.nom;
  const jeton = signalement.jetons[0]?.jeton ?? null;
  const mediateur = null;

  const titre = titreSignalement(nom, {
    categorie: signalement.categorie,
    demande: signalement.demande,
    etatProfessionnel: signalement.etatProfessionnel,
    resolutionConfirmee: false,
    dateFaits: signalement.dateFaits,
  });
  const phrase = declarationPublique(
    signalement,
    (c) => LIBELLES_DEMANDE[c] ?? c,
    (c) => LIBELLES_ETAT_PRO[c] ?? c,
  );

  const guide = construireGuide({
    categorie: signalement.categorie,
    contactPrealable: signalement.contactPrealable,
    dateSignalement: signalement.creeLe,
    reference: signalement.reference,
    verifie: false,
    mediateur,
  });

  return (
    <Page
      entete={{ baseline: "Observatoire des problèmes consommateurs", sansCta: true }}
      piedComplet={false}
    >
      <div className="rfx">
        <div className="rfx-large" style={{ padding: "36px 24px 56px" }}>
          {/* ── La publication, d'abord ──────────────────────────────────── */}
          <div
            className={publie ? "rfx-succes" : "rfx-alerte"}
            style={{ display: "inline-block", padding: "6px 12px" }}
          >
            {publie ? "Signalement publié" : "Signalement enregistré"}
          </div>
          <h1 className="rfx-h1" style={{ marginTop: 14 }}>
            {publie ? "Votre problème est maintenant visible" : "Votre signalement est enregistré"}
          </h1>
          <p className="rfx-prose" style={{ marginTop: 12 }}>
            {publie ? (
              <>
                Votre signalement est publié sur la fiche {nom}
                {total > 1 ? `, aux côtés des ${formatNombre(total - 1)} problèmes déjà signalés` : ""}.
              </>
            ) : (
              <>
                Votre signalement concernant {nom} est enregistré, et vos démarches sont prêtes. Il
                n’est pas encore publié : cette entreprise n’est pas répertoriée, et nous ne créons
                pas de fiche publique sur la seule foi d’un nom — au risque de l’attribuer à un
                homonyme. Le rapprochement se fait ensuite.
              </>
            )}
          </p>

          <div className="rfx-apercu" style={{ marginTop: 22, maxWidth: 720 }}>
            <div className="rfx-apercu__tete">
              <span>{publie ? `Publié sur la fiche ${nom}` : `Enregistré — ${nom}`}</span>
            </div>
            <div className="rfx-apercu__corps">
              <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.35 }}>{titre}</div>
              <div className="rfx-mention" style={{ marginTop: 8 }}>
                {[
                  signalement.montantPublic && signalement.montant
                    ? formatMontant(Number(signalement.montant))
                    : null,
                  `Publié le ${formatDateLongue(signalement.creeLe)}`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
              <div className="rfx-declaration" style={{ marginTop: 12 }}>
                {phrase}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 18 }}>
            {publie && cible.slugFiche ? (
              <Link href={`/entreprises/${cible.slugFiche}#signalements`} className="rfx-btn">
                Voir mon signalement
              </Link>
            ) : null}
            {jeton ? (
              <Link href={`/mon-espace/dossier/${jeton}`} className="rfx-btn rfx-btn--secondaire">
                Suivre mon dossier
              </Link>
            ) : null}
          </div>

          {/* ── Le plan, ensuite ─────────────────────────────────────────── */}
          <div className="rfx-section" style={{ marginTop: 40 }}>
            <h2 className="rfx-h2">Maintenant, poursuivez vos démarches</h2>

            <div className="rfx-editorial" style={{ marginTop: 24 }}>
              <div>
                <div className="rfx-apercu" style={{ padding: 0 }}>
                  <div className="rfx-apercu__corps">
                    <h3 className="rfx-h3" style={{ fontSize: 18 }}>
                      Envoyer votre réclamation à {nom}
                    </h3>
                    <p className="rfx-texte" style={{ marginTop: 8 }}>
                      Un courrier rédigé à partir de votre situation vous attend. C’est la trace écrite
                      qui conditionne la suite : sans elle, le médiateur ne peut pas être saisi.
                    </p>
                    {jeton ? (
                      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
                        <Link href={`/mon-espace/dossier/${jeton}/courrier`} className="rfx-btn">
                          Voir mon courrier
                        </Link>
                      </div>
                    ) : null}
                  </div>
                </div>

                <h2 className="rfx-h2 rfx-h2--secondaire" style={{ marginTop: 32 }}>
                  Les prochaines étapes
                </h2>
                <ol className="rfx-jalons" style={{ marginTop: 16 }}>
                  {guide.etapes.map((e) => (
                    <li
                      key={e.numero}
                      className={`rfx-jalon${e.etat === "faite" ? " rfx-jalon--fait" : ""}`}
                    >
                      <span className="rfx-jalon__pastille" aria-hidden="true" />
                      <span>
                        <span style={{ fontSize: 15, fontWeight: 700 }}>{e.titre}</span>
                        <span className="rfx-mention" style={{ display: "block", marginTop: 2 }}>
                          {e.description}
                        </span>
                        {/* Une échéance n'est affichée que lorsqu'elle est
                            réellement calculable : un délai juridique inventé
                            ferait manquer le vrai. */}
                        <span className="rfx-source" style={{ display: "block", marginTop: 2 }}>
                          {e.echeance
                            ? `À faire avant le ${formatDateLongue(e.echeance)}`
                            : "La date exacte dépend de votre situation."}
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>

              <aside>
                <div className="rfx-bloc rfx-bloc--alt">
                  <h2 className="rfx-h2 rfx-h2--secondaire" style={{ fontSize: 17 }}>
                    Votre signalement
                  </h2>
                  <div className="rfx-lignes" style={{ marginTop: 12 }}>
                    <div className="rfx-ligne">
                      <span className="rfx-ligne__cle">Référence</span>
                      <span className="rfx-ligne__valeur rfx-chiffre">{signalement.reference}</span>
                    </div>
                    <div className="rfx-ligne">
                      <span className="rfx-ligne__cle">Statut</span>
                      <span className="rfx-ligne__valeur">Problème en cours</span>
                    </div>
                    <div className="rfx-ligne">
                      <span className="rfx-ligne__cle">Publié le</span>
                      <span className="rfx-ligne__valeur">{formatDateLongue(signalement.creeLe)}</span>
                    </div>
                  </div>
                  <p className="rfx-source" style={{ marginTop: 12 }}>
                    Conservez cette référence. Vous pouvez modifier, mettre à jour ou supprimer votre
                    signalement depuis votre lien de suivi, sans créer de compte.
                  </p>
                </div>

                <div className="rfx-bloc" style={{ marginTop: 16 }}>
                  <h2 className="rfx-h2 rfx-h2--secondaire" style={{ fontSize: 17 }}>
                    Vous seul déclarez la résolution
                  </h2>
                  <p className="rfx-petit" style={{ marginTop: 8 }}>
                    Recours France ne constate jamais qu’un problème est réglé. Quand votre situation
                    évolue, vous l’indiquez depuis votre lien de suivi, et la mention « Résolu selon le
                    consommateur » apparaît sur la fiche.
                  </p>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
}
