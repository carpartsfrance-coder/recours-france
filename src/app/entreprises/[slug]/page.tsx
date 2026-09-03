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
import { Logo } from "@/components/logo";
import { Sommaire } from "@/components/fiche-entreprise/sommaire";
import { EnteteSite } from "@/components/entete-site";
import { Question } from "@/components/fiche-entreprise/question";
import { BoutonCopier } from "@/components/fiche-entreprise/copier";
import { Panneau } from "@/components/fiche-entreprise/panneau";
import { typo } from "@/lib/typographie";
import { EDITEUR, siegeSocial } from "@/lib/editeur";
import {
  Alerte, Bouclier, Bulle, Carte, Coche, Colis, Document, Fleche, Info,
  Loupe, Question as IconeQuestion, Remboursement,
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

/**
 * Sans cette fonction, `revalidate` ne sert à rien.
 *
 * Un segment dynamique dépourvu de `generateStaticParams` est rendu à chaque
 * requête, et la durée de cache déclarée au-dessus est ignorée. La compilation
 * le disait — « ƒ /entreprises/[slug] », rendu à la demande, quand une page en
 * cache s'affiche « ○ » — et la production le confirmait : `cache-control:
 * no-store` sur les fiches, `s-maxage=31536000` et `x-nextjs-cache: HIT` sur
 * les guides.
 *
 * Chaque visite refaisait donc les huit requêtes du rendu. Un robot qui
 * explore cinquante mille fiches les payait cinquante mille fois, et sous
 * cette charge les fiches des zones denses dépassaient les douze secondes que
 * la base s'accorde : elles répondaient 500.
 *
 * La liste est vide à dessein. Treize millions de fiches ne se pré-rendent pas
 * à la compilation ; avec `dynamicParams` — vrai par défaut — Next les génère
 * à la première demande puis les sert du cache pendant une journée. Le coût
 * d'une fiche est payé une fois par jour au lieu d'une fois par visite.
 */
export async function generateStaticParams() {
  return [];
}

const ICONES_PROBLEME = {
  alerte: Alerte, colis: Colis, remboursement: Remboursement,
  bouclier: Bouclier, document: Document, question: IconeQuestion,
  carte: Carte, bulle: Bulle,
};

/**
 * Soixante caractères : au-delà, Google coupe le titre.
 *
 * Le gabarit précédent écrivait « {nom} ({commune}) : avis, litiges et
 * signalements publics » — soixante-deux caractères pour MRM AUTO, quatre-vingt-
 * cinq pour CARAVANING DU MARAIS. La fin, c'est-à-dire ce que la page contient,
 * n'était jamais affichée : le visiteur lisait « avis, litiges et signaleme… ».
 */
const LIMITE_TITRE = 60;

/**
 * Le titre reprend la formulation de la requête.
 *
 * Mesuré sur trois jours de Search Console : trois cent dix requêtes sur sept
 * cent six contiennent « avis », et cinquante-quatre pour cent d'entre elles
 * s'écrivent « avis sur {entreprise} » plutôt que « {entreprise} avis ».
 * Google met en gras les mots de la requête dans le titre ; commencer par
 * « Avis sur {nom} » fait correspondre la phrase entière, pas seulement un mot.
 *
 * La commune n'est ajoutée que si elle tient dans le budget. Elle désambiguïse
 * les homonymes — il y en a beaucoup sur treize millions de sociétés — mais
 * elle ne vaut pas de faire tomber la fin du titre.
 */
function titreFiche(nom: string, commune: string | null): string {
  const sans = `Avis sur ${nom} : litiges et signalements`;
  if (!commune) return sans;
  const avec = `Avis sur ${nom} (${communeEnTitre(commune)}) : litiges et signalements`;
  return avec.length <= LIMITE_TITRE ? avec : sans;
}

/**
 * Cent cinquante-cinq caractères : au-delà, Google coupe la description.
 *
 * La description dit ce que la page contient vraiment.
 *
 * L'ancienne promettait des signalements à toutes les fiches ; six sur treize
 * millions en portent. Elle est donc conditionnelle, et met en avant ce que
 * nous avons et que les annuaires concurrents n'affichent pas : la date à
 * laquelle la fiche a été vérifiée.
 */
function descriptionFiche(nom: string, total: number, verifieeLe: Date): string {
  const verifiee = `Fiche vérifiée le ${formatDateLongue(verifieeLe)}`;
  if (total === 0) {
    return `${verifiee} : identité au registre, comptes déposés et publications officielles. Aucun signalement de consommateur à ce jour.`;
  }
  const pluriel = total > 1 ? "s" : "";
  return `${total} signalement${pluriel} publié${pluriel} sur ${nom}, avec leur statut. ${verifiee} : identité au registre et publications officielles.`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const base = await chargerEntreprise(slug);
  if (!base) return { title: "Entreprise" };

  const total = await prisma.signalement.count({
    where: { entrepriseId: base.id, moderation: "PUBLIE" },
  });

  return {
    ...(ficheIndexable(base) ? {} : { robots: { index: false, follow: true } }),
    title: typo(titreFiche(base.denomination, base.commune)),
    description: typo(descriptionFiche(base.denomination, total, base.majLe)),
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

  /**
   * Le sommaire, numéroté de 01 à 09.
   *
   * Les entrées dont la section n'existe pas sont retirées, et la
   * numérotation se recalcule : afficher « 07 » quand il n'y a que six
   * sections trahirait le registre — un rapport officiel ne saute pas de
   * numéro.
   */
  const sections = [
    { id: "s01", libelle: "Synthèse" },
    { id: "s02", libelle: "Signalements" },
    { id: "s03", libelle: "Signaler" },
    { id: "s04", libelle: "Finances" },
    { id: "s05", libelle: "Identité" },
    ...(totalPublications > 0 ? [{ id: "s06", libelle: "Documents" }] : []),
    ...(decisions.length > 0 ? [{ id: "s07", libelle: "Justice" }] : []),
    { id: "s08", libelle: "Démarches" },
    { id: "s09", libelle: "Questions" },
  ].map((s, i) => ({ ...s, n: String(i + 1).padStart(2, "0"), href: `#${s.id}` }));
  const numero = (id: string) => sections.find((s) => s.id === id)?.n ?? "";

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

      {/* ── 1. Filet tricolore ──────────────────────────────────────────
          Trois segments égaux, jamais accompagnés d'un emblème ni d'une
          devise : le registre est celui d'un rapport, pas d'un document de
          l'État. */}
      <div className="rfe-tricolore" aria-hidden="true">
        <i style={{ background: "var(--e-navy)" }} />
        <i style={{ background: "var(--e-bleu)" }} />
        <i style={{ background: "var(--e-rouge)" }} />
      </div>

      {/* ── 2. En-tête collant ──────────────────────────────────────────
          C'est désormais l'en-tête du site entier, sorti d'ici pour être posé
          sur toutes les pages. Le bouton vise le parcours de dépôt de cette
          entreprise-ci, pas le point d'entrée générique.

          Le bandeau d'indépendance qui l'ouvrait a été retiré sur demande.
          Les deux mentions du pied de page restent, elles : elles nomment
          l'éditeur et le distinguent de la société dont la fiche parle. */}
      <EnteteSite cta={tunnel} />

      {/* ── 3. Fil d'Ariane ─────────────────────────────────────────────
          Séparé par une barre oblique, pas un chevron. */}
      <nav className="rfe-fil" aria-label="Fil d’Ariane">
        <div className="rfe-conteneur rfe-fil__piste rfe-scroll">
          {fil.map((f, i) => (
            <span key={f.libelle} style={{ display: "inline-flex", alignItems: "center", gap: 9 }}>
              {i > 0 ? <span aria-hidden="true">/</span> : null}
              {f.href ? <Link href={f.href}>{f.libelle}</Link> : <strong>{f.libelle}</strong>}
            </span>
          ))}
        </div>
      </nav>

      <main id="contenu">
        {/* ── 4. Hero ───────────────────────────────────────────────── */}
        <div className="rfe-conteneur rfe-hero">
          <div className="rfe-hero__g">
            <p className="rfe-surtitre">{typo("Fiche entreprise · Rapport public")}</p>

            {/* Le nom seul porte le poids typographique ; la formule qui sert
                la requête passe en sous-titre. C'est le geste central de cette
                version. */}
            <h1 className="rfe-h1" style={{ marginTop: 14 }}>
              {nom}
            </h1>
            <p className="rfe-h1__sous" style={{ marginTop: 10 }}>
              {typo("Avis, litiges et informations publiques")}
            </p>

            <div className="rfe-statut" style={{ marginTop: 16 }}>
              <span className={`rfe-badge${active ? "" : " rfe-badge--ambre"}`}>
                <span className="rfe-pastille" aria-hidden="true" />
                {typo(active ? "Entreprise active" : "Entreprise cessée")}
              </span>
              <span className="rfe-legende">
                {typo(`Fiche vérifiée le ${formatDateLongue(entreprise.majLe)}`)}
              </span>
            </div>

            <p className="rfe-chapo" style={{ marginTop: 20 }}>
              {typo(
                "Recours France ne publie pas de notes commerciales. Cette fiche présente les situations déclarées par des consommateurs et les informations officielles issues des registres publics.",
              )}
            </p>

            <div className="rfe-meta" style={{ marginTop: 22 }}>
              <div>
                <div className="rfe-meta__k">SIREN</div>
                <div className="rfe-meta__v">{formatSiren(entreprise.siren)}</div>
              </div>
              <div>
                <div className="rfe-meta__k">{typo("Forme juridique")}</div>
                <div className="rfe-meta__v">{entreprise.formeJuridique ?? "—"}</div>
              </div>
              <div>
                <div className="rfe-meta__k">Commune</div>
                <div className="rfe-meta__v">{commune ? communeEnTitre(commune) : "—"}</div>
              </div>
              <div>
                <div className="rfe-meta__k">{typo("Activité")}</div>
                <div className="rfe-meta__v">{entreprise.nafLibelle ?? "—"}</div>
              </div>
              <div>
                <div className="rfe-meta__k">{typo("Création")}</div>
                <div className="rfe-meta__v">
                  {entreprise.dateImmatriculation
                    ? new Date(entreprise.dateImmatriculation).getFullYear()
                    : "—"}
                </div>
              </div>
            </div>
          </div>

          <div className="rfe-hero__d">
            <div className="rfe-panneau-action">
              <div className="rfe-panneau-action__tete">
                <p className="rfe-surtitre rfe-surtitre--clair">{typo("Litige avec cette entreprise")}</p>
                <p className="rfe-panneau-action__titre">{typo("Vos démarches pour un litige")}</p>
              </div>
              <div className="rfe-panneau-action__corps">
                {/* Les démarches d'abord, la publication en dernier : c'est
                    l'accompagnement qui est proposé, la publication en est la
                    conséquence. */}
                {[
                  "Vos prochaines démarches vous sont présentées dans l’ordre.",
                  "Votre réclamation écrite est préparée à partir de votre récit.",
                  "Votre situation devient consultable publiquement sur cette fiche.",
                ].map((p) => (
                  <p key={p} className="rfe-promesse">
                    <Coche taille={16} />
                    <span>{typo(p)}</span>
                  </p>
                ))}

                <Link href={tunnel} className="rfe-btn rfe-btn--plein" style={{ marginTop: 18 }}>
                  {typo("Commencer mes démarches")}
                </Link>
                <p className="rfe-legende" style={{ marginTop: 10, textAlign: "center" }}>
                  {typo("Gratuit · 3 minutes · publication immédiate")}
                </p>
              </div>
              <div className="rfe-panneau-action__pied">
                <a href={total > 0 ? "#s02" : "#s08"} className="rfe-action">
                  {typo(
                    total > 1
                      ? `Consulter les ${formatNombre(total)} signalements`
                      : total === 1
                        ? "Consulter le signalement publié"
                        : "Consulter les démarches",
                  )}
                  <Fleche taille={14} />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* ── 5. Sommaire collant ───────────────────────────────────── */}
        <Sommaire entrees={sections} />

        <div className="rfe-conteneur">
          {/* ── s01 Synthèse ────────────────────────────────────────── */}
          <section id="s01" className="rfe-section">
            <div className="rfe-section__t">
              <div className="rfe-section__n">{numero("s01")}</div>
              <h2 className="rfe-h2">{typo("Synthèse")}</h2>
              <p>{typo(`Les principales informations disponibles sur ${nom}.`)}</p>
            </div>
            <div className="rfe-section__c">
              <div className="rfe-grille rfe-grille--synthese">
                <div className="rfe-cellule">
                  <div className="rfe-cellule__k">{typo("Signalements publics")}</div>
                  <div className="rfe-cellule__n">
                    {formatNombre(total)}
                    {enAttente > 0 ? (
                      <span className="rfe-etiquette">{typo(`${formatNombre(enAttente)} en attente`)}</span>
                    ) : null}
                  </div>
                  <div className="rfe-cellule__note">
                    {typo(total > 0 ? "Situations déclarées sur Recours France" : "Aucune situation déclarée à ce jour")}
                  </div>
                </div>
                <div className="rfe-cellule">
                  <div className="rfe-cellule__k">{typo("Litiges résolus")}</div>
                  <div className="rfe-cellule__n" style={{ color: "var(--e-vert)" }}>{formatNombre(resolus)}</div>
                  <div className="rfe-cellule__note">
                    {typo(resolus > 0 ? "Signalements indiqués comme résolus" : "Aucun signalement indiqué comme résolu")}
                  </div>
                </div>
                <div className="rfe-cellule">
                  <div className="rfe-cellule__k">{typo("État de l’entreprise")}</div>
                  <div
                    className="rfe-cellule__n"
                    style={{ color: active ? "var(--e-vert)" : "var(--e-ambre)" }}
                  >
                    {active ? "Active" : "Cessée"}
                  </div>
                  <div className="rfe-cellule__note">{typo("Donnée du répertoire Sirene")}</div>
                </div>
                <div className="rfe-cellule">
                  <div className="rfe-cellule__k">{typo("Comptes déposés")}</div>
                  <div className="rfe-cellule__n">{formatNombre(comptes.length)}</div>
                  <div className="rfe-cellule__note">
                    {typo(
                      comptes.length > 0
                        ? `Exercices ${comptes[comptes.length - 1].exercice} à ${comptes[0].exercice}`
                        : "Aucun compte annuel au registre",
                    )}
                  </div>
                </div>
                <div className="rfe-cellule">
                  <div className="rfe-cellule__k">{typo("Publications officielles")}</div>
                  <div className="rfe-cellule__n">{formatNombre(totalPublications)}</div>
                  <div className="rfe-cellule__note">{typo("Annonces BODACC")}</div>
                </div>
                <div className="rfe-cellule">
                  <div className="rfe-cellule__k">{typo("Décisions citées")}</div>
                  <div className="rfe-cellule__n">{formatNombre(decisions.length)}</div>
                  <div className="rfe-cellule__note">{typo("Ne signifie pas condamnation")}</div>
                </div>
              </div>
            </div>
          </section>

          {/* ── s02 Signalements publics ────────────────────────────── */}
          <section id="s02" className="rfe-section">
            <div className="rfe-section__t">
              <div className="rfe-section__n">{numero("s02")}</div>
              <h2 className="rfe-h2">{typo("Signalements publics")}</h2>
              <p>
                {typo(
                  "Le récit d’un litige, rendu public par le consommateur qui l’a vécu : nature du problème, solution demandée et avancement de la démarche.",
                )}
              </p>
            </div>
            <div className="rfe-section__c">
              {total === 0 ? (
                <div style={{ border: "1px solid var(--e-bord)", borderRadius: 3, padding: 22 }}>
                  <h3 className="rfe-h3">{typo("Aucun signalement public pour le moment")}</h3>
                  <p className="rfe-texte" style={{ marginTop: 10, maxWidth: "70ch" }}>
                    {typo(
                      "Cela ne permet pas de conclure que l’entreprise ne rencontre aucun problème. Cela signifie qu’aucun consommateur n’a encore rendu son litige visible ici.",
                    )}
                  </p>
                  <Link href={tunnel} className="rfe-btn" style={{ marginTop: 18 }}>
                    {typo("Un litige ? Commencer mes démarches")}
                  </Link>
                </div>
              ) : (
                <>
                  {enAttente > 0 ? (
                    <p className="rfe-encart rfe-encart--ambre" style={{ marginBottom: 14 }}>
                      <Alerte taille={17} />
                      <span>
                        <strong>{typo("En attente.")}</strong>{" "}
                        {typo(
                          `${formatNombre(enAttente)} signalement${enAttente > 1 ? "s sont" : " est"} actuellement en attente de solution.`,
                        )}
                      </span>
                    </p>
                  ) : null}

                  {signalements.map((s) => {
                    const resolu = s.resolutionConfirmee;
                    return (
                      <article key={s.id} className="rfe-signalement">
                        <div className="rfe-signalement__tete">
                          <span className="rfe-signalement__cat">
                            {typo(s.sousCategorie ?? problemes.find((p) => p.motif === s.categorie)?.libelle ?? "Litige")}
                          </span>
                          <span className="rfe-signalement__sep" aria-hidden="true">|</span>
                          <span className="rfe-signalement__date">
                            {typo(`Publié le ${formatDateLongue(s.creeLe)}`)}
                          </span>
                          <span
                            className="rfe-signalement__statut"
                            style={{ color: resolu ? "var(--e-vert)" : "var(--e-ambre)" }}
                          >
                            <span className="rfe-pastille rfe-pastille--7" aria-hidden="true" />
                            {typo(resolu ? "Résolu" : "En attente de solution")}
                          </span>
                        </div>
                        <div className="rfe-signalement__corps">
                          <h3 className="rfe-h3">
                            {typo(
                              `${s.sousCategorie ?? "Litige"} — faits du ${formatDateLongue(s.dateFaits)}`,
                            )}
                          </h3>
                          <p className="rfe-texte" style={{ marginTop: 8, maxWidth: "76ch" }}>
                            {typo(
                              declarationPublique(
                                s,
                                (c) => LIBELLES_DEMANDE[c] ?? c,
                                (c) => LIBELLES_ETAT_PRO[c] ?? c,
                              ),
                            )}
                          </p>
                          {/* Le pied ne s'affiche que s'il porte quelque chose :
                              un filet horizontal sous un espace vide fait
                              croire à un contenu manquant. */}
                          {s.solutionLibelle ? (
                            <div className="rfe-signalement__pied">
                              <span>
                                <span className="rfe-caps">{typo("Solution demandée")}</span>{" "}
                                <span style={{ fontWeight: 600, color: "var(--e-navy)" }}>
                                  {typo(s.solutionLibelle)}
                                </span>
                              </span>
                            </div>
                          ) : null}
                        </div>
                      </article>
                    );
                  })}

                  <p className="rfe-encart rfe-encart--gris" style={{ marginTop: 14 }}>
                    <Info taille={17} style={{ color: "var(--e-tertiaire)" }} />
                    <span>
                      {typo(
                        "Chaque signalement reprend la déclaration de son auteur. Recours France ne vérifie pas le récit des faits et n’intervient pas dans le règlement du litige.",
                      )}
                    </span>
                  </p>

                  <div
                    className="rfe-encart rfe-encart--bleu"
                    style={{ marginTop: 14, alignItems: "center", flexWrap: "wrap", gap: 16 }}
                  >
                    <span style={{ fontWeight: 700, color: "var(--e-navy)" }}>
                      {typo("Vous rencontrez un problème similaire ?")}
                    </span>
                    <Link href={tunnel} className="rfe-btn rfe-btn--sm" style={{ marginLeft: "auto" }}>
                      {typo("Un litige ? Commencer mes démarches")}
                    </Link>
                  </div>
                </>
              )}
            </div>
          </section>

          {/* ── s03 Signaler un problème ────────────────────────────── */}
          <section id="s03" className="rfe-section">
            <div className="rfe-section__t">
              <div className="rfe-section__n">{numero("s03")}</div>
              <h2 className="rfe-h2">{typo("Signaler un problème")}</h2>
              <p>{typo("Choisissez la situation la plus proche pour adapter votre réclamation.")}</p>
            </div>
            <div className="rfe-section__c">
              <div className="rfe-grille rfe-grille--problemes">
                {problemes.map((p) => {
                  const Icone = ICONES_PROBLEME[p.icone];
                  return (
                    <Link key={p.cle} href={`${tunnel}?motif=${p.motif}`} className="rfe-cellule rfe-cellule--lien">
                      <Icone taille={21} style={{ color: "var(--e-bleu)" }} />
                      <span className="rfe-cellule__titre">{typo(p.libelle)}</span>
                      <span className="rfe-cellule__desc">{typo(p.exemple)}</span>
                      <span className="rfe-cellule__pied">
                        <span className="rfe-action">
                          Signaler
                          <Fleche taille={13} />
                        </span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>

          {/* ── s04 Informations financières ────────────────────────── */}
          <section id="s04" className="rfe-section">
            <div className="rfe-section__t">
              <div className="rfe-section__n">{numero("s04")}</div>
              <h2 className="rfe-h2">{typo("Informations financières")}</h2>
              <p>{typo("Données issues des comptes annuels déposés. Aucun montant n’est estimé.")}</p>
            </div>
            <div className="rfe-section__c">
              <div className="rfe-grille rfe-grille--finances">
                {[
                  { k: "Chiffre d’affaires", ...ca },
                  { k: "Résultat net", ...rn },
                  {
                    k: "Comptes déposés",
                    n: formatNombre(comptes.length),
                    l:
                      comptes.length > 0
                        ? `Exercices ${comptes[comptes.length - 1].exercice} à ${comptes[0].exercice}`
                        : "Aucun dépôt au registre",
                    absent: comptes.length === 0,
                  },
                  {
                    k: "Effectif connu",
                    // La provenance est déjà sous la valeur : « 1 ou 2 salariés
                    // (tranche Insee) » au-dessus de « Tranche Insee » le
                    // dirait deux fois.
                    n: entreprise.trancheEffectif
                      ? libelleEffectif(entreprise.trancheEffectif).replace(" (tranche Insee)", "")
                      : "Non renseigné",
                    l: "Tranche Insee",
                    absent: !entreprise.trancheEffectif,
                  },
                ].map((f) => (
                  <div key={f.k} className="rfe-cellule">
                    <div className="rfe-cellule__k">{typo(f.k)}</div>
                    <div
                      className="rfe-cellule__n rfe-cellule__n--fin"
                      style={f.absent ? { color: "var(--e-mention)" } : { color: "var(--e-encre)" }}
                    >
                      {typo(f.n)}
                    </div>
                    <div className="rfe-cellule__note">{typo(f.l)}</div>
                  </div>
                ))}
              </div>

              {/* Le handoff met ici un encart « Comprendre ces données ». Sa
                  phrase est la bonne : sur cette fiche, chiffre d'affaires et
                  résultat net ne portent pas le même exercice, et la
                  confidentialité de l'un n'entraîne pas celle de l'autre. */}
              <div className="rfe-encart rfe-encart--bleu" style={{ marginTop: 14 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: "var(--e-navy)", fontSize: 14 }}>
                    {typo("Comprendre ces données")}
                  </div>
                  <p style={{ marginTop: 4, fontSize: 13.5, color: "var(--e-second)", lineHeight: 1.5 }}>
                    {typo(
                      "Le chiffre d’affaires et le résultat net sont deux informations distinctes : une société peut demander que son compte de résultat reste confidentiel sans que son bilan le devienne. Chaque montant porte donc l’exercice auquel il se rapporte.",
                    )}
                  </p>
                </div>
              </div>

              {donneesAnciennes ? (
                <p className="rfe-encart rfe-encart--ambre" style={{ marginTop: 12 }}>
                  <Alerte taille={17} />
                  <span>
                    {typo(
                      `Le dernier exercice publié remonte à ${dernierPublic!.exercice}. La situation de l’entreprise a pu changer depuis.`,
                    )}
                  </span>
                </p>
              ) : null}

              <p className="rfe-legende" style={{ marginTop: 12 }}>
                {typo("Source : comptes annuels déposés au registre (BODACC).")}
              </p>
            </div>
          </section>

          {/* ── s05 Identité de l’entreprise ────────────────────────── */}
          <section id="s05" className="rfe-section">
            <div className="rfe-section__t">
              <div className="rfe-section__n">{numero("s05")}</div>
              <h2 className="rfe-h2">{typo("Identité de l’entreprise")}</h2>
              <p>{typo("Informations officielles issues du répertoire Sirene, du RNE et du BODACC.")}</p>
            </div>
            <div className="rfe-section__c">
              <dl className="rfe-table" style={{ margin: 0 }}>
                {lignesIdentite.map((l) => (
                  <div key={l.k} className="rfe-table__l">
                    <dt className="rfe-table__k">{typo(l.k)}</dt>
                    <dd className="rfe-table__v" style={{ margin: 0, display: "flex", alignItems: "center", gap: 10, flex: "1 1 200px" }}>
                      {l.pilule ? (
                        <span className={`rfe-badge${active ? "" : " rfe-badge--ambre"}`}>
                          <span className="rfe-pastille" aria-hidden="true" />
                          {typo(l.v)}
                        </span>
                      ) : (
                        <span>{typo(l.v)}</span>
                      )}
                      {l.copiable ? <BoutonCopier valeur={l.v} libelle={l.k} /> : null}
                    </dd>
                  </div>
                ))}
              </dl>

              {/* Un site officiel déclaré est une donnée utile : c'est l'adresse
                  où adresser une réclamation. Elle n'est pas suivie par les
                  moteurs — la fiche ne transmet pas de réputation. */}
              {entreprise.siteWeb ? (
                <p className="rfe-note" style={{ marginTop: 14 }}>
                  {typo("Site déclaré : ")}
                  <a href={entreprise.siteWeb} target="_blank" rel="noopener nofollow ugc">
                    {entreprise.siteWeb.replace(/^https?:\/\//, "")}
                  </a>
                  {boutique ? (
                    <>
                      {" · "}
                      <Link href={`/boutiques/${boutique.slug}`}>{typo("Voir la fiche de la boutique")}</Link>
                    </>
                  ) : null}
                </p>
              ) : null}

              {/* Le maillage territorial, en fin de section : trois liens
                  sobres, qui font explorer l'annuaire sans peser sur la page. */}
              {lienCommune || lienDepartement || lienSecteur ? (
                <p className="rfe-note" style={{ marginTop: 10 }}>
                  {typo("Voir aussi : ")}
                  {[
                    lienCommune && commune ? { href: lienCommune, t: communeEnTitre(commune) } : null,
                    lienDepartement && entreprise.departement
                      ? { href: lienDepartement, t: nomDepartement(entreprise.departement) ?? entreprise.departement }
                      : null,
                    lienSecteur ? { href: lienSecteur, t: libelleSecteur(secteur) } : null,
                  ]
                    .filter((x): x is { href: string; t: string } => x !== null)
                    .map((x, i) => (
                      <span key={x.href}>
                        {i > 0 ? " · " : ""}
                        <Link href={x.href}>{typo(x.t)}</Link>
                      </span>
                    ))}
                </p>
              ) : null}
            </div>
          </section>

          {/* ── s06 Documents officiels ─────────────────────────────── */}
          {publications.length > 0 ? (
            <section id="s06" className="rfe-section">
              <div className="rfe-section__t">
                <div className="rfe-section__n">{numero("s06")}</div>
                <h2 className="rfe-h2">{typo("Documents officiels")}</h2>
                <p>
                  {typo(
                    `${formatNombre(totalPublications)} annonce${totalPublications > 1 ? "s" : ""} publiée${totalPublications > 1 ? "s" : ""} au BODACC. La publication officielle demeure la source de référence.`,
                  )}
                </p>
              </div>
              <div className="rfe-section__c">
                <div className="rfe-grille rfe-grille--panneaux">
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
                          <div key={e.id} className="rfe-panneau__l">
                            <span style={{ flex: "1 1 150px", minWidth: 0 }}>
                              <span className="rfe-panneau__date" style={{ display: "block" }}>
                                {formatDateLongue(e.date)}
                              </span>
                              {e.detail ? (
                                <span className="rfe-panneau__d" style={{ display: "block" }}>
                                  {typo(e.detail)}
                                </span>
                              ) : null}
                            </span>
                            {e.urlSource ? (
                              <a
                                href={e.urlSource}
                                className="rfe-action"
                                target="_blank"
                                rel="noopener nofollow"
                              >
                                Annonce
                                <Fleche taille={12} />
                              </a>
                            ) : null}
                          </div>
                        ))}
                        {reste > 0 ? (
                          <div className="rfe-panneau__pied">
                            <span className="rfe-legende">
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
                <p className="rfe-encart rfe-encart--gris" style={{ marginTop: 14 }}>
                  <Info taille={17} style={{ color: "var(--e-tertiaire)" }} />
                  <span>
                    {typo(
                      "Les pièces elles-mêmes — comptes annuels, statuts, procès-verbaux — sont conservées au Registre national des entreprises (INPI). Une société peut demander que ses comptes restent confidentiels : ils sont alors déposés sans être communicables, et l’annonce du dépôt subsiste seule.",
                    )}
                  </span>
                </p>
              </div>
            </section>
          ) : null}

          {/* ── s07 Décisions de justice ─────────────────────────────
              Le titre du handoff est « Décisions de justice », jamais
              « condamnations ». Une décision peut ordonner une expertise,
              trancher un incident ou débouter celui qui l'a engagée : le
              texte n'est pas recopié, il est lié à sa source, qui fait foi. */}
          {decisions.length > 0 ? (
            <section id="s07" className="rfe-section">
              <div className="rfe-section__t">
                <div className="rfe-section__n">{numero("s07")}</div>
                <h2 className="rfe-h2">{typo("Décisions de justice")}</h2>
                <p>
                  {typo(
                    `${formatNombre(decisions.length)} décision${decisions.length > 1 ? "s" : ""} en données ouvertes où ${nom} figure parmi les parties.`,
                  )}
                </p>
              </div>
              <div className="rfe-section__c">
                <p className="rfe-encart rfe-encart--gris">
                  <Info taille={17} style={{ color: "var(--e-tertiaire)" }} />
                  <span>
                    <strong>{typo("À savoir.")}</strong>{" "}
                    {typo(
                      "Figurer comme partie à une instance ne signifie ni avoir tort ni avoir été condamné. Le rapprochement se fait sur la dénomination et la forme juridique : en cas de doute, la décision n’est pas rattachée.",
                    )}
                  </span>
                </p>

                {/* En étroit, un bloc par décision : juridiction en titre, puis
                    des paires libellé-valeur. Les colonnes du tableau, laissées
                    à `flex-wrap`, se disloquaient en une suite de valeurs sans
                    étiquette — on ne savait plus laquelle était la date et
                    laquelle le numéro de dossier. */}
                <ul className="rfe-decisions-blocs">
                  {decisions.slice(0, 10).map((d) => (
                    <li key={d.id}>
                      <div className="rfe-decisions-blocs__jur">{typo(d.juridiction)}</div>
                      <dl className="rfe-decisions-blocs__paires">
                        <div>
                          <dt>Date</dt>
                          <dd>{formatDateLongue(d.date)}</dd>
                        </div>
                        <div>
                          <dt>Dossier</dt>
                          <dd>{d.numero ? typo(`n° ${d.numero}`) : "—"}</dd>
                        </div>
                        <div style={{ gridColumn: "1 / -1" }}>
                          <dt>{typo("Qualité")}</dt>
                          <dd>
                            {d.role === "demandeur"
                              ? "Partie demanderesse"
                              : d.role === "defendeur"
                                ? "Partie défenderesse"
                                : "Partie à l’instance"}
                          </dd>
                        </div>
                      </dl>
                      <a
                        href={`https://www.courdecassation.fr/decision/${d.judilibreId}`}
                        className="rfe-action rfe-action--large"
                        target="_blank"
                        rel="noopener nofollow"
                      >
                        {typo("Lire la décision")}
                        <Fleche taille={12} />
                      </a>
                    </li>
                  ))}
                </ul>

                <div className="rfe-scroll rfe-decisions-table" style={{ marginTop: 14 }}>
                  <table className="rfe-decisions">
                    <thead>
                      <tr>
                        <th scope="col">Juridiction</th>
                        <th scope="col">Date</th>
                        <th scope="col">Dossier</th>
                        <th scope="col">{typo("Qualité")}</th>
                        <th scope="col">
                          <span className="rf-vh">{typo("Lien vers la décision")}</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {decisions.slice(0, 10).map((d) => (
                        <tr key={d.id}>
                          <td>{typo(d.juridiction)}</td>
                          <td>{formatDateLongue(d.date)}</td>
                          <td>{d.numero ? typo(`n° ${d.numero}`) : "—"}</td>
                          <td>
                            {d.role === "demandeur"
                              ? "Partie demanderesse"
                              : d.role === "defendeur"
                                ? "Partie défenderesse"
                                : "Partie à l’instance"}
                          </td>
                          <td>
                            <a
                              href={`https://www.courdecassation.fr/decision/${d.judilibreId}`}
                              className="rfe-action"
                              target="_blank"
                              rel="noopener nofollow"
                            >
                              Lire
                              <Fleche taille={12} />
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {decisions.length > 10 ? (
                  <p className="rfe-legende" style={{ marginTop: 12 }}>
                    {typo(
                      `${formatNombre(decisions.length - 10)} décision${decisions.length - 10 > 1 ? "s" : ""} plus ancienne${decisions.length - 10 > 1 ? "s" : ""} non affichée${decisions.length - 10 > 1 ? "s" : ""}.`,
                    )}
                  </p>
                ) : null}

                <p className="rfe-legende" style={{ marginTop: 12, maxWidth: "84ch" }}>
                  {typo(
                    "Le dispositif est repris tel que le juge l’a rendu. Une décision peut avoir été frappée d’appel ou cassée depuis sa publication. Source : Judilibre, Cour de cassation, en données ouvertes.",
                  )}
                </p>
              </div>
            </section>
          ) : null}

          {/* ── s08 Démarches recommandées ──────────────────────────── */}
          <section id="s08" className="rfe-section">
            <div className="rfe-section__t">
              <div className="rfe-section__n">{numero("s08")}</div>
              <h2 className="rfe-h2">{typo("Démarches recommandées")}</h2>
              <p>{typo("Les étapes à effectuer dans l’ordre.")}</p>
            </div>
            <div className="rfe-section__c">
              <ol style={{ margin: 0, padding: 0, listStyle: "none" }}>
                {etapes.map((e, i) => (
                  <li key={e.cle} className="rfe-etape">
                    <span className="rfe-etape__n" aria-hidden="true">
                      {i + 1}
                    </span>
                    <span style={{ minWidth: 0 }}>
                      <span className="rfe-etape__t" style={{ display: "block" }}>
                        {typo(e.titre)}
                      </span>
                      <span className="rfe-etape__d" style={{ display: "block" }}>
                        {typo(e.sous)}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>

              <div
                style={{
                  marginTop: 16,
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 14,
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span className="rfe-note" style={{ flex: "1 1 240px", minWidth: 0 }}>
                  {typo("Vous pourrez compléter vos preuves et votre courrier après la publication.")}
                </span>
                <Link href={tunnel} className="rfe-btn rfe-btn--sm" style={{ flex: "none" }}>
                  {typo("Commencer mes démarches")}
                </Link>
              </div>

              {/* Aucun délai universel : il dépend du contrat, du produit et du
                  médiateur compétent, et « quatorze jours » lu hors contexte
                  fait renoncer un consommateur qui n'est pas hors délai. */}
              <p className="rfe-legende" style={{ marginTop: 14, maxWidth: "84ch" }}>
                {typo(
                  "Informations générales de droit de la consommation. Les délais applicables dépendent du contrat, du produit et du médiateur compétent, et ne constituent pas un conseil juridique personnalisé.",
                )}
              </p>

              <p className="rfe-note" style={{ marginTop: 12 }}>
                {typo("Guides détaillés : ")}
                {GUIDES.slice(0, 5).map((g, i) => (
                  <span key={g.href}>
                    {i > 0 ? " · " : ""}
                    <Link href={g.href}>{typo(g.libelle)}</Link>
                  </span>
                ))}
              </p>
            </div>
          </section>

          {/* ── s09 Questions fréquentes ────────────────────────────── */}
          <section id="s09" className="rfe-section">
            <div className="rfe-section__t">
              <div className="rfe-section__n">{numero("s09")}</div>
              <h2 className="rfe-h2">{typo("Questions fréquentes")}</h2>
              <p>{typo(`Sur ${nom} et sur le fonctionnement de Recours France.`)}</p>
            </div>
            <div className="rfe-section__c">
              {questions.map((q) => (
                <Question key={q.cle} q={q.q} r={q.r} />
              ))}
            </div>
          </section>

          {/* ── Entreprises du même secteur ─────────────────────────────
              Cette section n'existe que pour le maillage interne : c'est la
              densité de liens fiche→fiche qui fait explorer un annuaire de
              treize millions de pages, pas le plan de site. Elle n'apprend
              rien au visiteur, d'où sa place en fin de page et son grain
              volontairement sobre.

              Tous les voisins sont listés, pas quatre : chaque lien retiré est
              un chemin d'exploration en moins. */}
          {comparables.length > 0 ? (
            <section className="rfe-section" style={{ borderBottom: 0 }}>
              <div className="rfe-section__t">
                <h2 className="rfe-h2">{typo("Entreprises du même secteur")}</h2>
                <p>
                  {typo(
                    "Rapprochement par activité et par territoire. Ce n’est ni un classement ni une comparaison de qualité.",
                  )}
                </p>
              </div>
              <div className="rfe-section__c">
                <div className="rfe-grille rfe-grille--voisines">
                  {comparables.map((c) => (
                    <Link key={c.slug} href={`/entreprises/${c.slug}`} className="rfe-cellule rfe-cellule--lien">
                      <span className="rfe-cellule__titre">{c.denomination}</span>
                      <span className="rfe-cellule__desc">
                        {c.commune ? communeEnTitre(c.commune) : ""}
                        {c.signalements > 0
                          ? `${c.commune ? " · " : ""}${formatNombre(c.signalements)} signalement${c.signalements > 1 ? "s" : ""}`
                          : ""}
                      </span>
                    </Link>
                  ))}
                </div>
                {lienSecteur ? (
                  <Link href={lienSecteur} className="rfe-action" style={{ marginTop: 14 }}>
                    {typo("Voir toutes les entreprises similaires")}
                    <Fleche taille={13} />
                  </Link>
                ) : null}
              </div>
            </section>
          ) : null}
        </div>
      </main>

      {/* ── Bandeau d’appel ─────────────────────────────────────────── */}
      <section className="rfe-appel">
        <div className="rfe-conteneur rfe-appel__piste">
          <div style={{ flex: "1 1 400px", minWidth: "min(100%, 260px)" }}>
            <p className="rfe-surtitre rfe-surtitre--clair">{typo("Litige avec cette entreprise")}</p>
            <h2 style={{ marginTop: 12 }}>{typo(`Un litige avec ${nom} ? Commencez vos démarches.`)}</h2>
            <p>{typo("Publication gratuite · 3 minutes · vous gardez le contrôle")}</p>
          </div>
          <Link href={tunnel} className="rfe-btn rfe-btn--inverse" style={{ flex: "none" }}>
            {typo("Commencer mes démarches")}
          </Link>
        </div>
      </section>

      {/* ── Pied de page ────────────────────────────────────────────────
          Le bandeau d'indépendance a été retiré du haut de page sur demande.
          Les deux mentions ci-dessous sont ce qui reste pour distinguer
          l'éditeur de la société dont la fiche parle : sur treize millions de
          fiches, la confusion se produira, et elles seules l'écartent. */}
      <footer className="rfe-pied">
        <div className="rfe-conteneur">
          <div className="rfe-pied__cols">
            <div className="rfe-pied__ident">
              <Logo taille={34} fonce />
              <p style={{ marginTop: 14, fontSize: 13, lineHeight: 1.6, maxWidth: "42ch" }}>
                {typo(`Cette fiche porte sur ${nom}, société tierce sans lien avec l’éditeur de la plateforme.`)}
              </p>
              <p className="rfe-pied__faible" style={{ marginTop: 10, maxWidth: "42ch" }}>
                {typo(
                  `Recours France est édité par ${EDITEUR.raisonSociale}${EDITEUR.siren ? `, SIREN ${EDITEUR.siren}` : ""}${siegeSocial() ? ` — ${siegeSocial()}` : ""}.`,
                )}
              </p>
            </div>

            <div className="rfe-pied__col">
              <div className="rfe-pied__t">Plateforme</div>
              <div className="rfe-pied__liens">
                <Link href="/methodologie">{typo("Comment ça marche")}</Link>
                <Link href="/annuaire">Annuaire des entreprises</Link>
                <Link href="/boutiques">Boutiques en ligne</Link>
                <Link href="/a-propos">{typo("À propos et indépendance")}</Link>
              </div>
            </div>

            <div className="rfe-pied__col">
              <div className="rfe-pied__t">Ressources</div>
              <div className="rfe-pied__liens">
                <Link href="/aide">{typo("Guides et démarches")}</Link>
                <Link href="/charte-de-moderation">{typo("Règles de publication")}</Link>
                <Link href="/mon-espace">Retrouver mon signalement</Link>
                <Link href="/demarches-officielles">{typo("Démarches officielles")}</Link>
              </div>
            </div>

            <div className="rfe-pied__col">
              <div className="rfe-pied__t">{typo("Liens légaux")}</div>
              <div className="rfe-pied__liens">
                <Link href="/mentions-legales">{typo("Mentions légales")}</Link>
                <Link href="/donnees-personnelles">{typo("Confidentialité")}</Link>
                <Link href="/contact">Contact</Link>
              </div>
            </div>
          </div>

          <div className="rfe-pied__barre">
            <span>{typo("© 2026 Recours France — Tous droits réservés.")}</span>
            <span>{typo("Plateforme privée et indépendante, sans lien avec l’État.")}</span>
          </div>
        </div>

        {/* Le filet tricolore ferme la page comme il l'a ouverte. */}
        <div className="rfe-tricolore" aria-hidden="true">
          <i style={{ background: "var(--e-navy)" }} />
          <i style={{ background: "var(--e-bleu)" }} />
          <i style={{ background: "var(--e-rouge)" }} />
        </div>
      </footer>

      {/* ── Barre d’action, écrans étroits ──────────────────────────── */}
      <div className="rfe-barre">
        <Link href={tunnel} className="rfe-btn rfe-btn--plein">
          {typo("Un litige ? Commencer mes démarches")}
        </Link>
      </div>
    </div>
  );
}
