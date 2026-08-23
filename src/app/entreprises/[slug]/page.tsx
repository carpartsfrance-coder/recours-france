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
import { typo } from "@/lib/typographie";
import { EDITEUR, siegeSocial } from "@/lib/editeur";
import {
  Alerte, Bouclier, Branchement, Bulle, Camembert, Carte, CercleCoche,
  Chevron, Cloche, Colis, Document, Epingle, Fleche, Graphique, Groupe,
  Horloge, Immeuble, Info, Oeil, Presse, Question, Remboursement,
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

  const { entreprise, comptes, evenements } = await detailEntreprise(base.id);
  if (!entreprise) notFound();

  const nom = entreprise.denomination;

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
  const dernierPublic = comptes.find((c) => !c.confidentiel && (c.chiffreAffaires || c.resultatNet)) ?? null;
  const anneeCourante = new Date().getFullYear();
  const donneesAnciennes = dernierPublic !== null && anneeCourante - dernierPublic.exercice >= 3;

  const valeurFinance = (champ: "chiffreAffaires" | "resultatNet") => {
    if (!dernier) return { n: "Non déposé", l: "Aucun compte annuel au registre", absent: true };
    if (dernier.confidentiel) return { n: "Non publié", l: "Comptes confidentiels", absent: true };
    const v = dernier[champ];
    if (!v) return { n: "Non publié", l: `Exercice ${dernier.exercice}, poste non détaillé`, absent: true };
    return { n: formatMontant(Number(v)), l: `Exercice ${dernier.exercice}`, absent: false };
  };
  const ca = valeurFinance("chiffreAffaires");
  const rn = valeurFinance("resultatNet");

  const lignesLegales = [
    { k: "Raison sociale", v: nom },
    { k: "SIREN", v: formatSiren(entreprise.siren) },
    entreprise.siretSiege ? { k: "SIRET du siège", v: formatSiret(entreprise.siretSiege) } : null,
    entreprise.formeJuridique ? { k: "Forme juridique", v: entreprise.formeJuridique } : null,
    entreprise.dateImmatriculation
      ? { k: "Immatriculation", v: formatDateLongue(entreprise.dateImmatriculation) }
      : null,
    entreprise.naf ? { k: "Code d’activité", v: entreprise.naf } : null,
    {
      k: "État administratif",
      v: entreprise.etatAdministratif === "ACTIVE" ? "En activité" : "Cessée",
    },
  ].filter((l): l is { k: string; v: string } => l !== null);

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
    { href: "#signalements", libelle: total > 0 ? `Signalements (${formatNombre(total)})` : "Signalements", icone: "liste" as const },
    { href: "#types", libelle: "Types de litiges", icone: "etiquette" as const },
    { href: "#finances", libelle: "Finances", icone: "graphique" as const },
    ...(totalPublications > 0
      ? [{ href: "#documents", libelle: "Documents officiels", icone: "document" as const }]
      : []),
    { href: "#plan", libelle: "Plan d’action", icone: "coche" as const },
    { href: "#coordonnees", libelle: "Coordonnées", icone: "epingle" as const },
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

      {/* ── 1. Bandeau d'indépendance ───────────────────────────────── */}
      <div className="rfp-bandeau" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
        <Info taille={15} />
        {typo("Plateforme privée et indépendante d’aide aux litiges de consommation — sans lien avec l’État.")}
      </div>

      {/* ── 2. En-tête ──────────────────────────────────────────────── */}
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

      <main id="contenu">
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
              <h1 className="rfe-h1">{typo(`${nom} : litiges et signalements publics`)}</h1>

              <p className="rfe-intro" style={{ marginTop: 14 }}>
                {typo(
                  `Vous recherchez des avis sur ${nom} ? Recours France ne publie pas de notes commerciales : consultez les situations déclarées, leur statut et les solutions demandées.`,
                )}
              </p>

              <div className="rfe-identite" style={{ marginTop: 16 }}>
                <span>
                  <Immeuble taille={18} />
                  <strong style={{ fontWeight: 700, color: "var(--p-navy)" }}>{nom}</strong>
                </span>
                <span>{typo(`SIREN ${formatSiren(entreprise.siren)}`)}</span>
                {commune ? (
                  <span>
                    <Epingle taille={18} />
                    {communeEnTitre(commune)}
                  </span>
                ) : null}
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 20 }}>
                <Link href={tunnel} className="rfe-btn">
                  {typo("Rendre mon litige visible")}
                </Link>
                {total > 0 ? (
                  <a href="#signalements" className="rfe-btn rfe-btn--2">
                    {typo(
                      total > 1
                        ? `Voir les ${formatNombre(total)} signalements publics`
                        : "Voir le signalement public (1)",
                    )}
                  </a>
                ) : null}
              </div>

              <div className="rfe-mentions" style={{ marginTop: 18 }}>
                <span>
                  <Remboursement taille={16} />
                  {typo("Publication gratuite")}
                </span>
                <span>
                  <Horloge taille={16} />3 minutes
                </span>
                <span>
                  <Bouclier taille={16} />
                  {typo("Vous gardez le contrôle")}
                </span>
              </div>
            </div>

            <div className="rfe-hero__d">
              <div className="rfe-obtenu">
                {[
                  { i: Oeil, t: "Votre litige devient visible", d: "Votre situation est consultable publiquement." },
                  { i: Cloche, t: "L’entreprise peut être alertée", d: "Après vérification de vos coordonnées." },
                  { i: Document, t: "Votre réclamation est préparée", d: "Des modèles et conseils adaptés." },
                  { i: Branchement, t: "Vos prochaines étapes sont expliquées", d: "Relance, médiation ou recours adapté." },
                ].map((l) => {
                  const Icone = l.i;
                  return (
                    <div key={l.t} className="rfe-obtenu__l">
                      <Icone taille={20} />
                      <div>
                        <div className="rfe-obtenu__t">{typo(l.t)}</div>
                        <div className="rfe-obtenu__d">{typo(l.d)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ── 5. Onglets ────────────────────────────────────────────── */}
        <Onglets liens={onglets} />

        {/* ── 6. Signalements publics ───────────────────────────────── */}
        <section id="signalements" className="rfe-section">
          <div className="rfe-conteneur">
            <h2 className="rfe-h2">{typo(`Signalements publics concernant ${nom}`)}</h2>

            {total === 0 ? (
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
        <section id="types" className="rfe-section rfe-section--alt">
          <div className="rfe-conteneur">
            <h2 className="rfe-h2">{typo("Quel problème rencontrez-vous ?")}</h2>
            <p className="rfe-second" style={{ marginTop: 10, maxWidth: "64ch" }}>
              {typo(
                "Choisissez la situation la plus proche de la vôtre : la réclamation et les démarches sont adaptées à votre choix.",
              )}
            </p>

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
        <section id="finances" className="rfe-section">
          <div className="rfe-conteneur">
            <h2 className="rfe-h2">{typo(`Informations financières de ${nom}`)}</h2>

            <div className="rfe-finances" style={{ marginTop: 20 }}>
              <div className="rfe-carte">
                <div className="rfe-finance__k">
                  <Graphique taille={18} />
                  {typo(dernier ? `Chiffre d’affaires ${dernier.exercice}` : "Chiffre d’affaires")}
                </div>
                <div className="rfe-finance__v">
                  <div className={`rfe-finance__n${ca.absent ? " rfe-finance__n--absent" : ""}`}>{ca.n}</div>
                  <div className="rfe-finance__l">{typo(ca.l)}</div>
                </div>
              </div>

              <div className="rfe-carte">
                <div className="rfe-finance__k">
                  <Camembert taille={18} />
                  {typo(dernier ? `Résultat net ${dernier.exercice}` : "Résultat net")}
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

            {dernierPublic ? (
              <div className="rfe-carte rfe-anciennes" style={{ marginTop: 16 }}>
                <div>
                  <div className="rfe-finance__k">{typo("Dernier chiffre d’affaires public")}</div>
                  <div className="rfe-finance__n" style={{ marginTop: 8, fontSize: 23 }}>
                    {dernierPublic.chiffreAffaires ? formatMontant(Number(dernierPublic.chiffreAffaires)) : "Non publié"}
                  </div>
                  <div className="rfe-finance__l">{typo(`Exercice ${dernierPublic.exercice}`)}</div>
                </div>
                <div>
                  <div className="rfe-finance__k">{typo("Dernier résultat net public")}</div>
                  <div className="rfe-finance__n" style={{ marginTop: 8, fontSize: 23 }}>
                    {dernierPublic.resultatNet ? formatMontant(Number(dernierPublic.resultatNet)) : "Non publié"}
                  </div>
                  <div className="rfe-finance__l">{typo(`Exercice ${dernierPublic.exercice}`)}</div>
                </div>
                {donneesAnciennes ? (
                  <div>
                    <span className="rfe-chip-ambre">
                      <Alerte taille={13} />
                      {typo("Données anciennes")}
                    </span>
                    <p className="rfe-finance__l" style={{ marginTop: 8 }}>
                      {typo("À ne pas confondre avec la situation actuelle.")}
                    </p>
                  </div>
                ) : null}
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
        {publications.length > 0 ? (
          <section id="documents" className="rfe-section rfe-section--alt">
            <div className="rfe-conteneur">
              <h2 className="rfe-h2">{typo(`Documents et publications officielles de ${nom}`)}</h2>
              <p className="rfe-second" style={{ marginTop: 10, maxWidth: "68ch" }}>
                {typo(
                  `${formatNombre(totalPublications)} annonce${totalPublications > 1 ? "s" : ""} publiée${totalPublications > 1 ? "s" : ""} au Bulletin officiel des annonces civiles et commerciales. Chaque annonce renvoie à sa page officielle, qui seule fait foi.`,
                )}
              </p>

              <div className="rfe-publications" style={{ marginTop: 20 }}>
                {publications.map((f) => {
                  const visibles = f.lignes.slice(0, 8);
                  const reste = f.lignes.length - visibles.length;
                  return (
                    <div key={f.cle} className="rfe-pub__groupe">
                      <div className="rfe-pub__tete">
                        <span className="rfe-pub__med">
                          {f.cle === "comptes" ? (
                            <Document taille={19} />
                          ) : f.cle === "procedures" ? (
                            <Alerte taille={19} />
                          ) : (
                            <Immeuble taille={19} />
                          )}
                        </span>
                        <span className="rfe-titre-carte">{typo(f.titre)}</span>
                        <span className="rfe-pub__n">
                          {formatNombre(f.lignes.length)} annonce{f.lignes.length > 1 ? "s" : ""}
                        </span>
                      </div>
                      <p className="rfe-pub__expl">{typo(f.explication)}</p>

                      {visibles.map((e) => (
                        <div
                          key={e.id}
                          className={`rfe-pub__l${e.procedureCollective ? " rfe-pub__l--collective" : ""}`}
                        >
                          <span className="rfe-pub__date">{formatDateLongue(e.date)}</span>
                          <span className="rfe-pub__t">{typo(e.titre)}</span>
                          {e.detail ? <span className="rfe-pub__d">{typo(e.detail)}</span> : null}
                          {e.urlSource ? (
                            <a
                              href={e.urlSource}
                              className="rfe-pub__lien"
                              target="_blank"
                              rel="noopener nofollow"
                            >
                              {typo("Voir l’annonce")}
                              <Fleche taille={15} />
                            </a>
                          ) : null}
                        </div>
                      ))}

                      {reste > 0 ? (
                        <p className="rfe-pub__plus">
                          {typo(`${formatNombre(reste)} annonce${reste > 1 ? "s" : ""} plus ancienne${reste > 1 ? "s" : ""} non affichée${reste > 1 ? "s" : ""}.`)}
                        </p>
                      ) : null}
                    </div>
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

        {/* ── 9. Plan d'action ──────────────────────────────────────── */}
        <section id="plan" className="rfe-section rfe-section--alt">
          <div className="rfe-conteneur">
            <h2 className="rfe-h2">{typo(`Litige avec ${nom} : le plan d’action`)}</h2>
            <p className="rfe-second" style={{ marginTop: 10, maxWidth: "64ch" }}>
              {typo(
                "Ces démarches sont gratuites et s’effectuent dans cet ordre. Chacune conditionne la suivante : une médiation saisie sans réclamation écrite préalable est déclarée irrecevable.",
              )}
            </p>

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
        <section id="coordonnees" className="rfe-section">
          <div className="rfe-conteneur">
            <h2 className="rfe-h2">{typo(`Coordonnées et informations légales de ${nom}`)}</h2>

            <div className="rfe-cols" style={{ marginTop: 20 }}>
              <div className="rfe-carte">
                <div className="rfe-titre-carte" style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <Epingle taille={18} style={{ color: "var(--p-bleu)" }} />
                  {typo("Siège social")}
                </div>
                <div style={{ marginTop: 12 }}>
                  <div className="rfe-ligne">
                    <span className="rfe-ligne__k">Adresse</span>
                    <span className="rfe-ligne__v">{adresse || "Non renseignée"}</span>
                    {adresse ? <BoutonCopier valeur={adresse} libelle="l’adresse" /> : null}
                  </div>
                  {commune ? (
                    <div className="rfe-ligne">
                      <span className="rfe-ligne__k">Commune</span>
                      <span className="rfe-ligne__v">{communeEnTitre(commune)}</span>
                    </div>
                  ) : null}
                  {boutique ? (
                    <div className="rfe-ligne">
                      <span className="rfe-ligne__k">Site marchand</span>
                      <span className="rfe-ligne__v">
                        <Link href={`/boutiques/${boutique.slug}`}>{boutique.domaine}</Link>
                      </span>
                    </div>
                  ) : null}
                  {mediateurDeclare ? (
                    <div className="rfe-ligne">
                      <span className="rfe-ligne__k">{typo("Médiateur déclaré")}</span>
                      <span className="rfe-ligne__v">{mediateurDeclare.nom}</span>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="rfe-carte">
                <div className="rfe-titre-carte" style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <Immeuble taille={18} style={{ color: "var(--p-bleu)" }} />
                  {typo("Informations du registre")}
                </div>
                <div style={{ marginTop: 12 }}>
                  {lignesLegales.map((l) => (
                    <div key={l.k} className="rfe-ligne">
                      <span className="rfe-ligne__k">{typo(l.k)}</span>
                      <span className="rfe-ligne__v">{l.v}</span>
                      <BoutonCopier valeur={l.v} libelle={l.k.toLowerCase()} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

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

        {/* ── 11. Entreprises comparables ───────────────────────────── */}
        {comparables.length > 0 ? (
          <section className="rfe-section rfe-section--alt">
            <div className="rfe-conteneur">
              <h2 className="rfe-h2">{typo("Entreprises du même secteur")}</h2>
              <p className="rfe-second" style={{ marginTop: 10, maxWidth: "68ch" }}>
                {typo(
                  "Rapprochement par activité et par département, à partir des registres publics. Ce n’est ni un classement, ni une comparaison de qualité, ni une recommandation.",
                )}
              </p>
              <div className="rfe-comparables" style={{ marginTop: 18 }}>
                {comparables.map((c) => (
                  <Link key={c.slug} href={`/entreprises/${c.slug}`} className="rfe-comparable">
                    <span className="rfe-comparable__n">{c.denomination}</span>
                    <span className="rfe-comparable__d">
                      {[c.commune ? communeEnTitre(c.commune) : null, `${formatNombre(c.signalements)} signalement${c.signalements > 1 ? "s" : ""}`]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {/* ── FAQ — l'onglet du handoff n'avait pas de section ───────── */}
        <section id="faq" className="rfe-section">
          <div className="rfe-conteneur">
            <h2 className="rfe-h2">{typo(`Questions fréquentes sur ${nom} et sur Recours France`)}</h2>
            <div style={{ display: "grid", gap: 12, marginTop: 20, maxWidth: "82ch" }}>
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
