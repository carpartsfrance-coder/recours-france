import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { CompteurVue } from "@/components/fiche/compteur-vue";
import { prisma } from "@/lib/db";
import { chargerEntreprise, detailEntreprise } from "@/lib/fiche";
import {
  DonneesStructurees,
  faqJsonLd,
  filAlianeJsonLd,
  organisationJsonLd,
} from "@/components/donnees-structurees";
import { mediateurPublie } from "@/lib/mediation";
import { ficheIndexable } from "@/lib/indexation";
import { FAMILLES_PUBLICATION, etapesPlan, faqRefonte, problemesFiche } from "@/lib/refonte";
import { Onglets } from "@/components/fiche-entreprise/onglets";
import { BoutonCopier } from "@/components/fiche-entreprise/copier";
import { Panneau } from "@/components/fiche-entreprise/panneau";
import { typo } from "@/lib/typographie";
import { EDITEUR, siegeSocial } from "@/lib/editeur";
import {
  Alerte, Bouclier, Branchement, Bulle, Camembert, Carte, CercleCoche,
  Chevron, Cloche, Colis, Document, Epingle, Fleche, Graphique, Groupe,
  Horloge, Immeuble, Info, Oeil, Presse, Question, Remboursement,
  Balance, Calendrier, Mallette,
} from "@/components/refonte/icones";
import { GUIDES, declarationPublique } from "@/lib/observatoire";
import {
  cheminCommune,
  cheminDepartement,
  cheminSecteur,
  libelleSecteur,
  nomDepartement,
  voisines,
} from "@/lib/maillage";
import {
  LIBELLES_DEMANDE,
  LIBELLES_ETAT_PRO,
  adressePostale,
  communeEnTitre,
  formatDateLongue,
  formatMontant,
  formatNombre,
  formatSiren,
  formatSiret,
  libelleEffectif,
} from "@/lib/format";

/**
 * Fiche entreprise — gabarit du handoff DISTRIMOTOR.
 *
 * L'ordre des sections vient du handoff et n'est pas négociable : le problème
 * du visiteur d'abord, l'entreprise ensuite. Une page qui ouvrirait sur le
 * SIREN, la forme juridique et le chiffre d'affaires serait un annuaire de
 * plus — il en existe d'excellents, vieux de vingt-cinq ans. Celle-ci répond à
 * une autre question : « j'ai un problème avec cette entreprise, que puis-je
 * faire ? »
 *
 * Un seul état vide sur toute la page, dans la section des signalements. Le
 * handoff l'exige — « ne pas répéter cette absence ailleurs » — et la raison
 * tient : six fiches sur treize millions en portent un aujourd'hui, et répéter
 * « aucun » quatre fois par page ferait treize millions de pages creuses.
 *
 * Ni note, ni étoile, ni score, ni `AggregateRating`. La requête visée reste
 * « avis {entreprise} » : le mot est servi par le title, la description, le
 * chapô et la première question de la foire aux questions — pas par une note
 * qui n'existe pas.
 *
 * Mise en cache une journée : rien ici ne dépend du visiteur.
 */
export const revalidate = 86400;

const ICONES_PROBLEME = {
  alerte: Alerte, colis: Colis, remboursement: Remboursement,
  bouclier: Bouclier, document: Document, question: Question,
  carte: Carte, bulle: Bulle,
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const base = await chargerEntreprise(slug);
  if (!base) return { title: "Entreprise" };

  const nom = base.denomination;
  const lieu = base.commune ? ` (${communeEnTitre(base.commune)})` : "";

  return {
    ...(ficheIndexable(base) ? {} : { robots: { index: false, follow: true } }),
    // Le handoff écrit « {nom} : litiges et signalements publics ». « avis » y
    // est ajouté, et seulement là : c'est le mot que la personne tape, le
    // title est l'élément le plus décisif pour une requête de marque, et le
    // handoff se donne lui-même « {nom} avis » comme première cible. Le H1
    // reste celui du handoff, au mot près.
    title: typo(`${nom}${lieu} : avis, litiges et signalements publics`),
    description: typo(
      `Vous recherchez des avis sur ${nom} ? Consultez les signalements publiés, leur statut et les démarches disponibles.`,
    ),
    alternates: { canonical: `/entreprises/${base.slug}` },
  };
}

export default async function FicheEntreprise({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const base = await chargerEntreprise(slug);
  if (!base) notFound();
  if (base.slug !== slug) redirect(`/entreprises/${base.slug}`);

  const { entreprise, comptes, evenements, decisions } = await detailEntreprise(base.id);
  if (!entreprise) notFound();

  const nom = entreprise.denomination;
  const active = entreprise.etatAdministratif === "ACTIVE";

  const [signalements, total, resolus] = await Promise.all([
    prisma.signalement.findMany({
      where: { entrepriseId: entreprise.id, moderation: "PUBLIE" },
      orderBy: { creeLe: "desc" },
      take: 10,
    }),
    prisma.signalement.count({ where: { entrepriseId: entreprise.id, moderation: "PUBLIE" } }),
    prisma.signalement.count({
      where: { entrepriseId: entreprise.id, moderation: "PUBLIE", resolutionConfirmee: true },
    }),
  ]);
  const enAttente = total - resolus;

  const mediateurDeclare = mediateurPublie(entreprise);
  const [boutique, proches] = await Promise.all([
    prisma.boutique.findFirst({
      where: { entrepriseId: entreprise.id },
      select: { slug: true, domaine: true },
    }),
    voisines(entreprise),
  ]);
  // Toutes les voisines trouvées, pas une sélection de dix. C'est le maillage
  // interne qui fait explorer un annuaire de cette taille, pas le plan de site :
  // societe.com pose près de cent liens fiche→fiche par page.
  const comparables = [...proches.memeVille, ...proches.memeDepartement, ...proches.memeSecteur];
  const secteur = entreprise.secteur ?? "autre";
  const etapes = etapesPlan(nom, mediateurDeclare?.nom ?? null).slice(0, 3);
  const questions = faqRefonte(nom);
  const problemes = problemesFiche(entreprise.naf ?? null, entreprise.secteur ?? null);
  const tunnel = `/signaler/${base.slug}`;

  const commune = entreprise.commune ?? null;
  const adresse = adressePostale(entreprise);
  const lienDepartement = entreprise.departement ? cheminDepartement(secteur, entreprise.departement) : null;
  const lienSecteur = cheminSecteur(secteur);
  const lienCommune =
    entreprise.departement && entreprise.communeSlug
      ? cheminCommune(secteur, entreprise.departement, entreprise.communeSlug)
      : null;

  /* ── Finances ─────────────────────────────────────────────────────────
     Le handoff demande quatre cartes dont « Total du bilan ». Nous ne
     collectons pas ce poste : afficher « Non publié » laisserait croire qu'un
     dépôt a été consulté et trouvé confidentiel, ce qui serait faux. La
     quatrième carte porte donc le dépôt lui-même, qui est une donnée réelle —
     et savoir qu'une société ne dépose aucun compte est déjà un renseignement. */
  const dernier = comptes[0] ?? null;
  const dernierPublic = comptes.find((c) => c.chiffreAffaires || c.resultatNet) ?? null;
  const anneeCourante = new Date().getFullYear();
  const donneesAnciennes = dernierPublic !== null && anneeCourante - dernierPublic.exercice >= 3;

  /**
   * Chaque poste porte son propre exercice.
   *
   * La confidentialité de l'article L. 232-25 n'est pas tout ou rien. Son
   * premier alinéa couvre l'ensemble des comptes ; le second ne couvre que le
   * compte de résultat, et le bilan reste public. DISTRIMOTOR relève du
   * second : son chiffre d'affaires est masqué presque chaque année, son
   * résultat net est publié tous les ans. Lier les deux au même exercice
   * cachait un résultat que le registre publie.
   *
   * On remonte donc, poste par poste, au dernier exercice qui le porte — le
   * chiffre d'affaires de 2022, le résultat net de 2025 — et chaque carte
   * affiche son année. Deux années différentes côte à côte demandent d'être
   * étiquetées, pas d'être alignées de force sur la plus récente.
   *
   * Le millésime ne paraît qu'une fois par carte, sous la valeur. L'écrire
   * aussi dans le titre le faisait mentir : le titre reprenait le dernier
   * exercice déposé, la valeur celui qui portait le poste, et JK AUTO
   * annonçait « Chiffre d'affaires 2025 » au-dessus de « Exercice 2023 ».
   */
  const valeurFinance = (champ: "chiffreAffaires" | "resultatNet") => {
    if (!dernier) return { n: "Non déposé", l: "Aucun compte annuel au registre", absent: true };
    const porteur = comptes.find((c) => c[champ]);
    if (porteur) {
      return { n: formatMontant(Number(porteur[champ])), l: `Exercice ${porteur.exercice}`, absent: false };
    }
    if (dernier.confidentiel) return { n: "Non publié", l: "Comptes confidentiels", absent: true };
    return { n: "Non publié", l: `Exercice ${dernier.exercice}, poste non détaillé`, absent: true };
  };
  const ca = valeurFinance("chiffreAffaires");
  const rn = valeurFinance("resultatNet");

  /**
   * Les lignes d'identité, dans l'ordre du handoff.
   *
   * Le SIREN et le SIRET portent un bouton de copie, l'état administratif une
   * pilule colorée. Une ligne absente n'est pas affichée vide : le registre ne
   * renseigne pas tout pour toutes les sociétés, et « Non renseigné » répété
   * six fois ferait passer une fiche incomplète pour une fiche vide.
   */
  const lignesIdentite: { k: string; v: string; copiable?: boolean; pilule?: boolean }[] = [
    { k: "Raison sociale", v: nom },
    { k: "SIREN", v: formatSiren(entreprise.siren), copiable: true },
    ...(entreprise.siretSiege
      ? [{ k: "SIRET du siège", v: formatSiret(entreprise.siretSiege), copiable: true }]
      : []),
    ...(entreprise.formeJuridique ? [{ k: "Forme juridique", v: entreprise.formeJuridique }] : []),
    { k: "État administratif", v: active ? "En activité" : "Cessée", pilule: true },
    ...(entreprise.nafLibelle ? [{ k: "Activité", v: entreprise.nafLibelle }] : []),
    ...(adresse ? [{ k: "Adresse", v: adresse, copiable: true }] : []),
    ...(entreprise.dateImmatriculation
      ? [{ k: "Création", v: formatDateLongue(entreprise.dateImmatriculation) }]
      : []),
  ];


  // Une clé, jamais le composant : la frontière serveur/client ne sérialise
  // pas les fonctions, et un composant React en est une.
  /**
   * Les publications officielles, regroupées par famille.
   *
   * Le BODACC est la source qui fait foi : la fiche cite l'annonce et renvoie
   * à sa page publique plutôt que d'en recopier le texte. Un dépôt de comptes
   * atteste du dépôt, pas des chiffres — c'est une nuance que la section dit
   * explicitement, faute de quoi le lecteur croit lire un bilan.
   */
  const publications = FAMILLES_PUBLICATION.map((f) => ({
    ...f,
    lignes: evenements.filter((e) => f.categories.includes(e.categorie ?? "")),
  })).filter((f) => f.lignes.length > 0);
  const totalPublications = publications.reduce((n, f) => n + f.lignes.length, 0);

  const onglets = [
    { href: "#apercu", libelle: "Aperçu", icone: "liste" as const },
    { href: "#signalements", libelle: total > 0 ? `Signalements (${formatNombre(total)})` : "Signalements", icone: "liste" as const },
    // Le handoff laisse en point ouvert l'absence d'onglet vers la section qui
    // porte la conversion. On l'ajoute : une section qu'aucun onglet ne
    // désigne n'est atteinte que par ceux qui font défiler toute la page.
    { href: "#problemes", libelle: "Signaler un problème", icone: "etiquette" as const },
    { href: "#finances", libelle: "Finances", icone: "graphique" as const },
    ...(totalPublications > 0
      ? [{ href: "#documents", libelle: "Documents officiels", icone: "document" as const }]
      : []),
    ...(decisions.length > 0
      ? [{ href: "#justice", libelle: "Décisions de justice", icone: "balance" as const }]
      : []),
    { href: "#identite", libelle: "Identité", icone: "epingle" as const },
    { href: "#plan", libelle: "Plan d’action", icone: "coche" as const },
    { href: "#faq", libelle: "FAQ", icone: "question" as const },
  ];

  const fil = [
    { libelle: "Accueil", href: "/" },
    { libelle: "Entreprises", href: "/annuaire" },
    { libelle: nom },
  ];

  return (
    <div className="rfe">
      <CompteurVue siren={entreprise.siren} />
      <DonneesStructurees donnees={filAlianeJsonLd(fil)} />
      <DonneesStructurees
        donnees={organisationJsonLd({
          nom,
          siren: entreprise.siren,
          url: `/entreprises/${base.slug}`,
          siteWeb: entreprise.siteWeb,
          adresse: entreprise.adresseSiege,
          codePostal: entreprise.codePostal,
          commune: entreprise.commune,
        })}
      />
      {/* Ni Review ni AggregateRating : aucune note n'est affichée, en déclarer
          une serait faux et exposerait à une pénalité. */}
      <DonneesStructurees donnees={faqJsonLd(questions.map((q) => ({ q: typo(q.q), a: typo(q.r.join(" ")) })))} />

      {/* Le bandeau d'indépendance a été retiré de cette page.
          La mention subsiste dans le pied de la fiche — « plateforme privée et
          indépendante », l'éditeur nommé, et la distinction explicite entre lui
          et la société tierce dont la fiche parle — ainsi que dans les mentions
          légales. L'exigence de ne jamais se faire passer pour un organisme
          public reste donc tenue ; c'est sa répétition en tête d'écran qui
          cesse. Le parcours de dépôt la garde, lui : c'est là qu'on publie une
          mise en cause, et le régime de la plateforme y décide de la portée du
          geste. */}

      {/* ── En-tête ─────────────────────────────────────────────────── */}
      <header className="rfe-entete">
        <div className="rfe-conteneur rfe-entete__piste">
          <Link href="/" className="rfe-logo" aria-label="Recours France — accueil">
            <span className="rfe-logo__med">
              <Presse taille={22} />
            </span>
            <span className="rfe-logo__filet" aria-hidden="true" />
            <span>
              <span className="rfe-logo__nom" style={{ display: "block" }}>
                Recours France
              </span>
              <span className="rfe-logo__base">Observatoire des problèmes consommateurs</span>
            </span>
          </Link>
          <nav className="rfe-nav">
            <Link href="/methodologie">{typo("Comment ça marche")}</Link>
            <Link href="/annuaire">Entreprises</Link>
            <Link href="/aide">Guides</Link>
          </nav>
          <Link href={tunnel} className="rfe-btn rfe-btn--sm rfe-entete__cta">
            {typo("Rendre mon litige visible")}
          </Link>
        </div>
      </header>

      <main id="contenu" className="rfe-page">
        <div className="rfe-pile">
        {/* ── 3. Fil d'Ariane ───────────────────────────────────────── */}
        <div className="rfe-conteneur">
          <nav className="rfe-fil" aria-label="Fil d’Ariane">
            {fil.map((f, i) => (
              <span key={f.libelle} style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                {i > 0 ? <Chevron taille={14} style={{ transform: "rotate(-90deg)" }} /> : null}
                {f.href ? <Link href={f.href}>{f.libelle}</Link> : <span>{f.libelle}</span>}
              </span>
            ))}
          </nav>
        </div>

        {/* ── 4. Hero ───────────────────────────────────────────────── */}
        <div className="rfe-conteneur" style={{ paddingBottom: "clamp(20px, 2.4cqw, 32px)" }}>
          <div className="rfe-hero">
            <div className="rfe-hero__g">
              <div className="rfe-avatar" aria-hidden="true" style={{ marginBottom: 16 }}>
                {nom.trim().charAt(0).toUpperCase()}
              </div>

              <h1 className="rfe-h1">{typo(`${nom} : avis, litiges et informations publiques`)}</h1>

              <p className="rfe-second" style={{ marginTop: 8 }}>
                {typo("Rapport public sur l’entreprise")}
              </p>

              <p style={{ marginTop: 14 }}>
                <span className={`rfe-badge-actif${active ? "" : " rfe-badge-actif--cesse"}`}>
                  <CercleCoche taille={15} />
                  {typo(active ? "Entreprise active" : "Entreprise cessée")}
                </span>
              </p>

              <p className="rfe-intro" style={{ marginTop: 14 }}>
                {typo(
                  `Recours France ne publie pas de notes commerciales : consultez les situations déclarées et les informations officielles.`,
                )}
              </p>

              {/* Les chips d'identité, sur deux rangs. `white-space: nowrap`
                  est porté par la classe : sans lui, « Commerce de détail
                  d'équipements automobiles » casse en deux à 1440 px. */}
              <div className="rfe-chips" style={{ marginTop: 16 }}>
                <span className="rfe-chip-id">
                  <Carte taille={15} />
                  {typo(`SIREN ${formatSiren(entreprise.siren)}`)}
                </span>
                {entreprise.formeJuridique ? (
                  <span className="rfe-chip-id">{entreprise.formeJuridique}</span>
                ) : null}
                {commune ? (
                  <span className="rfe-chip-id">
                    <Epingle taille={15} />
                    {communeEnTitre(commune)}
                  </span>
                ) : null}
                {entreprise.nafLibelle ? (
                  <span className="rfe-chip-id">
                    <Mallette taille={15} />
                    {entreprise.nafLibelle}
                  </span>
                ) : null}
                {entreprise.dateImmatriculation ? (
                  <span className="rfe-chip-id">
                    <Calendrier taille={15} />
                    {typo(`Créée en ${new Date(entreprise.dateImmatriculation).getFullYear()}`)}
                  </span>
                ) : null}
              </div>

            </div>

            {/* Colonne droite : l'action, et rien d'autre. Le handoff v2 y
                remplace la liste « ce que vous obtenez » par le seul bouton —
                elle expliquait le service à qui avait déjà décidé de s'en
                servir, et repoussait le clic d'un écran. */}
            <div className="rfe-hero__d">
              <Link href={tunnel} className="rfe-btn" style={{ width: "100%", minHeight: 50 }}>
                {typo("Rendre mon litige visible")}
              </Link>

              <p style={{ marginTop: 14, textAlign: "center" }}>
                <a href={total > 0 ? "#signalements" : "#plan"} className="rfe-lien-fleche">
                  {typo(
                    total > 1
                      ? `Voir les ${formatNombre(total)} signalements publics`
                      : total === 1
                        ? "Voir le signalement public"
                        : "Voir les démarches adaptées",
                  )}
                  <Fleche taille={15} />
                </a>
              </p>

              <p className="rfe-aide" style={{ marginTop: 12, textAlign: "center" }}>
                {typo("Gratuit • 3 minutes • Publication immédiate")}
              </p>
            </div>
          </div>
        </div>

        {/* ── 5. Onglets ────────────────────────────────────────────── */}
        <Onglets liens={onglets} />

        {/* ── Résumé de la fiche ────────────────────────────────────────
            Les six indicateurs se déduisent des données, jamais saisis. Le
            handoff s'interroge lui-même sur leur redondance avec les sections
            qui suivent : elle est assumée. Un visiteur arrivé par « avis X »
            doit savoir en cinq secondes ce que la page contient, sans faire
            défiler huit sections pour le découvrir. */}
        <section id="apercu" className="rfe-bloc">
          <div className="rfe-bloc__t">
            <h2>{typo(`Résumé de la fiche de ${nom}`)}</h2>
            <p>
              {typo(`Les principales informations disponibles sur ${nom}.`)}
            </p>
          </div>
          <div className="rfe-bloc__c">

            <div className="rfe-apercu" style={{ marginTop: 20 }}>
              <div className="rfe-apercu__c">
                <div className="rfe-apercu__k">
                  <span className="rfe-apercu__med" style={{ background: "#FEF6E7", color: "#C2751A" }}>
                    <Document taille={17} />
                  </span>
                  {typo("Signalements publics")}
                </div>
                <div className="rfe-apercu__n">
                  {formatNombre(total)}
                  {enAttente > 0 ? (
                    <span className="rfe-apercu__badge">
                      {typo(`${formatNombre(enAttente)} en attente`)}
                    </span>
                  ) : null}
                </div>
                <div className="rfe-apercu__l">
                  {typo(total > 0 ? "Situations déclarées sur Recours France" : "Aucune situation déclarée à ce jour")}
                </div>
              </div>

              <div className="rfe-apercu__c">
                <div className="rfe-apercu__k">
                  <span className="rfe-apercu__med" style={{ background: "#F1F5FB", color: "var(--p-second)" }}>
                    <CercleCoche taille={17} />
                  </span>
                  {typo("Litiges résolus")}
                </div>
                <div className="rfe-apercu__n">{formatNombre(resolus)}</div>
                <div className="rfe-apercu__l">
                  {typo(resolus > 0 ? "Signalements indiqués comme résolus" : "Aucun signalement indiqué comme résolu")}
                </div>
              </div>

              <div className="rfe-apercu__c">
                <div className="rfe-apercu__k">
                  <span className="rfe-apercu__med" style={{ background: "#EAF9EF", color: "#16A34A" }}>
                    <CercleCoche taille={17} />
                  </span>
                  {typo("État de l’entreprise")}
                </div>
                <div className="rfe-apercu__n" style={{ fontSize: 20 }}>
                  <span className="rfe-pilule-verte" style={active ? undefined : { background: "#FDF6E9", color: "#8A5A12" }}>
                    {active ? "Active" : "Cessée"}
                  </span>
                </div>
                <div className="rfe-apercu__l">{typo("Donnée du registre")}</div>
              </div>

              <div className="rfe-apercu__c">
                <div className="rfe-apercu__k">
                  <span className="rfe-apercu__med" style={{ background: "var(--p-pale)", color: "var(--p-bleu)" }}>
                    <Document taille={17} />
                  </span>
                  {typo("Comptes déposés")}
                </div>
                <div className="rfe-apercu__n">{formatNombre(comptes.length)}</div>
                <div className="rfe-apercu__l">
                  {typo(
                    comptes.length > 0
                      ? `Exercices ${comptes[comptes.length - 1].exercice} à ${comptes[0].exercice}`
                      : "Aucun compte annuel au registre",
                  )}
                </div>
              </div>

              <div className="rfe-apercu__c">
                <div className="rfe-apercu__k">
                  <span className="rfe-apercu__med" style={{ background: "var(--p-pale)", color: "var(--p-bleu)" }}>
                    <Document taille={17} />
                  </span>
                  {typo("Publications officielles")}
                </div>
                <div className="rfe-apercu__n">{formatNombre(totalPublications)}</div>
                <div className="rfe-apercu__l">{typo("Annonces BODACC")}</div>
              </div>

              <div className="rfe-apercu__c">
                <div className="rfe-apercu__k">
                  <span className="rfe-apercu__med" style={{ background: "#F1F5FB", color: "var(--p-second)" }}>
                    <Balance taille={17} />
                  </span>
                  {typo("Décisions de justice citées")}
                </div>
                <div className="rfe-apercu__n">{formatNombre(decisions.length)}</div>
                <div className="rfe-apercu__l">{typo("Ne signifie pas condamnation")}</div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 6. Signalements publics ───────────────────────────────── */}
        <section id="signalements" className="rfe-bloc">
          <div className="rfe-bloc__t">
            <h2>{typo(`Signalements publics concernant ${nom}`)}</h2>
            
          </div>
          <div className="rfe-bloc__c">{total === 0 ? (
              <div className="rfe-carte" style={{ marginTop: 20 }}>
                <div className="rfe-h3">
                  {typo(`Aucun signalement public concernant ${nom} pour le moment.`)}
                </div>
                <p className="rfe-second" style={{ marginTop: 8, maxWidth: "70ch" }}>
                  {typo(
                    "Cela ne permet pas de conclure que l’entreprise ne rencontre aucun problème. Cela signifie qu’aucun consommateur n’a encore rendu son litige visible ici.",
                  )}
                </p>
                <Link href={tunnel} className="rfe-btn" style={{ marginTop: 18 }}>
                  {typo("Être le premier à rendre mon litige visible")}
                </Link>
              </div>
            ) : (
              <>
                <div className="rfe-compteurs" style={{ marginTop: 18 }}>
                  <span className="rfe-compteur">
                    <b>{formatNombre(total)}</b>
                    <span>
                      signalement{total > 1 ? "s" : ""} publié{total > 1 ? "s" : ""}
                    </span>
                  </span>
                  <span className="rfe-compteur rfe-compteur--vert">
                    <b>{formatNombre(resolus)}</b>
                    <span>résolu{resolus > 1 ? "s" : ""}</span>
                  </span>
                  <span className="rfe-compteur rfe-compteur--rouge">
                    <b>{formatNombre(enAttente)}</b>
                    <span>en attente</span>
                  </span>
                </div>

                <div style={{ display: "grid", gap: 14, marginTop: 20 }}>
                  {signalements.map((s) => {
                    const categorie =
                      s.sousCategorie ??
                      problemes.find((p) => p.motif === s.categorie)?.libelle ??
                      "Litige";
                    return (
                      <article key={s.id} className="rfe-signalement">
                        <div className="rfe-signalement__g">
                          <span className="rfe-pilule">{typo(categorie)}</span>
                          <h3 className="rfe-h3" style={{ marginTop: 12 }}>
                            {typo(`${categorie} — faits du ${formatDateLongue(s.dateFaits)}`)}
                          </h3>
                          <p className="rfe-texte" style={{ marginTop: 8, maxWidth: "72ch" }}>
                            {typo(
                              declarationPublique(
                                s,
                                (c) => LIBELLES_DEMANDE[c] ?? c,
                                (c) => LIBELLES_ETAT_PRO[c] ?? c,
                              ),
                            )}
                          </p>
                          <hr style={{ border: 0, borderTop: "1px solid var(--p-filet)", margin: "16px 0 12px" }} />
                          <div className="rfe-aide" style={{ display: "flex", flexWrap: "wrap", gap: "6px 18px" }}>
                            <span>{typo(`Publié le ${formatDateLongue(s.creeLe)}`)}</span>
                            {s.solutionLibelle ? (
                              <span>
                                {typo("Solution demandée :")}{" "}
                                <strong style={{ color: "var(--p-texte)", fontWeight: 600 }}>
                                  {typo(s.solutionLibelle)}
                                </strong>
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <div className="rfe-signalement__d">
                          <span
                            className={`rfe-statut ${s.resolutionConfirmee ? "rfe-statut--resolu" : "rfe-statut--attente"}`}
                          >
                            {s.resolutionConfirmee ? <CercleCoche taille={13} /> : <Horloge taille={13} />}
                            {typo(s.resolutionConfirmee ? "Résolu" : "En attente de solution")}
                          </span>
                          <p className="rfe-aide" style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
                            <Cloche taille={16} style={{ flex: "none", color: "var(--p-desactive)", marginTop: 1 }} />
                            {typo("Entreprise pouvant être alertée après vérification des coordonnées.")}
                          </p>
                        </div>
                      </article>
                    );
                  })}
                </div>

                <div className="rfe-bandeau" style={{ marginTop: 20 }}>
                  <span className="rfe-probleme__med" style={{ borderRadius: "50%" }}>
                    <Groupe taille={22} />
                  </span>
                  <div className="rfe-bandeau__t">
                    <div className="rfe-titre-carte">{typo("Vous rencontrez un problème similaire ?")}</div>
                  </div>
                  <Link href={tunnel} className="rfe-btn rfe-btn--sm">
                    {typo("Publier mon litige gratuitement")}
                  </Link>
                </div>
              </>
            )}

            <p className="rfe-aide" style={{ marginTop: 16, maxWidth: "86ch" }}>
              {typo(
                "Chaque signalement reprend la déclaration de son auteur. Recours France ne vérifie pas le récit des faits et n’intervient pas dans le règlement du litige.",
              )}
            </p>
          </div>
        </section>

        {/* ── 7. Quel problème rencontrez-vous ? ────────────────────── */}
        <section id="problemes" className="rfe-bloc">
          <div className="rfe-bloc__t">
            <h2>{typo("Quel problème rencontrez-vous ?")}</h2>
            <p>
              {typo(
                "Choisissez la situation la plus proche de la vôtre : la réclamation et les démarches sont adaptées à votre choix.",
              )}
            </p>
          </div>
          <div className="rfe-bloc__c">

            <div className="rfe-grille" style={{ marginTop: 20 }}>
              {problemes.map((p) => {
                const Icone = ICONES_PROBLEME[p.icone];
                return (
                  <Link key={p.cle} href={`${tunnel}?motif=${p.motif}`} className="rfe-carte rfe-probleme">
                    <span className="rfe-probleme__med">
                      <Icone taille={22} />
                    </span>
                    <span className="rfe-titre-carte">{typo(p.libelle)}</span>
                    <span className="rfe-aide">{typo(p.exemple)}</span>
                    <span className="rfe-probleme__pied">
                      {typo("Signaler ce problème")}
                      <Fleche taille={16} />
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── 8. Informations financières ───────────────────────────── */}
        <section id="finances" className="rfe-bloc">
          <div className="rfe-bloc__t">
            <h2>{typo(`Informations financières de ${nom}`)}</h2>
            
          </div>
          <div className="rfe-bloc__c"><div className="rfe-finances" style={{ marginTop: 20 }}>
              <div className="rfe-carte">
                <div className="rfe-finance__k">
                  <Graphique taille={18} />
                  {typo("Chiffre d’affaires")}
                </div>
                <div className="rfe-finance__v">
                  <div className={`rfe-finance__n${ca.absent ? " rfe-finance__n--absent" : ""}`}>{ca.n}</div>
                  <div className="rfe-finance__l">{typo(ca.l)}</div>
                </div>
              </div>

              <div className="rfe-carte">
                <div className="rfe-finance__k">
                  <Camembert taille={18} />
                  {typo("Résultat net")}
                </div>
                <div className="rfe-finance__v">
                  <div className={`rfe-finance__n${rn.absent ? " rfe-finance__n--absent" : ""}`}>{rn.n}</div>
                  <div className="rfe-finance__l">{typo(rn.l)}</div>
                </div>
              </div>

              <div className="rfe-carte">
                <div className="rfe-finance__k">
                  <Document taille={18} />
                  {typo("Comptes déposés")}
                </div>
                <div className="rfe-finance__v">
                  <div className={`rfe-finance__n${comptes.length === 0 ? " rfe-finance__n--absent" : ""}`}>
                    {comptes.length === 0 ? "Aucun" : formatNombre(comptes.length)}
                  </div>
                  <div className="rfe-finance__l">
                    {typo(
                      comptes.length === 0
                        ? "Aucun exercice au registre à ce jour"
                        : `Exercices ${comptes[comptes.length - 1].exercice} à ${comptes[0].exercice}`,
                    )}
                  </div>
                </div>
              </div>

              <div className="rfe-carte">
                <div className="rfe-finance__k">
                  <Groupe taille={18} />
                  {typo("Effectif connu")}
                </div>
                <div className="rfe-finance__v">
                  <div className="rfe-finance__n" style={{ fontSize: 21 }}>
                    {libelleEffectif(entreprise.trancheEffectif)}
                  </div>
                  <div className="rfe-finance__l">{typo("Tranche déclarée au répertoire Sirene")}</div>
                </div>
              </div>
            </div>

            {/* Le rappel « dernier exercice public » a disparu : les cartes
                portent désormais chacune leur année, il répétait mot pour mot
                ce qu'elles disaient juste au-dessus. Reste l'avertissement,
                qui lui garde son utilité — un chiffre de 2019 lu en 2026 ne
                décrit pas la société d'aujourd'hui. */}
            {donneesAnciennes ? (
              <div className="rfe-carte rfe-anciennes" style={{ marginTop: 16 }}>
                <div>
                  <span className="rfe-chip-ambre">
                    <Alerte taille={13} />
                    {typo("Données anciennes")}
                  </span>
                  <p className="rfe-finance__l" style={{ marginTop: 8 }}>
                    {typo(
                      `Le dernier exercice publié remonte à ${dernierPublic?.exercice}. À ne pas confondre avec la situation actuelle.`,
                    )}
                  </p>
                </div>
              </div>
            ) : null}

            <p className="rfe-aide" style={{ marginTop: 16, display: "flex", gap: 9, alignItems: "flex-start" }}>
              <Info taille={16} style={{ flex: "none", color: "var(--p-desactive)", marginTop: 1 }} />
              <span>
                {typo(
                  "Source : comptes annuels déposés au registre (BODACC). Le total du bilan et le chiffre d’affaires sont deux notions distinctes : le premier mesure la taille comptable, le second l’activité. Aucune estimation n’est produite ici.",
                )}
              </span>
            </p>
          </div>
        </section>

        {/* ── Documents et publications officielles ─────────────────────
            Ajout au handoff : il n'a pas de section pour cela, et la demande
            est venue après. Elle se pose ici, juste après les finances, parce
            que le dépôt de comptes est ce qui les atteste. */}
        <section id="identite" className="rfe-bloc">
          <div className="rfe-bloc__t">
            <h2>{typo(`Identité de ${nom}`)}</h2>
            <p>
              {typo("Informations officielles permettant d’identifier précisément l’entreprise.")}
            </p>
          </div>
          <div className="rfe-bloc__c">

            {/* Une liste de définitions à lignes alternées plutôt que deux
                cartes côte à côte : l'identité se lit de haut en bas, une clé
                puis sa valeur, et le SIREN comme le SIRET se recopient d'un
                clic — neuf ou quatorze chiffres saisis à la main dans une
                saisine de médiateur désignent vite une autre société. */}
            <div className="rfe-def" style={{ marginTop: 20 }}>
              {lignesIdentite.map((l) => (
                <div key={l.k} className="rfe-def__l">
                  <span className="rfe-def__k">{typo(l.k)}</span>
                  <span className="rfe-def__v">
                    {l.pilule ? (
                      <span
                        className="rfe-pilule-verte"
                        style={active ? { fontSize: 13.5 } : { fontSize: 13.5, background: "#FDF6E9", color: "#8A5A12" }}
                      >
                        {l.v}
                      </span>
                    ) : (
                      l.v
                    )}
                  </span>
                  {l.copiable ? <BoutonCopier valeur={l.v} libelle={l.k.toLowerCase()} /> : null}
                </div>
              ))}
            </div>

            {boutique || mediateurDeclare ? (
              <div className="rfe-def" style={{ marginTop: 12 }}>
                {boutique ? (
                  <div className="rfe-def__l">
                    <span className="rfe-def__k">{typo("Site marchand")}</span>
                    <span className="rfe-def__v">
                      <Link href={`/boutiques/${boutique.slug}`}>{boutique.domaine}</Link>
                    </span>
                  </div>
                ) : null}
                {mediateurDeclare ? (
                  <div className="rfe-def__l">
                    <span className="rfe-def__k">{typo("Médiateur déclaré")}</span>
                    <span className="rfe-def__v">{mediateurDeclare.nom}</span>
                  </div>
                ) : null}
              </div>
            ) : null}

            <p className="rfe-aide" style={{ marginTop: 16 }}>
              {typo(
                "Données issues du répertoire Sirene (Insee), du Registre national des entreprises (INPI) et du BODACC (DILA), réutilisées telles que publiées.",
              )}{" "}
              <Link href={`/entreprises/${base.slug}/signaler-une-erreur`}>{typo("Signaler une erreur")}</Link>
            </p>

            {/* Le maillage de l'annuaire : secteur, département, commune. */}
            <p className="rfe-second" style={{ marginTop: 14 }}>
              {typo("Voir aussi :")}{" "}
              <Link href={cheminSecteur(secteur)}>{libelleSecteur(secteur)}</Link>
              {lienDepartement ? (
                <>
                  {" · "}
                  <Link href={lienDepartement}>{nomDepartement(entreprise.departement!)}</Link>
                </>
              ) : null}
              {lienCommune ? (
                <>
                  {" · "}
                  <Link href={lienCommune}>{commune ? communeEnTitre(commune) : entreprise.communeSlug}</Link>
                </>
              ) : null}
            </p>
          </div>
        </section>

        {/* ── FAQ — l'onglet du handoff n'avait pas de section ───────── */}
        {publications.length > 0 ? (
          <section id="documents" className="rfe-bloc">
          <div className="rfe-bloc__t">
            <h2>{typo(`Documents et publications officielles de ${nom}`)}</h2>
            <p>
                {typo(
                  `${formatNombre(totalPublications)} annonce${totalPublications > 1 ? "s" : ""} publiée${totalPublications > 1 ? "s" : ""} au Bulletin officiel des annonces civiles et commerciales. Chaque annonce renvoie à sa page officielle, qui seule fait foi.`,
                )}
              </p>
          </div>
          <div className="rfe-bloc__c">

              {/* Deux panneaux dépliables, ouverts au départ : la liste des
                  dépôts est le contenu de la section, pas un détail qu'on
                  révèle. Le repli sert à ranger une fois lu. */}
              <div className="rfe-panneaux" style={{ marginTop: 20 }}>
                {publications.map((f) => {
                  const visibles = f.lignes.slice(0, 3);
                  const reste = f.lignes.length - visibles.length;
                  return (
                    <Panneau
                      key={f.cle}
                      titre={f.titre}
                      compte={`${formatNombre(f.lignes.length)} annonce${f.lignes.length > 1 ? "s" : ""}`}
                    >
                      {visibles.map((e) => (
                        <div
                          key={e.id}
                          className={`rfe-panneau__l${e.procedureCollective ? " rfe-pub__l--collective" : ""}`}
                        >
                          <span className="rfe-panneau__date">{formatDateLongue(e.date)}</span>
                          {e.detail ? <span className="rfe-panneau__d">{typo(e.detail)}</span> : null}
                          {e.urlSource ? (
                            <a
                              href={e.urlSource}
                              className="rfe-panneau__lien"
                              target="_blank"
                              rel="noopener nofollow"
                            >
                              {typo("Voir l’annonce")}
                              <Fleche taille={14} />
                            </a>
                          ) : null}
                        </div>
                      ))}
                      {reste > 0 ? (
                        <div className="rfe-panneau__pied">
                          <span className="rfe-aide">
                            {typo(
                              `${formatNombre(reste)} annonce${reste > 1 ? "s" : ""} plus ancienne${reste > 1 ? "s" : ""} non affichée${reste > 1 ? "s" : ""}.`,
                            )}
                          </span>
                        </div>
                      ) : null}
                    </Panneau>
                  );
                })}
              </div>

              {/* Ce que la section ne peut pas montrer, et pourquoi. Le taire
                  laisserait croire que l'absence de pièce vaut absence de
                  dépôt, alors qu'elle tient à un régime de confidentialité
                  ouvert aux petites sociétés. */}
              <p className="rfe-aide" style={{ marginTop: 16, maxWidth: "84ch", display: "flex", gap: 9, alignItems: "flex-start" }}>
                <Info taille={16} style={{ flex: "none", color: "var(--p-desactive)", marginTop: 1 }} />
                <span>
                  {typo(
                    "Les pièces elles-mêmes — comptes annuels, statuts, procès-verbaux — sont conservées au Registre national des entreprises (INPI). Une société peut demander que ses comptes restent confidentiels : ils sont alors déposés sans être communicables, et l’annonce du dépôt subsiste seule.",
                  )}
                </span>
              </p>
            </div>
          </section>
        ) : null}

        {/* ── Décisions de justice ───────────────────────────────────────
            Le titre dit « citant », jamais « condamnée ». Une décision peut
            ordonner une expertise, statuer sur un incident, débouter le
            demandeur : la solution est reprise telle que le juge l'a rendue,
            et le texte n'est pas recopié — il est lié à sa source, qui fait
            foi. */}
        {decisions.length > 0 ? (
          <section id="justice" className="rfe-bloc">
          <div className="rfe-bloc__t">
            <h2>{typo(`Décisions de justice citant ${nom}`)}</h2>
            <p>
                {typo(
                  `${formatNombre(decisions.length)} décision${decisions.length > 1 ? "s" : ""} publiée${decisions.length > 1 ? "s" : ""} en données ouvertes par la Cour de cassation, où cette société figure parmi les parties. Le rapprochement se fait sur la dénomination et la forme juridique : en cas de doute, la décision n’est pas rattachée.`,
                )}
              </p>
          </div>
          <div className="rfe-bloc__c">

              <div className="rfe-decisions" style={{ marginTop: 20 }}>
                {decisions.map((d) => (
                  <article key={d.id} className="rfe-decision">
                    <span className="rfe-decision__jur">{typo(d.juridiction)}</span>
                    <span className="rfe-decision__date">{formatDateLongue(d.date)}</span>
                    {d.numero ? <span className="rfe-decision__num">{typo(`n° ${d.numero}`)}</span> : null}
                    <span className="rfe-decision__role">
                      {d.role === "demandeur"
                        ? "Partie demanderesse"
                        : d.role === "defendeur"
                          ? "Partie défenderesse"
                          : "Partie à l’instance"}
                    </span>
                    <a
                      href={`https://www.courdecassation.fr/decision/${d.judilibreId}`}
                      className="rfe-decision__lien"
                      target="_blank"
                      rel="noopener nofollow"
                    >
                      {typo("Lire la décision")}
                      <Fleche taille={15} />
                    </a>
                    {d.solution ? (
                      <span className="rfe-decision__sol">
                        <strong style={{ color: "var(--p-navy)", fontWeight: 600 }}>{typo("Dispositif :")}</strong>{" "}
                        {typo(d.solution)}
                      </span>
                    ) : null}
                  </article>
                ))}
              </div>

              <p className="rfe-aide" style={{ marginTop: 16, maxWidth: "86ch", display: "flex", gap: 9, alignItems: "flex-start" }}>
                <Info taille={16} style={{ flex: "none", color: "var(--p-desactive)", marginTop: 1 }} />
                <span>
                  {typo(
                    "Figurer comme partie à une instance ne signifie ni avoir tort, ni avoir été condamné : une décision peut ordonner une expertise, trancher un incident de procédure ou débouter celui qui l’a engagée. Le dispositif est repris tel que le juge l’a rendu. Une décision peut par ailleurs être frappée d’appel ou cassée depuis sa publication.",
                  )}
                </span>
              </p>
            </div>
          </section>
        ) : null}

        {/* ── 9. Plan d'action ──────────────────────────────────────── */}
        <section id="plan" className="rfe-bloc">
          <div className="rfe-bloc__t">
            <h2>{typo(`Litige avec ${nom} : le plan d’action`)}</h2>
            <p>
              {typo(
                "Ces démarches sont gratuites et s’effectuent dans cet ordre. Chacune conditionne la suivante : une médiation saisie sans réclamation écrite préalable est déclarée irrecevable.",
              )}
            </p>
          </div>
          <div className="rfe-bloc__c">

            <div className="rfe-plan" style={{ marginTop: 20 }}>
              {etapes.map((e, i) => (
                <div key={e.cle} className="rfe-carte">
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span className="rfe-plan__n">{i + 1}</span>
                    <span className="rfe-titre-carte">{typo(e.titre)}</span>
                  </div>
                  <p className="rfe-second" style={{ marginTop: 12 }}>
                    {typo(e.sous)}
                  </p>
                </div>
              ))}
            </div>

            {/* Aucun délai universel : il dépend du contrat, du produit et du
                médiateur compétent, et « quatorze jours » lu hors contexte
                fait renoncer un consommateur qui n'est pas hors délai. */}
            <p className="rfe-aide" style={{ marginTop: 16, maxWidth: "80ch" }}>
              {typo(
                "Les délais applicables dépendent de votre contrat, du produit et du médiateur compétent. Ils sont précisés une fois votre situation connue. Ces informations générales ne constituent pas un conseil juridique personnalisé.",
              )}
            </p>

            <p className="rfe-second" style={{ marginTop: 14 }}>
              Guides détaillés :{" "}
              {GUIDES.slice(0, 5).map((g, i) => (
                <span key={g.href}>
                  {i > 0 ? " · " : ""}
                  <Link href={g.href}>{g.libelle}</Link>
                </span>
              ))}
            </p>
          </div>
        </section>

        {/* ── 10. Coordonnées et informations légales ───────────────── */}
        <section id="faq" className="rfe-bloc">
          <div className="rfe-bloc__t">
            <h2>{typo(`Questions fréquentes sur ${nom} et sur Recours France`)}</h2>
            
          </div>
          <div className="rfe-bloc__c"><div style={{ display: "grid", gap: 12, marginTop: 20, maxWidth: "82ch" }}>
              {questions.map((q) => (
                <details key={q.cle} className="rfe-carte">
                  <summary
                    className="rfe-titre-carte"
                    style={{ cursor: "pointer", listStyle: "none", minHeight: 28, display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <Chevron taille={18} style={{ flex: "none", color: "var(--p-bleu)" }} />
                    {typo(q.q)}
                  </summary>
                  <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                    {q.r.map((p, i) => (
                      <p key={i} className="rfe-texte">
                        {typo(p)}
                      </p>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── 12. CTA final ─────────────────────────────────────────── */}
        <div className="rfe-conteneur" style={{ paddingBottom: "clamp(30px, 3.2cqw, 50px)" }}>
          <div className="rfe-final">
            <h2 className="rfe-h2">{typo(`Un problème avec ${nom} ?`)}</h2>
            <p className="rfe-second" style={{ marginTop: 10 }}>
              {typo("Publication gratuite · 3 minutes · vous gardez le contrôle")}
            </p>
            <Link href={tunnel} className="rfe-btn" style={{ marginTop: 18 }}>
              {typo("Rendre mon litige visible")}
            </Link>
          </div>
        </div>
  
        {/* ── Entreprises du même secteur ────────────────────────────────
            Cette section n'existe que pour le maillage interne : c'est la
            densité de liens fiche→fiche qui fait explorer un annuaire de
            treize millions de pages, pas le plan de site. Elle n'apprend rien
            au visiteur — d'où une liste de liens sobres en fin de page plutôt
            que des cartes, qui pesaient plus lourd que les signalements.

            Tous les voisins sont listés, pas quatre : chaque lien retiré est
            un chemin d'exploration en moins. */}
        {comparables.length > 0 ? (
          <section className="rfe-voisines">
            <h2>{typo("Entreprises du même secteur")}</h2>
            <p>
              {typo(
                "Rapprochement par activité et par département. Ce n’est ni un classement, ni une comparaison de qualité.",
              )}
            </p>
            <ul>
              {comparables.map((c) => (
                <li key={c.slug}>
                  <Link href={`/entreprises/${c.slug}`}>
                    {c.denomination}
                    {c.commune ? <span> · {communeEnTitre(c.commune)}</span> : null}
                    {c.signalements > 0 ? (
                      <span>
                        {" · "}
                        {formatNombre(c.signalements)} signalement{c.signalements > 1 ? "s" : ""}
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
            {lienSecteur ? (
              <p style={{ marginTop: 12 }}>
                <Link href={lienSecteur} className="rfe-lien-fleche">
                  {typo("Voir toutes les entreprises similaires")}
                  <Fleche taille={14} />
                </Link>
              </p>
            ) : null}
          </section>
        ) : null}
      </div>
      </main>

      {/* ── 13. Pied de page ────────────────────────────────────────── */}
      <footer className="rfe-pied">
        <div className="rfe-conteneur">
          <div className="rfe-pied__cols">
            <div className="rfe-pied__marque">
              <span className="rfe-logo">
                <span className="rfe-logo__med">
                  <Presse taille={22} />
                </span>
                <span className="rfe-logo__filet" aria-hidden="true" />
                <span>
                  <span className="rfe-logo__nom" style={{ display: "block" }}>
                    Recours France
                  </span>
                  <span className="rfe-logo__base">Observatoire des problèmes consommateurs</span>
                </span>
              </span>
              {/* Le handoff l'impose : distinguer l'éditeur de la plateforme de
                  l'entreprise faisant l'objet de la fiche. Sur treize millions
                  de fiches, la confusion se produira tôt ou tard. */}
              <p className="rfe-distinguo">
                {typo(
                  `Cette fiche porte sur ${nom}, société tierce sans lien avec l’éditeur de la plateforme.`,
                )}
                <br />
                {typo(
                  `Recours France est édité par ${EDITEUR.raisonSociale}${EDITEUR.siren ? `, SIREN ${EDITEUR.siren}` : ""}${siegeSocial() ? ` — ${siegeSocial()}` : ""}.`,
                )}
              </p>
            </div>

            <div>
              <div className="rfe-pied__t">Plateforme</div>
              <div className="rfe-pied__liens">
                <Link href="/methodologie">{typo("Comment ça marche")}</Link>
                <Link href="/annuaire">Annuaire des entreprises</Link>
                <Link href="/boutiques">Boutiques en ligne</Link>
                <Link href="/a-propos">{typo("À propos et indépendance")}</Link>
              </div>
            </div>

            <div>
              <div className="rfe-pied__t">Ressources</div>
              <div className="rfe-pied__liens">
                <Link href="/aide">Guides et démarches</Link>
                <Link href="/charte-de-moderation">{typo("Règles de publication")}</Link>
                <Link href="/mon-espace">Retrouver mon signalement</Link>
                <Link href="/demarches-officielles">{typo("Démarches officielles")}</Link>
              </div>
            </div>
          </div>

          <div className="rfe-pied__barre">
            <span>{typo("© 2026 Recours France · Plateforme privée et indépendante")}</span>
            <nav>
              <Link href="/mentions-legales">{typo("Mentions légales")}</Link>
              <Link href="/donnees-personnelles">{typo("Confidentialité")}</Link>
              <Link href="/contact">Contact</Link>
            </nav>
          </div>
        </div>
      </footer>

      {/* Barre d'action, écrans étroits */}
      <div className="rfe-barre">
        <Link href={tunnel} className="rfe-btn">
          {typo("Rendre mon litige visible")}
        </Link>
      </div>
    </div>
  );
}
