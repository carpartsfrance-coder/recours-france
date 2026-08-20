import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Page } from "@/components/chrome";
import { Puce } from "@/components/ui";
import { prisma } from "@/lib/db";
import { resoudreJetonSuivi } from "@/lib/auth";
import { construireGuide, modeleRelance, type Categorie, type ContactPrealable } from "@/lib/demarches";
import { echeances } from "@/lib/relances";
import { CopierTexte } from "./copier-texte";
import {
  adressePostale,
  formatDateLongue,
  formatMontant,
  LIBELLES_CATEGORIE,
  masquerEmail,
  avecJustificatif,
  LIBELLES_VERIFICATION_COURTS,
  LIBELLES_VERIFICATION,
} from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Signalement enregistré", robots: { index: false, follow: false } };

export default async function Confirmation({ params }: { params: Promise<{ jeton: string }> }) {
  const { jeton } = await params;
  const acces = await resoudreJetonSuivi(jeton);
  if (!acces?.signalement) notFound();

  const signalement = acces.signalement;
  const entreprise = signalement.entrepriseId
    ? await prisma.entreprise.findUnique({
        where: { id: signalement.entrepriseId },
        include: { mediateur: true },
      })
    : null;
  const pieces = await prisma.justificatif.findMany({
    where: { signalementId: signalement.id },
    select: { nomOrigine: true, conseil: true },
  });
  const nbPieces = pieces.length;
  // Conseils du contrôle automatique : purement indicatifs, jamais bloquants.
  // La pièce est enregistrée quoi qu'il arrive.
  const conseils = pieces.filter((p) => p.conseil);

  const nomEntreprise = entreprise?.denomination ?? signalement.entrepriseLibreNom ?? "Entreprise non identifiée";
  // Les deux seules dates qui comptent pour l'utilisateur, et les seules que
  // Recours France soit en mesure de lui rappeler le jour venu.
  const { relance30j, ouvertureMediation } = echeances(signalement.creeLe, signalement.contactPrealable);

  const courrier = modeleRelance({
    reference: signalement.reference,
    entreprise: nomEntreprise,
    adresseEntreprise: entreprise ? adressePostale(entreprise) : null,
    categorie: signalement.categorie as Categorie,
    montant: signalement.montant ? formatMontant(Number(signalement.montant)) : null,
    dateFaits: signalement.dateFaits,
    prenom: signalement.prenom ?? "",
    nom: signalement.nom ?? "",
  });

  const guide = construireGuide({
    categorie: signalement.categorie as Categorie,
    contactPrealable: signalement.contactPrealable as ContactPrealable,
    dateSignalement: signalement.creeLe,
    reference: signalement.reference,
    verifie: avecJustificatif(signalement.niveauVerification),
    mediateur: entreprise?.mediateur ?? null,
  });

  const recapitulatif = [
    { cle: "Entreprise", valeur: nomEntreprise },
    { cle: "Catégorie", valeur: LIBELLES_CATEGORIE[signalement.categorie] },
    { cle: "Montant déclaré", valeur: signalement.montant ? formatMontant(Number(signalement.montant)) : "non déclaré" },
    { cle: "Déposé le", valeur: formatDateLongue(signalement.creeLe) },
    {
      cle: "Niveau de vérification",
      valeur: LIBELLES_VERIFICATION_COURTS[signalement.niveauVerification],
    },
  ];

  const suites = [
    {
      n: "1",
      titre: "Vérification",
      desc: nbPieces
        ? `Vos ${nbPieces} pièce${nbPieces > 1 ? "s" : ""} sont enregistrées, horodatées et scellées. Elles ne sont pas examinées systématiquement : elles le seront si l’entreprise conteste votre signalement.`
        : "Ajoutez un justificatif : il sera horodaté et scellé, et votre dossier entrera dans les statistiques publiques de l’entreprise.",
      quand: nbPieces ? "Immédiat" : "Dès l’ajout d’une pièce",
      actif: true,
    },
    {
      n: "2",
      titre: "Relance du professionnel",
      desc: "Vous recevez un modèle de réclamation prérempli avec les références de votre signalement, à envoyer vous-même par courriel ou en recommandé. Recours France n’écrit pas au professionnel à votre place.",
      quand: "Disponible immédiatement",
      actif: true,
    },
    {
      n: "3",
      titre: "Suivi des réponses",
      desc: "Vous enregistrez chaque réponse reçue dans votre espace. Le statut du signalement et les délais applicables se mettent à jour. Les professionnels ne répondent pas dans la plateforme.",
      quand: "À votre main, à tout moment",
      actif: false,
    },
    {
      n: "4",
      titre: "Médiation ou clôture",
      desc: "Deux mois après une réclamation écrite restée sans réponse satisfaisante, la saisine du médiateur compétent devient possible. Vous confirmez vous-même la résolution.",
      quand: `À partir du ${formatDateLongue(guide.etapes[3].echeance ?? new Date())}`,
      actif: false,
    },
  ];

  const livrables = [
    {
      titre: "Signalement avec numéro de référence",
      desc: `${signalement.reference}, à citer dans tous vos échanges avec le professionnel.`,
    },
    {
      titre: "Checklist des justificatifs et preuves",
      desc: `${guide.preuves.length} pièces listées, dans l’ordre d’utilité, avec ce qu’elles servent à démontrer.`,
    },
    {
      titre: "Coordonnées utiles du professionnel",
      desc: entreprise?.emailReclamation
        ? `Service consommateurs : ${entreprise.emailReclamation}${entreprise.telephoneReclamation ? ` · ${entreprise.telephoneReclamation}` : ""}.`
        : "Siège social et mentions légales issues des registres publics.",
    },
    {
      titre: "Démarches dans le bon ordre",
      desc: "Relance écrite, délais applicables, médiation, voie judiciaire en dernier recours.",
    },
    {
      titre: "Médiateur compétent",
      desc: entreprise?.mediateur
        ? `${entreprise.mediateur.nom}, saisine gratuite, conditions de recevabilité indiquées.`
        : "Non identifié pour cette entreprise : le médiateur doit figurer dans ses conditions générales.",
    },
    {
      titre: "Veille sur les publications légales",
      desc: "Procédure collective ou cessation d’activité : vous êtes prévenu, avec le délai qui court.",
    },
    {
      titre: "Démarches officielles disponibles",
      desc: "Notamment SignalConso lorsqu’elles sont pertinentes pour votre situation.",
    },
  ];

  return (
    <Page entete={{ navActive: "espace", sansCta: true }} piedComplet={false}>
      {/* ── Bandeau de confirmation ──────────────────────────────────────── */}
      <section style={{ background: "var(--rf-fond-teinte)", borderBottom: "1px solid var(--rf-separateur)" }}>
        <div
          className="rf-conteneur"
          style={{
            padding: "44px 32px 40px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))",
            gap: 36,
            alignItems: "start",
          }}
        >
          <div className="rf-min0">
            <span className="rf-badge rf-badge--succes" style={{ fontSize: 13, padding: "6px 12px" }}>
              <span
                aria-hidden="true"
                style={{
                  width: 18,
                  height: 18,
                  background: "var(--rf-succes)",
                  color: "#fff",
                  fontSize: 10,
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✓
              </span>
              Signalement enregistré
            </span>
            <h1 className="rf-h1" style={{ fontSize: 38, marginTop: 18, lineHeight: 1.15 }}>
              {`Le ${formatDateLongue(ouvertureMediation)}, vous pourrez saisir le médiateur.`}
            </h1>
            <p className="rf-texte rf-mt-14" style={{ fontSize: 16, maxWidth: 660 }}>
              <strong>Nous vous préviendrons ce jour-là.</strong> La saisine n’est recevable que deux mois
              après une réclamation écrite : c’est le délai que la plupart des dossiers laissent passer sans
              s’en apercevoir. Vous n’avez rien à noter.
            </p>

            <div className="rf-carte rf-mt-20" style={{ padding: "18px 20px", maxWidth: 620 }}>
              <div className="rf-etiquette">D’ici là, une seule chose à faire</div>
              <p className="rf-texte rf-mt-8" style={{ fontSize: 15 }}>
                Relancer {nomEntreprise} <strong>par écrit</strong>,{" "}
                {`avant le ${formatDateLongue(relance30j)}.`} Sans trace écrite, le médiateur déclarera votre
                saisine irrecevable — c’est la première cause de rejet.
              </p>
              <p className="rf-legende rf-mt-10">
                Le courrier est prêt plus bas, avec vos références et le délai légal. Vous l’envoyez
                vous-même : Recours France ne contacte jamais le professionnel à votre place.
              </p>
            </div>

            <div className="rf-carte rf-mt-14" style={{ padding: "18px 20px", maxWidth: 620 }}>
              <div className="rf-etiquette">Nous surveillons aussi l’entreprise</div>
              <p className="rf-texte rf-mt-8" style={{ fontSize: 15 }}>
                Si {nomEntreprise} entre en procédure collective, vous serez prévenu :{" "}
                <strong>vous n’aurez alors que deux mois</strong> pour déclarer votre créance auprès du
                mandataire, faute de quoi elle est éteinte. Nous lisons les publications légales à votre
                place, tant que votre dossier est ouvert.
              </p>
            </div>

            <p className="rf-legende rf-mt-16">
              Récapitulatif envoyé à {masquerEmail(signalement.email)} · référence{" "}
              <span className="rf-mono">{signalement.reference}</span>
            </p>
          </div>

          <div className="rf-carte rf-min0" style={{ padding: "22px 24px" }}>
            <div className="rf-etiquette">Référence du signalement</div>
            <div className="rf-mono" style={{ fontSize: 22, fontWeight: 700, marginTop: 8, letterSpacing: "-0.01em" }}>
              {signalement.reference}
            </div>
            <div className="rf-mt-16" style={{ borderTop: "1px solid var(--rf-ligne-carte)" }}>
              {recapitulatif.map((r) => (
                <div key={r.cle} className="rf-carte__rangee" style={{ padding: "10px 0" }}>
                  <span className="rf-carte__rangee-cle">{r.cle}</span>
                  <span className="rf-carte__rangee-valeur">{r.valeur}</span>
                </div>
              ))}
            </div>
            <Link href={`/mon-espace/dossier/${jeton}/recapitulatif`} className="rf-btn rf-btn--secondaire rf-btn--bloc rf-mt-16">
              Télécharger le récapitulatif
            </Link>
          </div>
        </div>
      </section>

      {/* ── Le courrier, disponible immédiatement ───────────────────────── */}
      <section className="rf-conteneur" style={{ padding: "36px 32px 0" }}>
        <div className="rf-carte" style={{ padding: 24 }}>
          <div className="rf-ligne--entre" style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
            <div className="rf-min0">
              <h2 className="rf-h2" style={{ fontSize: 21 }}>
                Votre courrier de réclamation, prêt à envoyer
              </h2>
              <p className="rf-texte rf-mt-8" style={{ fontSize: 14.5, maxWidth: 620 }}>
                Prérempli avec vos références, l’adresse du service consommateurs et le délai de trente jours
                qui fait courir la suite. Complétez le paragraphe entre crochets, puis envoyez-le — de
                préférence en recommandé, pour la preuve d’envoi.
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 240 }}>
              <CopierTexte texte={courrier} />
              <Link
                href={`/mon-espace/dossier/${jeton}/modele-relance`}
                className="rf-btn rf-btn--secondaire rf-btn--bloc"
              >
                Télécharger en PDF
              </Link>
            </div>
          </div>
          <pre
            className="rf-carte rf-carte--legere rf-mt-18"
            style={{
              padding: "18px 20px",
              margin: 0,
              maxHeight: 320,
              overflow: "auto",
              whiteSpace: "pre-wrap",
              fontFamily: "inherit",
              fontSize: 13.5,
              lineHeight: 1.65,
            }}
          >
            {courrier}
          </pre>
        </div>
      </section>

      {conseils.length ? (
        <section className="rf-conteneur" style={{ padding: "36px 32px 0" }}>
          <div
            className="rf-carte"
            style={{ padding: "20px 24px", borderLeft: "4px solid var(--rf-ambre, #8a5200)" }}
          >
            <div style={{ fontSize: 16.5, fontWeight: 700 }}>
              Vérifiez {conseils.length > 1 ? "vos pièces" : "votre pièce"}
            </div>
            <p className="rf-texte rf-mt-8" style={{ fontSize: 14.5 }}>
              {conseils.length > 1
                ? "Vos pièces sont bien enregistrées. Deux points méritent tout de même votre attention :"
                : "Votre pièce est bien enregistrée. Un point mérite tout de même votre attention :"}
            </p>
            <ul className="rf-mt-12" style={{ margin: 0, paddingLeft: 18 }}>
              {conseils.map((p) => (
                <li key={p.nomOrigine} className="rf-texte" style={{ fontSize: 14, marginBottom: 8 }}>
                  <strong>{p.nomOrigine}</strong> — {p.conseil}
                </li>
              ))}
            </ul>
            <p className="rf-legende rf-mt-12">
              Ces vérifications sont automatiques et n’empêchent rien. Elles ne sont jamais publiées et ne
              préjugent pas du contenu de votre dossier.
            </p>
          </div>
        </section>
      ) : null}

      {/* ── Vérification par justificatif ────────────────────────────────── */}
      <section className="rf-conteneur" style={{ padding: "36px 32px 0" }}>
        <div
          style={{
            border: "2px solid var(--rf-cobalt)",
            background: "var(--rf-fond-selection)",
            padding: 24,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))",
            gap: 28,
            alignItems: "center",
          }}
        >
          <div className="rf-min0">
            <span className="rf-badge rf-badge--sm rf-badge--non-verifie">
              Statut actuel : {LIBELLES_VERIFICATION[signalement.niveauVerification]}
            </span>
            <div style={{ fontSize: 21, fontWeight: 700, marginTop: 12, lineHeight: 1.3 }}>
              {avecJustificatif(signalement.niveauVerification)
                ? "Votre signalement est accompagné d’un justificatif"
                : "Ajoutez une pièce pour appuyer votre signalement"}
            </div>
            <p className="rf-texte rf-mt-8" style={{ fontSize: 14.5 }}>
              Un signalement accompagné d’un justificatif pèse davantage : il entre dans les statistiques
              publiques de l’entreprise et sert de base au récapitulatif utilisé en médiation. Une facture ou
              une confirmation de commande suffit. La pièce est horodatée et scellée, jamais publiée, et n’est
              examinée que si l’entreprise conteste.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 340, width: "100%", justifySelf: "end" }}>
            <Link href={`/mon-espace/dossier/${jeton}#pieces`} className="rf-btn rf-btn--primaire rf-btn--bloc" style={{ fontSize: 16.5, padding: "17px 20px" }}>
              {nbPieces ? "Ajouter une autre pièce" : "Ajouter un justificatif"}
            </Link>
            <span className="rf-legende rf-centre">PDF, JPG ou PNG · pièces privées, jamais publiées</span>
          </div>
        </div>
      </section>

      {/* ── Ce qui se passe ensuite ──────────────────────────────────────── */}
      <section className="rf-conteneur" style={{ padding: "40px 32px 34px" }}>
        <h2 className="rf-h2">Ce qui se passe ensuite</h2>
        <p className="rf-texte rf-mt-8" style={{ fontSize: 14.5, maxWidth: 780 }}>
          Vous gardez la main à chaque étape. Recours France ne contacte pas le professionnel à votre place et
          ne recueille pas sa réponse.
        </p>
        <div className="rf-grille rf-mt-24" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(270px,1fr))" }}>
          {suites.map((s) => (
            <article
              key={s.n}
              className="rf-carte"
              style={{ borderTop: `4px solid ${s.actif ? "var(--rf-cobalt)" : "var(--rf-texte-desactive)"}`, padding: "20px 22px" }}
            >
              <div className="rf-ligne" style={{ gap: 11, flexWrap: "nowrap" }}>
                <span className={`rf-pastille ${s.actif ? "rf-pastille--claire" : "rf-pastille--neutre"}`}>{s.n}</span>
                <span style={{ fontSize: 16, fontWeight: 700 }}>{s.titre}</span>
              </div>
              <p className="rf-texte rf-mt-10" style={{ fontSize: 13.5 }}>
                {s.desc}
              </p>
              <p className="rf-micro rf-mt-10 rf-separateur-haut" style={{ paddingTop: 9 }}>
                {s.quand}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* ── Livrables ────────────────────────────────────────────────────── */}
      <section className="rf-bande--legere">
        <div className="rf-conteneur" style={{ padding: "36px 32px" }}>
          <div className="rf-ligne--entre" style={{ display: "flex", flexWrap: "wrap" }}>
            <h2 className="rf-h2 rf-h2--secondaire">Votre dossier gratuit, disponible maintenant</h2>
            <Link href={`/mon-espace/dossier/${jeton}`} style={{ fontSize: 13.5, fontWeight: 600 }}>
              Ouvrir mon espace de suivi
            </Link>
          </div>
          <div className="rf-grille rf-mt-22">
            {livrables.map((d) => (
              <div key={d.titre} className="rf-carte" style={{ padding: "18px 20px" }}>
                <div className="rf-item">
                  <Puce />
                  <div className="rf-min0">
                    <div style={{ fontSize: 14.5, fontWeight: 700, lineHeight: 1.4 }}>{d.titre}</div>
                    <p className="rf-texte rf-mt-4" style={{ fontSize: 13 }}>
                      {d.desc}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="rf-encart rf-mt-20" style={{ fontSize: 14.5 }}>
            Recours France structure votre signalement, documente le litige et vous guide dans les démarches
            disponibles. La plateforme ne vous représente pas, n’exerce aucune pression sur l’entreprise, ne
            transmet pas votre réclamation et ne délivre pas de conseil juridique personnalisé.
          </p>
        </div>
      </section>

      {/* ── Cartes de fin ────────────────────────────────────────────────── */}
      <section
        className="rf-conteneur"
        style={{ padding: "36px 32px 44px", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 20, alignItems: "start" }}
      >
        <div className="rf-carte" style={{ padding: "22px 24px" }}>
          <div style={{ fontSize: 17, fontWeight: 700 }}>Suivez l’entreprise</div>
          <p className="rf-texte rf-mt-8" style={{ fontSize: 13.5 }}>
            Recevez une alerte lorsqu’un événement légal est publié sur {nomEntreprise} ou lorsque son indice
            évolue : dépôt de comptes, changement de siège, procédure collective.
          </p>
          {entreprise ? (
            <p className="rf-mt-12">
              <Link href={`/entreprises/${entreprise.slug}/suivre`} style={{ fontSize: 13.5, fontWeight: 600 }}>
                Voir la fiche et activer le suivi
              </Link>
            </p>
          ) : (
            <p className="rf-legende rf-mt-12">
              La fiche sera créée après rapprochement avec les registres publics, sous 48 heures ouvrées.
            </p>
          )}
        </div>
        <div className="rf-carte" style={{ padding: "22px 24px" }}>
          <div style={{ fontSize: 17, fontWeight: 700 }}>Partager votre expérience</div>
          <p className="rf-texte rf-mt-8" style={{ fontSize: 13.5 }}>
            Une fois votre signalement clôturé, vous pourrez publier depuis votre email un avis rattaché à ce
            signalement. Les avis rattachés à un dossier accompagné d’un justificatif sont distingués des avis simples.
          </p>
          {entreprise ? (
            <p className="rf-mt-12">
              <Link href={`/entreprises/${entreprise.slug}/avis`} style={{ fontSize: 13.5, fontWeight: 600 }}>
                Comprendre les avis avec justificatif
              </Link>
            </p>
          ) : null}
        </div>
        <div className="rf-carte rf-carte--teintee" style={{ padding: "22px 24px" }}>
          <div style={{ fontSize: 17, fontWeight: 700 }}>Litige urgent ou produit dangereux</div>
          <p className="rf-texte rf-mt-8" style={{ fontSize: 13.5 }}>
            Les démarches officielles restent ouvertes en parallèle, notamment SignalConso pour une pratique
            commerciale trompeuse ou un produit dangereux.
          </p>
          <p className="rf-mt-12">
            <Link href="/demarches-officielles" style={{ fontSize: 13.5, fontWeight: 600 }}>
              Voir les démarches officielles
            </Link>
          </p>
        </div>
      </section>
    </Page>
  );
}
