import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Page } from "@/components/chrome";
import { prisma } from "@/lib/db";
import { resoudreJetonSuivi } from "@/lib/auth";
import { modeleRelance } from "@/lib/demarches";
import { CopierTexte } from "@/app/signaler/confirmation/[jeton]/copier-texte";
import { adressePostale, formatMontant } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Votre courrier de réclamation",
  robots: { index: false, follow: false },
};

/**
 * Écran 7 — le courrier de réclamation.
 *
 * C'est la pièce qui conditionne tout le reste : sans réclamation écrite
 * restée sans réponse satisfaisante, le médiateur ne peut pas être saisi. La
 * page la donne prête, avec ce qui manque signalé entre crochets plutôt que
 * comblé par une valeur plausible — un numéro de commande inventé rendrait le
 * courrier inutilisable, et l'erreur ne se verrait qu'au refus.
 *
 * Recours France n'envoie rien : c'est le consommateur qui poste sa lettre.
 * L'écrire ici évite qu'il attende un envoi qui n'aura pas lieu.
 */
export default async function Courrier({ params }: { params: Promise<{ jeton: string }> }) {
  const { jeton } = await params;

  const acces = await resoudreJetonSuivi(jeton);
  if (!acces?.signalement) notFound();

  const signalement = await prisma.signalement.findUnique({
    where: { id: acces.signalement.id },
    include: { entreprise: true },
  });
  if (!signalement) notFound();

  const entreprise = signalement.entreprise;
  const nom = entreprise?.denomination ?? signalement.entrepriseLibreNom ?? "l’entreprise";

  const texte = modeleRelance({
    reference: signalement.reference,
    entreprise: nom,
    adresseEntreprise: entreprise ? adressePostale(entreprise) : null,
    categorie: signalement.categorie,
    montant: signalement.montant ? formatMontant(Number(signalement.montant)) : null,
    dateFaits: signalement.dateFaits,
    prenom: signalement.prenom ?? "[Votre prénom]",
    nom: signalement.nom ?? "[Votre nom]",
  });

  /** Ce qu'il reste à compléter, relevé dans le texte plutôt que deviné. */
  const aCompleter = [...texte.matchAll(/\[([^\]]+)\]/g)].map((m) => m[1]);

  return (
    <Page
      entete={{ baseline: "Observatoire des problèmes consommateurs", sansCta: true }}
      piedComplet={false}
    >
      <div className="rfx">
        <div className="rfx-lettre" style={{ padding: "32px 24px 56px" }}>
          <h1 className="rfx-h2">Votre courrier de réclamation</h1>
          <p className="rfx-texte" style={{ marginTop: 10 }}>
            Adressé à {nom}, rédigé à partir de votre situation. Relisez-le, complétez ce qui manque,
            puis envoyez-le de préférence en recommandé avec avis de réception.
          </p>

          {aCompleter.length > 0 ? (
            <div className="rfx-alerte" style={{ marginTop: 18 }} role="status">
              <strong>À compléter avant l’envoi</strong>
              <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                {[...new Set(aCompleter)].map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
              <p style={{ marginTop: 8 }}>
                Ces éléments sont laissés entre crochets : nous ne les inventons pas, un numéro
                erroné rendrait le courrier inutilisable.
              </p>
            </div>
          ) : null}

          <div className="rfx-bloc" style={{ marginTop: 22, padding: "28px 32px" }}>
            <pre
              style={{
                font: "inherit",
                fontSize: 14.5,
                lineHeight: 1.7,
                whiteSpace: "pre-wrap",
                margin: 0,
                color: "var(--x-encre)",
              }}
            >
              {texte}
            </pre>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 18 }}>
            <CopierTexte texte={texte} />
            <a
              href={`/mon-espace/dossier/${jeton}/modele-relance`}
              className="rfx-btn rfx-btn--secondaire"
              download={`reclamation-${signalement.reference}.txt`}
            >
              Télécharger le courrier
            </a>
          </div>

          <div className="rfx-bloc rfx-bloc--alt" style={{ marginTop: 26 }}>
            <div className="rfx-h4">Avant d’envoyer</div>
            <ul className="rfx-petit" style={{ margin: "10px 0 0", paddingLeft: 18 }}>
              <li style={{ marginBottom: 4 }}>
                Complétez les éléments entre crochets : numéro de commande, dates, adresse.
              </li>
              <li style={{ marginBottom: 4 }}>
                Joignez la copie de vos justificatifs — jamais les originaux.
              </li>
              <li style={{ marginBottom: 4 }}>
                Envoyez en recommandé avec avis de réception : c’est cette preuve qui fait courir les
                délais.
              </li>
              <li>Conservez une copie du courrier et le récépissé d’envoi.</li>
            </ul>
          </div>

          <p className="rfx-source" style={{ marginTop: 18 }}>
            Ce modèle est une information générale. Il ne constitue pas une consultation juridique et
            doit être adapté à votre situation. Recours France n’adresse aucun courrier à votre place
            et ne transmet pas votre réclamation au professionnel.
          </p>

          <p className="rfx-mention" style={{ marginTop: 24 }}>
            <Link href={`/mon-espace/dossier/${jeton}`}>← Revenir à mon signalement</Link>
          </p>
        </div>
      </div>
    </Page>
  );
}
