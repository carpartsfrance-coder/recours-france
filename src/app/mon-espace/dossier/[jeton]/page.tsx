import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Page } from "@/components/chrome";
import { prisma } from "@/lib/db";
import { prolongerJeton, resoudreJetonSuivi } from "@/lib/auth";
import { mediateurPublie } from "@/lib/mediation";
import { construireGuide } from "@/lib/demarches";
import { declarationPublique, titreSignalement } from "@/lib/observatoire";
import {
  LIBELLES_DEMANDE,
  LIBELLES_ETAT_PRO,
  formatDateLongue,
  formatMontant,
} from "@/lib/format";
import { NOMBRE_MAX } from "@/lib/upload-constantes";
import { FormulairePieces, FormulaireRappels, FormulaireSuppression } from "./panneau-actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mon signalement",
  robots: { index: false, follow: false },
};

/**
 * Écran 9 — le suivi par lien sécurisé.
 *
 * Il n'y a ni compte, ni mot de passe, ni tableau de bord : le lien reçu par
 * courriel tient lieu d'accès, et il doit permettre tout ce qu'un espace
 * client permettrait — consulter, compléter, mettre à jour, supprimer.
 *
 * L'écran s'ouvre sur la visibilité, parce que c'est ce que la personne est
 * venue obtenir. Les démarches viennent après.
 */
export default async function Dossier({
  params,
  searchParams,
}: {
  params: Promise<{ jeton: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { jeton } = await params;
  const query = await searchParams;

  const acces = await resoudreJetonSuivi(jeton);
  if (!acces?.signalement) notFound();
  await prolongerJeton(jeton);

  const signalement = await prisma.signalement.findUnique({
    where: { id: acces.signalement.id },
    include: {
      entreprise: { include: { mediateur: true } },
      justificatifs: { orderBy: { deposeLe: "desc" } },
    },
  });
  if (!signalement) notFound();

  const entreprise = signalement.entreprise;
  const nom = entreprise?.denomination ?? signalement.entrepriseLibreNom ?? "l’entreprise";
  const publie = signalement.moderation === "PUBLIE" && entreprise !== null;
  const mediateur = entreprise ? mediateurPublie(entreprise) : null;

  const titre = titreSignalement(nom, {
    categorie: signalement.categorie,
    demande: signalement.demande,
    etatProfessionnel: signalement.etatProfessionnel,
    resolutionConfirmee: signalement.resolutionConfirmee,
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
    verifie: signalement.justificatifs.length > 0,
    mediateur,
  });
  const prochaine = guide.etapes.find((e) => e.etat === "disponible") ?? guide.etapes[0];

  return (
    <Page
      entete={{ baseline: "Observatoire des problèmes consommateurs", sansCta: true }}
      piedComplet={false}
    >
      <div className="rfx">
        <div className="rfx-large" style={{ padding: "0 24px 56px" }}>
          <div className="rfx-bloc rfx-bloc--alt" style={{ marginTop: 20, padding: "12px 16px" }}>
            <p className="rfx-source" style={{ margin: 0 }}>
              Vous consultez votre signalement par un lien sécurisé, sans compte ni mot de passe.
              Conservez ce lien : il reste valable douze mois et se prolonge à chaque visite.
            </p>
          </div>

          <h1 className="rfx-h1" style={{ marginTop: 24, fontSize: 32 }}>
            Mon signalement concernant {nom}
          </h1>

          {query.maj === "1" ? (
            <div className="rfx-succes" style={{ marginTop: 16 }} role="status">
              Votre mise à jour a été enregistrée.
            </div>
          ) : null}

          {/* ── La visibilité, d'abord ───────────────────────────────────── */}
          {publie ? (
            <div className="rfx-succes" style={{ marginTop: 20 }}>
              <strong>
                Votre problème est actuellement visible sur la fiche {nom}.
              </strong>
              <p style={{ marginTop: 6 }}>
                Toute personne qui consulte cette fiche voit votre situation, présentée comme une
                déclaration de consommateur.
              </p>
              {entreprise ? (
                <p style={{ marginTop: 10 }}>
                  <Link href={`/entreprises/${entreprise.slug}#signalements`}>
                    Voir la version publique
                  </Link>
                </p>
              ) : null}
            </div>
          ) : (
            <div className="rfx-alerte" style={{ marginTop: 20 }}>
              Votre signalement n’est pas publié. Il reste consultable ici, et vous pouvez le
              compléter ou le supprimer à tout moment.
            </div>
          )}

          <div className="rfx-editorial" style={{ marginTop: 30 }}>
            <div>
              {/* ── Ce qu'il reste à faire ─────────────────────────────── */}
              {prochaine ? (
                <div className="rfx-bloc rfx-bloc--accent">
                  <div className="rfx-source" style={{ textTransform: "uppercase", letterSpacing: ".06em" }}>
                    Mes prochaines démarches
                  </div>
                  <h2 className="rfx-h2 rfx-h2--secondaire" style={{ marginTop: 8 }}>
                    {prochaine.titre}
                  </h2>
                  <p className="rfx-petit" style={{ marginTop: 8 }}>
                    {prochaine.description}
                  </p>
                  <p className="rfx-source" style={{ marginTop: 8 }}>
                    {prochaine.echeance
                      ? `À faire avant le ${formatDateLongue(prochaine.echeance)}`
                      : "La date exacte dépend de votre situation."}
                  </p>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
                    <Link href={`/mon-espace/dossier/${jeton}/modele-relance`} className="rfx-btn">
                      Voir mon courrier
                    </Link>
                    <a href={`/mon-espace/dossier/${jeton}/recapitulatif`} className="rfx-btn rfx-btn--secondaire">
                      Télécharger mon récapitulatif
                    </a>
                  </div>
                </div>
              ) : null}

              {/* ── Le signalement tel qu'il est publié ────────────────── */}
              <h2 className="rfx-h2 rfx-h2--secondaire" style={{ marginTop: 32 }}>
                Votre signalement
              </h2>
              <div className="rfx-apercu" style={{ marginTop: 14 }}>
                <div className="rfx-apercu__tete">
                  <span>{publie ? `Publié sur la fiche ${nom}` : "Non publié"}</span>
                  <span className="rfx-chiffre">{signalement.reference}</span>
                </div>
                <div className="rfx-apercu__corps">
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                    <span className="rfx-badge rfx-badge--categorie">
                      {signalement.sousCategorie ?? signalement.categorie}
                    </span>
                    <span
                      className={`rfx-badge ${signalement.resolutionConfirmee ? "rfx-badge--resolu" : "rfx-badge--encours"}`}
                    >
                      {signalement.resolutionConfirmee
                        ? "Résolu selon le consommateur"
                        : "Problème en cours"}
                    </span>
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.35 }}>{titre}</div>
                  <div className="rfx-mention" style={{ marginTop: 8 }}>
                    {[
                      signalement.montantPublic && signalement.montant
                        ? formatMontant(Number(signalement.montant))
                        : null,
                      `Faits : ${formatDateLongue(signalement.dateFaits)}`,
                      `Déposé : ${formatDateLongue(signalement.creeLe)}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                  <div className="rfx-declaration" style={{ marginTop: 12 }}>
                    {phrase}
                  </div>
                  {signalement.resultat ? (
                    <div className="rfx-resolution" style={{ marginTop: 12 }}>
                      Issue déclarée : {signalement.resultat}
                      {signalement.resolutionConfirmeeLe
                        ? `, le ${formatDateLongue(signalement.resolutionConfirmeeLe)}`
                        : ""}
                      .
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Le récit reste ici, et nulle part ailleurs. */}
              {signalement.resume ? (
                <div className="rfx-bloc rfx-bloc--alt" style={{ marginTop: 16 }}>
                  <div className="rfx-h4">Votre description, privée</div>
                  <p className="rfx-petit" style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>
                    {signalement.resume}
                  </p>
                  <p className="rfx-source" style={{ marginTop: 8 }}>
                    Ce texte n’est pas publié. Il sert à rédiger votre courrier et votre récapitulatif.
                  </p>
                </div>
              ) : null}
            </div>

            {/* ── Les cinq actions ─────────────────────────────────────── */}
            <aside>
              <div className="rfx-bloc">
                <h2 className="rfx-h2 rfx-h2--secondaire" style={{ fontSize: 17 }}>
                  Mettre à jour ma situation
                </h2>
                <p className="rfx-petit" style={{ marginTop: 8 }}>
                  Vous seul pouvez déclarer que votre problème est résolu. Recours France ne le
                  constate jamais à votre place.
                </p>
                <Link
                  href={`/mon-espace/dossier/${jeton}/mise-a-jour`}
                  className="rfx-btn rfx-btn--large"
                  style={{ marginTop: 14 }}
                >
                  Où en est mon problème ?
                </Link>
              </div>

              <div className="rfx-bloc" style={{ marginTop: 16 }}>
                <h2 className="rfx-h2 rfx-h2--secondaire" style={{ fontSize: 17 }}>
                  Mes justificatifs
                </h2>
                <p className="rfx-petit" style={{ marginTop: 8 }}>
                  Ils ne sont jamais publiés. Ils peuvent produire une mention publique — « justificatif
                  fourni » — qui n’atteste pas l’exactitude de votre signalement.
                </p>
                {signalement.justificatifs.length > 0 ? (
                  <ul className="rfx-petit" style={{ margin: "10px 0 0", paddingLeft: 18 }}>
                    {signalement.justificatifs.map((j) => (
                      <li key={j.id}>{j.nomOrigine}</li>
                    ))}
                  </ul>
                ) : null}
                <div style={{ marginTop: 12 }}>
                  <FormulairePieces
                    jeton={jeton}
                    restant={Math.max(0, NOMBRE_MAX - signalement.justificatifs.length)}
                  />
                </div>
              </div>

              <div className="rfx-bloc" style={{ marginTop: 16 }}>
                <h2 className="rfx-h2 rfx-h2--secondaire" style={{ fontSize: 17 }}>
                  Rappels d’échéance
                </h2>
                <div style={{ marginTop: 10 }}>
                  <FormulaireRappels jeton={jeton} actifs={signalement.relancesActives} />
                </div>
              </div>
            </aside>
          </div>

          <div style={{ borderTop: "1px solid var(--x-filet)", marginTop: 40, paddingTop: 20 }}>
            <FormulaireSuppression jeton={jeton} />
          </div>
        </div>
      </div>
    </Page>
  );
}
