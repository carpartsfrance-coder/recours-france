import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Page } from "@/components/chrome";
import { Puce } from "@/components/ui";
import { prisma } from "@/lib/db";
import { resoudreJetonSuivi } from "@/lib/auth";
import { construireGuide, type Categorie, type ContactPrealable } from "@/lib/demarches";
import { formatDateLongue, formatMontant, LIBELLES_CATEGORIE, masquerEmail } from "@/lib/format";

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
  const nbPieces = await prisma.justificatif.count({ where: { signalementId: signalement.id } });

  const nomEntreprise = entreprise?.denomination ?? signalement.entrepriseLibreNom ?? "Entreprise non identifiée";
  const guide = construireGuide({
    categorie: signalement.categorie as Categorie,
    contactPrealable: signalement.contactPrealable as ContactPrealable,
    dateSignalement: signalement.creeLe,
    reference: signalement.reference,
    verifie: signalement.niveauVerification === "VERIFIE",
    mediateur: entreprise?.mediateur ?? null,
  });

  const recapitulatif = [
    { cle: "Entreprise", valeur: nomEntreprise },
    { cle: "Catégorie", valeur: LIBELLES_CATEGORIE[signalement.categorie] },
    { cle: "Montant déclaré", valeur: signalement.montant ? formatMontant(Number(signalement.montant)) : "non déclaré" },
    { cle: "Déposé le", valeur: formatDateLongue(signalement.creeLe) },
    {
      cle: "Niveau de vérification",
      valeur: signalement.niveauVerification === "VERIFIE" ? "Vérifié" : "Déclaré",
    },
  ];

  const suites = [
    {
      n: "1",
      titre: "Vérification",
      desc: nbPieces
        ? `Vos ${nbPieces} pièce${nbPieces > 1 ? "s" : ""} sont en attente de contrôle. Nous vérifions la cohérence du nom, de la date et du montant. Le signalement passe alors en signalement vérifié.`
        : "Si vous ajoutez un justificatif, nous contrôlons la relation commerciale sous 48 heures ouvrées. Le signalement passe alors en signalement vérifié.",
      quand: nbPieces ? "Sous 48 h ouvrées" : "Sous 48 h ouvrées, après ajout d’une pièce",
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
              Votre signalement est créé.
              <br />
              Voici ce que vous pouvez faire maintenant.
            </h1>
            <p className="rf-texte rf-mt-14" style={{ fontSize: 16, maxWidth: 660 }}>
              Un récapitulatif vient d’être envoyé à {masquerEmail(signalement.email)}. Conservez la référence
              de votre signalement : elle figure sur chaque document et courrier que vous enverrez au
              professionnel.
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
              Statut actuel : {signalement.niveauVerification === "VERIFIE" ? "signalement vérifié" : "signalement déclaré"}
            </span>
            <div style={{ fontSize: 21, fontWeight: 700, marginTop: 12, lineHeight: 1.3 }}>
              {signalement.niveauVerification === "VERIFIE"
                ? "Votre signalement est vérifié"
                : "Ajoutez une pièce pour faire vérifier votre signalement"}
            </div>
            <p className="rf-texte rf-mt-8" style={{ fontSize: 14.5 }}>
              Un signalement vérifié pèse davantage : il entre dans les statistiques publiques de l’entreprise
              et sert de base au récapitulatif utilisé en médiation. Une facture ou une confirmation de
              commande suffit. Vos pièces ne sont jamais publiées.
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
            signalement. Les avis rattachés à un signalement vérifié sont distingués des avis simples.
          </p>
          {entreprise ? (
            <p className="rf-mt-12">
              <Link href={`/entreprises/${entreprise.slug}/avis`} style={{ fontSize: 13.5, fontWeight: 600 }}>
                Comprendre les avis vérifiés
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
