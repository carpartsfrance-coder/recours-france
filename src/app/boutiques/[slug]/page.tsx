import { Fragment } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Page } from "@/components/chrome";
import { prisma } from "@/lib/db";
import { adressePostale, formatDateLongue, formatMontant, formatNombre, formatSiren } from "@/lib/format";
import { DonneesStructurees, faqJsonLd, filAlianeJsonLd, organisationJsonLd } from "@/components/donnees-structurees";
import { boutiqueIndexable } from "@/lib/indexation";
import { EDITEUR, siegeSocial } from "@/lib/editeur";
import { typo } from "@/lib/typographie";
import { demarchesPour, portesEntree, PARCOURS, FAQ, questionsReferencement } from "@/lib/boutique-fiche";
import { Accordeon } from "@/components/boutique/accordeon";
import { NavSections } from "@/components/boutique/nav-sections";
import { Litiges, type LitigePublic, type StatutLitige } from "@/components/boutique/litiges";
import {
  Balance, Bouclier, Calendrier, CercleCoche, Chevron, Document, Fleche,
  Info, Lien, Loupe, Personne,
} from "@/components/refonte/icones";

/**
 * Fiche boutique — gabarit du handoff Carpartsfrance.
 *
 * C'est un gabarit de référencement programmatique : la page de référence
 * décrit une boutique, le gabarit en sert cent quatre-vingt mille. Rien de ce
 * qui la caractérise n'est écrit ici, et tout ce qui l'est vaut pour toutes.
 *
 * ── Ce que la page ne fera jamais ──────────────────────────────────────────
 * Ni note, ni étoile, ni pourcentage, ni `AggregateRating`. Déclarer une note
 * qu'on n'affiche pas est un balisage faux, et l'afficher sans avis vérifiés
 * en serait un plus grave encore. Aucune donnée inventée non plus : ce qu'on
 * ignore est écrit « Non confirmé », jamais masqué. Une ligne absente laisse
 * croire qu'on n'a pas cherché ; une ligne vide dit qu'on a cherché et trouvé
 * le vide, ce qui est précisément le renseignement utile face à un site
 * marchand qui ne publie pas son éditeur.
 *
 * ── Deux écarts assumés au prototype ───────────────────────────────────────
 * Le lien « Consulter le litige » est retiré : aucune page publique par litige
 * n'existe, et le handoff interdit lui-même d'afficher une fonctionnalité qui
 * n'existe pas. Et l'onglet « Sources » ouvre une vraie section de sources :
 * dans le prototype il tombait sur la foire aux questions, ce qu'un lien
 * intitulé « Consulter les sources » ne peut pas faire.
 */
export const dynamic = "force-dynamic";

/** Libellé de la source du rattachement, sans la faire passer pour une vérification. */
const SOURCES: Record<string, string> = {
  wikidata: "Wikidata (base contributive)",
  osm: "OpenStreetMap (base contributive)",
  "mentions-legales": "mentions légales du site",
  facture: "facture fournie par un consommateur",
  manuel: "saisie manuelle",
};

/** Trois ans sans signe de vie : le seuil au-delà duquel le site est réputé éteint. */
const INACTIVITE_MAX_ANNEES = 3;

const NON_CONFIRME = "Non confirmé";
const NON_COMMUNIQUE = "Non communiqué";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const boutique = await prisma.boutique.findUnique({
    where: { slug },
    include: { entreprise: { select: { denomination: true } } },
  });
  if (!boutique) return { title: "Boutique en ligne" };

  return {
    ...(boutiqueIndexable(boutique) ? {} : { robots: { index: false, follow: true } }),
    // Le titre porte « avis » et le domaine : c'est la requête visée, et elle
    // s'écrit telle que la personne la tape.
    title: typo(`${boutique.nom} : avis, litiges et signalements`),
    description: typo(
      boutique.entreprise
        ? `Vous recherchez des avis sur ${boutique.nom} ? Consultez les litiges publiés, l’identité de la société exploitante (${boutique.entreprise.denomination}) et les démarches disponibles.`
        : `Vous recherchez des avis sur ${boutique.nom} ? Consultez les litiges publiés, les informations sur la boutique et les démarches disponibles.`,
    ),
    alternates: { canonical: `/boutiques/${slug}` },
  };
}

export default async function FicheBoutique({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const boutique = await prisma.boutique.findUnique({
    where: { slug },
    include: {
      entreprise: {
        select: {
          slug: true, denomination: true, siren: true, formeJuridique: true,
          adresseSiege: true, codePostal: true, commune: true, secteur: true,
          naf: true, nafLibelle: true, dateImmatriculation: true, etatAdministratif: true,
          emailReclamation: true, telephoneReclamation: true, mediationDeclaree: true,
          mediateur: { select: { nom: true, slug: true } },
        },
      },
      signalements: {
        where: { moderation: "PUBLIE" },
        orderBy: { creeLe: "desc" },
        take: 40,
      },
    },
  });
  if (!boutique) notFound();

  await prisma.boutique.update({ where: { id: boutique.id }, data: { vues: { increment: 1 } } });

  const nom = boutique.nom;
  const societe = boutique.entreprise;
  const secteur = societe?.secteur ?? null;
  const portes = portesEntree(secteur);
  const demarches = demarchesPour(secteur);
  const extension = boutique.domaine.slice(boutique.domaine.lastIndexOf("."));

  /**
   * La date de vérification, qui n'est pas `majLe`.
   *
   * `majLe` porte `@updatedAt`, et la page incrémente le compteur de vues à
   * chaque visite : la colonne vaut donc toujours « il y a quelques secondes ».
   * L'afficher comme date de vérification annoncerait une vérification
   * quotidienne qui n'a jamais eu lieu — exactement le genre d'affirmation que
   * le reste de la page s'interdit.
   */
  const verifieLe = boutique.rattachementLe;

  const eteinte =
    boutique.derniereActivite !== null &&
    boutique.derniereActivite < new Date(new Date().setFullYear(new Date().getFullYear() - INACTIVITE_MAX_ANNEES));

  /* ── Les litiges, mis en forme pour l'affichage ──────────────────────── */
  const litiges: LitigePublic[] = boutique.signalements.map((s) => {
    const statut: StatutLitige = s.resolutionConfirmee
      ? "Résolu"
      : s.reponseDeclaree || (s.relances ?? 0) > 0
        ? "Démarche en cours"
        : "Publié";

    const categorie =
      s.sousCategorie ?? portes.find((p) => p.motif === s.categorie)?.libelle ?? "Litige";

    const frise = [
      { libelle: "Faits", date: formatDateLongue(s.dateFaits) },
      { libelle: "Publié", date: formatDateLongue(s.creeLe) },
      ...(s.reponseDeclareeLe ? [{ libelle: "Réponse déclarée", date: formatDateLongue(s.reponseDeclareeLe) }] : []),
      ...(s.resolutionConfirmeeLe ? [{ libelle: "Résolu", date: formatDateLongue(s.resolutionConfirmeeLe) }] : []),
    ];

    // Style rapporté : la page relaie une déclaration, elle ne la reprend
    // jamais à son compte. « Le consommateur déclare », jamais « la boutique a ».
    const morceaux = [
      `Le consommateur déclare un problème de type « ${categorie.toLowerCase()} ».`,
      s.solutionLibelle ? `Il indique attendre : ${s.solutionLibelle.toLowerCase()}.` : null,
      (s.relances ?? 0) >= 3
        ? "Il déclare avoir relancé trois fois ou davantage."
        : s.relances === 2
          ? "Il déclare avoir relancé deux fois."
          : s.relances === 1
            ? "Il déclare avoir relancé une fois."
            : null,
      s.resolutionConfirmee
        ? `Il a depuis confirmé la résolution${s.resultat ? ` : ${s.resultat.toLowerCase()}` : ""}.`
        : s.reponseDeclaree
          ? "Il déclare avoir reçu une réponse du professionnel."
          : null,
    ].filter(Boolean);

    return {
      id: s.id,
      categorie,
      statut,
      titre: `${categorie} — faits du ${formatDateLongue(s.dateFaits)}`,
      resume: morceaux.join(" "),
      date: formatDateLongue(s.creeLe),
      montant: s.montantPublic && s.montant ? formatMontant(s.montant.toString()) : null,
      frise,
    };
  });

  const total = litiges.length;
  const resolus = litiges.filter((l) => l.statut === "Résolu").length;

  /* ── Le lien du tunnel ───────────────────────────────────────────────── */
  const tunnel = (motif?: string) =>
    `/boutiques/${slug}/signaler${motif ? `?motif=${motif}` : ""}`;

  /* ── Boutiques voisines : le maillage interne, sans lequel rien n'est exploré ── */
  const voisines = await prisma.boutique.findMany({
    where: {
      id: { not: boutique.id },
      ...(boutique.entrepriseId
        ? { entrepriseId: boutique.entrepriseId }
        : { domaine: { endsWith: extension }, derniereActivite: { not: null } }),
    },
    select: { slug: true, nom: true },
    orderBy: boutique.entrepriseId ? { domaine: "asc" } : { derniereActivite: "desc" },
    take: 18,
  });

  const questions = [...FAQ, ...questionsReferencement(nom, total, portes)];

  const fil = [{ libelle: "Boutiques en ligne", href: "/boutiques" }, { libelle: nom }];

  const nav = [
    { href: "#litiges", libelle: total > 1 ? "Litiges publiés" : "Litige publié" },
    { href: "#boutique", libelle: "Informations sur la boutique" },
    { href: "#demarches", libelle: "Que faire ?" },
    { href: "#sources", libelle: "Sources" },
  ];

  /** Le service client, tel qu'il est connu — ou tel qu'il ne l'est pas. */
  const serviceClient =
    societe?.emailReclamation ?? societe?.telephoneReclamation ?? null;
  const mediateur = societe?.mediateur?.nom ?? societe?.mediationDeclaree ?? null;

  return (
    <Page entete={{ baseline: "Observatoire des problèmes consommateurs", navActive: "boutiques" }} fil={fil}>
      <DonneesStructurees donnees={filAlianeJsonLd(fil)} />
      {/* Organization n'est balisé que si l'exploitant est établi : décrire une
          organisation qu'on n'a pas identifiée serait une donnée inventée. */}
      {societe ? (
        <DonneesStructurees
          donnees={organisationJsonLd({
            nom: societe.denomination,
            siren: societe.siren,
            url: `/boutiques/${slug}`,
            siteWeb: `https://${boutique.domaine}`,
            adresse: societe.adresseSiege,
            codePostal: societe.codePostal,
            commune: societe.commune,
          })}
        />
      ) : null}
      <DonneesStructurees donnees={faqJsonLd(questions.map((q) => ({ q: typo(q.q), a: typo(q.r) })))} />

      <div className="rfb">
        {/* ── 4. Hero ─────────────────────────────────────────────────── */}
        <div className="rfb-conteneur rfb-hero">
          <div className="rfb-hero__g">
            <span className="rfb-pilule">Fiche boutique en ligne</span>

            <h1 className="rfb-h1" style={{ marginTop: 16 }}>
              {typo(`Avis sur ${nom} : litiges et signalements publiés`)}
            </h1>

            <p className="rfb-intro" style={{ marginTop: 16 }}>
              {typo(
                `Vous recherchez des avis sur ${nom} avant une commande ou parce que vous rencontrez un problème ? Consultez les litiges rendus publics, leur état d’avancement et les informations utiles pour agir.`,
              )}
            </p>

            <div className="rfb-encart" style={{ marginTop: 18 }}>
              <Info taille={18} />
              <span>
                {typo("Recours France ne publie pas de notes étoilées ni d’avis commerciaux généraux.")}
              </span>
            </div>

            <div className="rfb-ctas" style={{ marginTop: 22 }}>
              <Link href={tunnel()} className="rfb-btn">
                {typo("Rendre mon litige visible")}
                <span className="rfb-btn__carre" aria-hidden="true">
                  <Chevron taille={16} style={{ transform: "rotate(-90deg)" }} />
                </span>
              </Link>
              <a href="#litiges" className="rfb-lien">
                {typo(total > 1 ? "Voir les litiges publiés" : "Voir les litiges publiés")}
                <Chevron taille={16} style={{ transform: "rotate(-90deg)" }} />
              </a>
            </div>

            <p className="rfb-petit" style={{ marginTop: 14 }}>
              Gratuit • parcours simple • publication immédiate
            </p>

            <p className="rfb-petit" style={{ marginTop: 14, display: "flex", gap: 9, alignItems: "flex-start" }}>
              <Bouclier taille={18} style={{ flex: "none", color: "var(--b-icone)", marginTop: 1 }} />
              <span>
                {typo(
                  "Rendez votre problème public, puis obtenez votre courrier et les prochaines étapes adaptées.",
                )}
              </span>
            </p>
          </div>

          <div className="rfb-hero__d">
            <div className="rfb-carte">
              <h2 className="rfb-h3" style={{ fontSize: 17 }}>
                {typo(`Ce que nous savons sur ${nom}`)}
              </h2>

              <div className="rfb-savoir" style={{ marginTop: 14 }}>
                <div className="rfb-ligne">
                  <Lien taille={20} />
                  <span className="rfb-ligne__k">{typo("Site :")}</span>
                  <span className="rfb-ligne__v">{boutique.domaine}</span>
                </div>

                <div className="rfb-ligne">
                  <Personne taille={20} />
                  <span className="rfb-ligne__k">{typo("Exploitant :")}</span>
                  <span className="rfb-ligne__v">
                    {societe ? null : <span className="rfb-point" aria-hidden="true" />}
                    {societe ? (
                      <Link href={`/entreprises/${societe.slug}`}>{societe.denomination}</Link>
                    ) : (
                      "Non identifié avec certitude"
                    )}
                  </span>
                </div>

                <div className="rfb-ligne">
                  <Document taille={20} />
                  <span className="rfb-ligne__k">{typo("Service client :")}</span>
                  <span className="rfb-ligne__v">
                    {serviceClient ? null : <span className="rfb-point" aria-hidden="true" />}
                    {serviceClient ?? NON_CONFIRME}
                  </span>
                </div>

                <div className="rfb-ligne">
                  <Balance taille={20} />
                  <span className="rfb-ligne__k">{typo("Médiateur :")}</span>
                  <span className="rfb-ligne__v">
                    {mediateur ? null : <span className="rfb-point" aria-hidden="true" />}
                    {mediateur ?? NON_COMMUNIQUE}
                  </span>
                </div>

                <div className="rfb-ligne">
                  <Calendrier taille={20} />
                  <span className="rfb-ligne__k">{typo("Dernière vérification :")}</span>
                  <span className="rfb-ligne__v">
                    {verifieLe ? null : <span className="rfb-point" aria-hidden="true" />}
                    {verifieLe ? formatDateLongue(verifieLe) : "Non vérifiée"}
                  </span>
                </div>

                {societe?.siren ? (
                  <div className="rfb-ligne">
                    <Document taille={20} />
                    <span className="rfb-ligne__k">{typo("SIREN :")}</span>
                    <span className="rfb-ligne__v">{formatSiren(societe.siren)}</span>
                  </div>
                ) : null}

                {societe && adressePostale(societe) ? (
                  <div className="rfb-ligne">
                    <Calendrier taille={20} style={{ opacity: 0, width: 0 }} />
                    <span className="rfb-ligne__k">{typo("Adresse :")}</span>
                    <span className="rfb-ligne__v">{adressePostale(societe)}</span>
                  </div>
                ) : null}
              </div>

              <a href="#sources" className="rfb-lien" style={{ marginTop: 6 }}>
                <Lien taille={16} />
                {typo("Consulter les sources")}
              </a>
            </div>
          </div>
        </div>

        {/* ── 5. Indicateurs ──────────────────────────────────────────── */}
        <div className="rfb-conteneur" style={{ paddingBottom: "clamp(24px, 2.6cqw, 38px)" }}>
          <div className="rfb-indics">
            <div className="rfb-indic">
              <span className="rfb-indic__med" style={{ background: "var(--b-bleu-tres-pale)", color: "var(--b-bleu)" }}>
                <Document taille={22} />
              </span>
              <span>
                <span className="rfb-indic__n">{formatNombre(total)}</span>
                <span className="rfb-indic__k" style={{ display: "block" }}>
                  Litige{total > 1 ? "s" : ""} publié{total > 1 ? "s" : ""}
                </span>
              </span>
            </div>

            <div className="rfb-indic">
              <span className="rfb-indic__med" style={{ background: "var(--b-vert-pale)", color: "var(--b-vert)" }}>
                <CercleCoche taille={22} />
              </span>
              <span>
                <span className="rfb-indic__n">{formatNombre(resolus)}</span>
                <span className="rfb-indic__k" style={{ display: "block" }}>
                  Litige{resolus > 1 ? "s" : ""} résolu{resolus > 1 ? "s" : ""}
                </span>
              </span>
            </div>

            <div className="rfb-indic">
              <span className="rfb-indic__med" style={{ background: "var(--b-corail-pale)", color: "var(--b-corail)" }}>
                <Personne taille={22} />
              </span>
              <span>
                <span className="rfb-indic__k" style={{ display: "block" }}>
                  Exploitant
                </span>
                <span className="rfb-indic__v">{societe ? societe.denomination : NON_CONFIRME}</span>
              </span>
            </div>

            <div className="rfb-indic">
              <span className="rfb-indic__med" style={{ background: "var(--b-bleu-tres-pale)", color: "var(--b-bleu)" }}>
                <Calendrier taille={22} />
              </span>
              <span>
                <span className="rfb-indic__k" style={{ display: "block" }}>
                  Fiche vérifiée
                </span>
                <span className="rfb-indic__v">
                  {verifieLe ? formatDateLongue(verifieLe) : "Non vérifiée"}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* ── 6. Nav de sections ──────────────────────────────────────── */}
        <NavSections liens={nav} />

        {/* ── 7. Litiges et signalements ──────────────────────────────── */}
        <section id="litiges" className="rfb-section">
          <div className="rfb-conteneur">
            <h2 className="rfb-h2">{typo(`Litiges et signalements concernant ${nom}`)}</h2>

            {total === 0 ? (
              <div className="rfb-carte rfb-vide" style={{ marginTop: 20 }}>
                <svg
                  width="112" height="104" viewBox="0 0 112 104" fill="none"
                  stroke="var(--b-bleu)" strokeWidth="2.4" strokeLinejoin="round"
                  style={{ flex: "none" }} aria-hidden="true" focusable="false"
                >
                  <path d="M22 8h44l20 20v60H22Z" />
                  <path d="M66 8v20h20" />
                  <path d="M34 44h38" />
                  <path d="M34 56h38" />
                  <path d="M34 68h22" />
                  <path d="M52 74h34a6 6 0 0 1 6 6v12a6 6 0 0 1-6 6H70l-9 8v-8h-9a6 6 0 0 1-6-6V80a6 6 0 0 1 6-6Z" fill="#fff" />
                </svg>
                <div className="rfb-vide__texte">
                  <h3 className="rfb-h3 rfb-h3--large">
                    {typo("Aucun litige publié sur Recours France pour le moment")}
                  </h3>
                  {/* L'énoncé complet, et dans cet ordre : l'absence de litige
                      n'est pas un satisfecit, et le laisser croire ferait de
                      cette page une caution gratuite pour cent quatre-vingt
                      mille sites dont nous ne savons rien. */}
                  <p className="rfb-petit" style={{ marginTop: 8, fontSize: 15, maxWidth: "56ch" }}>
                    {typo(
                      "Cela ne permet pas de conclure que l’entreprise est fiable ou qu’elle ne rencontre aucun problème. Cela signifie uniquement qu’aucun consommateur n’a encore rendu son litige visible sur cette page.",
                    )}
                  </p>
                  <p style={{ marginTop: 18, fontSize: 17, fontWeight: 700, color: "var(--b-marine)" }}>
                    {typo(`Vous rencontrez un problème avec ${nom} ?`)}
                  </p>
                  <Link href={tunnel()} className="rfb-btn" style={{ marginTop: 16 }}>
                    {typo("Être le premier à rendre mon litige visible")}
                  </Link>
                </div>
              </div>
            ) : (
              <Litiges litiges={litiges} />
            )}
          </div>
        </section>

        {/* ── 8. Qui exploite ce site ? ───────────────────────────────── */}
        <section id="boutique" className="rfb-section rfb-section--bleu">
          <div className="rfb-conteneur">
            <h2 className="rfb-h2">{typo(`Qui exploite ${nom} ?`)}</h2>

            <div className="rfb-cols" style={{ marginTop: 20 }}>
              <div>
                <p style={{ fontSize: 16.5, fontWeight: 700, color: "var(--b-marine)", lineHeight: 1.45 }}>
                  {typo(
                    societe
                      ? `Exploitant rattaché à ${societe.denomination} lors de notre dernière vérification.`
                      : "Exploitant non identifié avec certitude lors de notre dernière vérification.",
                  )}
                </p>
                <p className="rfb-texte" style={{ marginTop: 10, maxWidth: "62ch" }}>
                  {typo(
                    "Les informations ci-contre proviennent des mentions légales du site et d’autres sources consultées. Elles peuvent être incomplètes ou absentes.",
                  )}
                </p>

                <div style={{ display: "grid", gap: 12, marginTop: 18 }}>
                  <p className="rfb-petit" style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <Loupe taille={19} style={{ flex: "none", color: "var(--b-icone)", marginTop: 2 }} />
                    <span>
                      <strong style={{ color: "var(--b-texte)" }}>{typo("Méthode de vérification :")}</strong>{" "}
                      {typo("analyse manuelle des mentions légales et bases publiques")}
                    </span>
                  </p>
                  <p className="rfb-petit" style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <Document taille={19} style={{ flex: "none", color: "var(--b-icone)", marginTop: 2 }} />
                    <span>
                      <strong style={{ color: "var(--b-texte)" }}>{typo("Sources consultées :")}</strong>{" "}
                      {typo(
                        societe
                          ? "répertoire Sirene (Insee), Registre national des entreprises (INPI), BODACC, mentions légales du site"
                          : "mentions légales du site, bases publiques (Whois, INPI, Infogreffe), autres sources ouvertes",
                      )}
                    </span>
                  </p>
                  <p className="rfb-petit" style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <Calendrier taille={19} style={{ flex: "none", color: "var(--b-icone)", marginTop: 2 }} />
                    <span>
                      {verifieLe
                        ? `Mise à jour le ${formatDateLongue(verifieLe)}`
                        : typo("Aucune vérification manuelle n’a encore été effectuée sur cette fiche.")}
                    </span>
                  </p>
                </div>

                {eteinte ? (
                  <div className="rfb-encart" style={{ marginTop: 16, background: "#fff" }}>
                    <Info taille={18} />
                    <span>
                      {typo(
                        `Aucune activité constatée sur ce domaine depuis ${formatDateLongue(boutique.derniereActivite!)}. Le site est peut-être abandonné.`,
                      )}
                    </span>
                  </div>
                ) : null}

                {societe && societe.etatAdministratif !== "ACTIVE" ? (
                  <div className="rfb-encart" style={{ marginTop: 16, background: "#fff" }}>
                    <Info taille={18} />
                    <span>
                      {typo(
                        "La société rattachée à ce site n’est plus en activité selon les registres publics. Un litige en cours relève alors d’un mandataire judiciaire.",
                      )}
                    </span>
                  </div>
                ) : null}

                <div style={{ display: "flex", flexWrap: "wrap", gap: 20, marginTop: 6 }}>
                  <a href="#sources" className="rfb-lien">
                    <Lien taille={16} />
                    {typo("Voir les sources")}
                  </a>
                  <Link
                    href={societe ? `/entreprises/${societe.slug}/signaler-une-erreur` : "/contact"}
                    className="rfb-lien"
                  >
                    <Lien taille={16} />
                    {typo("Signaler une information incorrecte")}
                  </Link>
                </div>
              </div>

              <div>
                <div className="rfb-carte" style={{ padding: 0 }}>
                  <div className="rfb-savoir" style={{ border: 0 }}>
                    <div className="rfb-ligne">
                      <Document taille={20} />
                      <span className="rfb-ligne__k">{typo("Raison sociale :")}</span>
                      <span className="rfb-ligne__v">
                        {societe ? null : <span className="rfb-point" aria-hidden="true" />}
                        {societe ? societe.denomination : NON_CONFIRME}
                      </span>
                    </div>
                    <div className="rfb-ligne">
                      <Document taille={20} />
                      <span className="rfb-ligne__k">{typo("SIREN :")}</span>
                      <span className="rfb-ligne__v">
                        {societe?.siren ? null : <span className="rfb-point" aria-hidden="true" />}
                        {societe?.siren ? formatSiren(societe.siren) : NON_CONFIRME}
                      </span>
                    </div>
                    <div className="rfb-ligne">
                      <Personne taille={20} />
                      <span className="rfb-ligne__k">{typo("Adresse :")}</span>
                      <span className="rfb-ligne__v">
                        {societe && adressePostale(societe) ? null : (
                          <span className="rfb-point" aria-hidden="true" />
                        )}
                        {(societe && adressePostale(societe)) || NON_COMMUNIQUE}
                      </span>
                    </div>
                    <div className="rfb-ligne">
                      <Balance taille={20} />
                      <span className="rfb-ligne__k">{typo("Mentions légales :")}</span>
                      <span className="rfb-ligne__v">
                        <span className="rfb-point" aria-hidden="true" />
                        {NON_COMMUNIQUE}
                      </span>
                    </div>
                    {societe?.formeJuridique ? (
                      <div className="rfb-ligne">
                        <Document taille={20} />
                        <span className="rfb-ligne__k">{typo("Forme juridique :")}</span>
                        <span className="rfb-ligne__v">{societe.formeJuridique}</span>
                      </div>
                    ) : null}
                    {societe?.dateImmatriculation ? (
                      <div className="rfb-ligne">
                        <Calendrier taille={20} />
                        <span className="rfb-ligne__k">{typo("Immatriculation :")}</span>
                        <span className="rfb-ligne__v">{formatDateLongue(societe.dateImmatriculation)}</span>
                      </div>
                    ) : null}
                  </div>
                </div>

                <p className="rfb-petit" style={{ marginTop: 14 }}>
                  {typo(
                    societe
                      ? `Rattachement établi${boutique.rattachementLe ? ` le ${formatDateLongue(boutique.rattachementLe)}` : ""} · source : ${SOURCES[boutique.rattachementSource ?? ""] ?? boutique.rattachementSource ?? "nos données"}.${boutique.rattachementSource === "wikidata" || boutique.rattachementSource === "osm" ? " Cette source est contributive : le rattachement n’a pas été reconfirmé auprès du site." : ""}`
                      : "Tout site marchand est tenu de publier l’identité de son éditeur — dénomination, adresse et numéro d’immatriculation — au titre de l’article 6 III de la loi pour la confiance dans l’économie numérique. Une boutique qui n’en publie aucune est un signal à prendre au sérieux avant de commander.",
                  )}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── 9. Vous avez un problème ? ──────────────────────────────── */}
        <section id="probleme" className="rfb-section">
          <div className="rfb-conteneur">
            <h2 className="rfb-h2">{typo(`Vous avez un problème avec ${nom} ?`)}</h2>
            <p className="rfb-intro" style={{ marginTop: 10 }}>
              {typo("Choisissez la situation qui vous concerne.")}
            </p>

            <div className="rfb-portes" style={{ marginTop: 20 }}>
              {portes.map((p) => {
                const Icone = p.icone;
                return (
                  <Link key={p.cle} href={tunnel(p.motif)} className="rfb-porte">
                    <Icone taille={26} />
                    <span>{typo(p.libelle)}</span>
                  </Link>
                );
              })}
            </div>

            <div className="rfb-carte" style={{ marginTop: 22 }}>
              <div className="rfb-parcours">
                {PARCOURS.map((e, i) => (
                  <Fragment key={e.titre}>
                    <div className="rfb-parcours__etape">
                      <span className="rfb-parcours__n" aria-hidden="true">
                        {i + 1}
                      </span>
                      <span>
                        <span className="rfb-h3" style={{ display: "block", fontSize: 16.5 }}>
                          {typo(e.titre)}
                        </span>
                        <span className="rfb-petit" style={{ display: "block", marginTop: 6 }}>
                          {typo(e.desc)}
                        </span>
                      </span>
                    </div>
                    {i < PARCOURS.length - 1 ? (
                      <Fleche taille={20} className="rfb-parcours__fleche" />
                    ) : null}
                  </Fragment>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "center", marginTop: 24 }}>
              <Link href={tunnel()} className="rfb-btn">
                {typo("Rendre mon litige visible")}
                <span className="rfb-btn__carre" aria-hidden="true">
                  <Chevron taille={16} style={{ transform: "rotate(-90deg)" }} />
                </span>
              </Link>
            </div>
          </div>
        </section>

        {/* ── 10. Que faire ? et FAQ ──────────────────────────────────── */}
        <section id="demarches" className="rfb-section" style={{ paddingTop: 0 }}>
          <div className="rfb-conteneur rfb-cols">
            <div>
              <h2 className="rfb-h2" style={{ fontSize: "clamp(19px, 1.3cqw + 7px, 24px)" }}>
                {typo(`Que faire en cas de litige avec ${nom} ?`)}
              </h2>
              <div style={{ marginTop: 16 }}>
                {demarches.map((d) => (
                  <Accordeon key={d.cle} titre={d.titre} resume={d.resume} corps={d.corps} />
                ))}
              </div>
              <Link href={tunnel()} className="rfb-lien" style={{ marginTop: 16 }}>
                {typo("Commencer ma démarche")}
                <Chevron taille={16} style={{ transform: "rotate(-90deg)" }} />
              </Link>

              {/* Le maillage vers les guides : ce sont les seules pages du site
                  qui ne dépendent d'aucune donnée, donc les seules à pouvoir
                  capter du trafic pendant que les fiches attendent le leur. */}
              <p className="rfb-petit" style={{ marginTop: 22 }}>
                Guides détaillés :{" "}
                <Link href="/aide/remboursement-refuse">remboursement refusé</Link>,{" "}
                <Link href="/aide/garantie-refusee">garantie refusée</Link>,{" "}
                <Link href="/aide/commande-non-recue">commande non reçue</Link>,{" "}
                <Link href="/aide/reclamation-ecrite">réclamation écrite</Link>,{" "}
                <Link href="/aide/mediateur">médiation de la consommation</Link>.
              </p>
            </div>

            <div id="faq" style={{ scrollMarginTop: "calc(var(--rfb-collant) + 56px)" }}>
              <h2 className="rfb-h2" style={{ fontSize: "clamp(19px, 1.3cqw + 7px, 24px)" }}>
                {typo(`Questions fréquentes sur ${nom}`)}
              </h2>
              <div style={{ marginTop: 16 }}>
                {questions.map((q) => (
                  <Accordeon key={q.cle} titre={q.q} corps={[q.r]} />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Sources ─────────────────────────────────────────────────────
            L'onglet « Sources » du prototype ouvrait la foire aux questions.
            Un lien intitulé « Consulter les sources » doit mener aux sources :
            les voici, telles qu'elles sont, y compris quand il n'y en a qu'une. */}
        <section id="sources" className="rfb-section rfb-section--bleu">
          <div className="rfb-conteneur">
            <h2 className="rfb-h2">{typo(`Sources et méthode pour ${nom}`)}</h2>
            <div className="rfb-cols" style={{ marginTop: 20 }}>
              <div>
                <ul style={{ display: "grid", gap: 12 }}>
                  <li className="rfb-texte">
                    <strong style={{ color: "var(--b-marine)" }}>{typo("Référentiel des domaines :")}</strong>{" "}
                    {typo(
                      `le domaine ${boutique.domaine} figure dans notre référentiel des boutiques en ligne françaises.`,
                    )}
                    {boutique.derniereActivite
                      ? ` ${typo(`Dernière activité constatée : ${formatDateLongue(boutique.derniereActivite)}.`)}`
                      : ""}
                  </li>
                  {societe ? (
                    <>
                      <li className="rfb-texte">
                        <strong style={{ color: "var(--b-marine)" }}>{typo("Registres publics :")}</strong>{" "}
                        {typo(
                          `répertoire Sirene (Insee), Registre national des entreprises (INPI) et BODACC (DILA) pour ${societe.denomination}${societe.siren ? `, SIREN ${formatSiren(societe.siren)}` : ""}.`,
                        )}
                      </li>
                      <li className="rfb-texte">
                        <strong style={{ color: "var(--b-marine)" }}>{typo("Rattachement du site :")}</strong>{" "}
                        {typo(
                          `${SOURCES[boutique.rattachementSource ?? ""] ?? boutique.rattachementSource ?? "source non précisée"}${boutique.rattachementLe ? `, le ${formatDateLongue(boutique.rattachementLe)}` : ""}.`,
                        )}
                      </li>
                    </>
                  ) : (
                    <li className="rfb-texte">
                      <strong style={{ color: "var(--b-marine)" }}>{typo("Registres publics :")}</strong>{" "}
                      {typo(
                        "aucune personne morale n’a pu être rattachée à ce domaine avec certitude. Aucune société n’est donc citée sur cette fiche.",
                      )}
                    </li>
                  )}
                  <li className="rfb-texte">
                    <strong style={{ color: "var(--b-marine)" }}>{typo("Litiges publiés :")}</strong>{" "}
                    {typo(
                      "déclarations de consommateurs, publiées sous leur responsabilité. Recours France ne vérifie pas le récit des faits.",
                    )}
                  </li>
                </ul>

                <p className="rfb-petit" style={{ marginTop: 18 }}>
                  <Link href="/methodologie">{typo("Méthodologie complète")}</Link> ·{" "}
                  <Link href="/charte-de-moderation">{typo("Charte de modération")}</Link>
                </p>
              </div>

              {voisines.length > 0 ? (
                <div>
                  <h3 className="rfb-h3 rfb-h3--large">
                    {typo(
                      societe
                        ? `Autres sites rattachés à ${societe.denomination}`
                        : `Autres boutiques en ${extension}`,
                    )}
                  </h3>
                  <p className="rfb-petit" style={{ marginTop: 8 }}>
                    {typo(
                      societe
                        ? "Rapprochement issu des registres publics. Ce n’est ni un classement ni une comparaison."
                        : "Rapprochement par extension de domaine uniquement. Ce n’est ni un classement, ni un jugement sur ces boutiques.",
                    )}
                  </p>
                  <ul style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
                    {voisines.map((v) => (
                      <li key={v.slug}>
                        <Link
                          href={`/boutiques/${v.slug}`}
                          style={{
                            display: "inline-flex", alignItems: "center", minHeight: 38,
                            padding: "0 14px", background: "#fff", border: "1px solid var(--b-bordure)",
                            borderRadius: 999, fontSize: 14.5, textDecoration: "none",
                          }}
                        >
                          {v.nom}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        {/* ── 11 bis. Éditeur de la plateforme ≠ entreprise analysée ──────
            Le handoff l'impose, et la fiche de référence en donnait la raison :
            l'éditeur et la boutique analysée peuvent porter des noms voisins.
            Les afficher côte à côte est la seule façon d'écarter la confusion. */}
        <div className="rfb-conteneur" style={{ paddingBottom: "clamp(30px, 3.2cqw, 48px)" }}>
          <div className="rfb-distinguo">
            <div>
              <div className="rfb-distinguo__t">Éditeur de la plateforme</div>
              <p>
                <strong>{EDITEUR.raisonSociale}</strong>
                {siegeSocial() ? (
                  <>
                    <br />
                    {siegeSocial()}
                  </>
                ) : null}
                {EDITEUR.siren ? (
                  <>
                    <br />
                    {typo(`SIREN : ${EDITEUR.siren}`)}
                  </>
                ) : null}
                <br />
                <Link href="/mentions-legales" style={{ color: "#fff", textDecoration: "underline" }}>
                  {typo("Mentions légales")}
                </Link>
              </p>
            </div>
            <div>
              <div className="rfb-distinguo__t">Entreprise faisant l’objet de cette fiche</div>
              <p>
                <strong>{nom}</strong>
                <br />
                {typo(
                  societe
                    ? `Exploitant rattaché : ${societe.denomination}${societe.siren ? `, SIREN ${formatSiren(societe.siren)}` : ""}.`
                    : "Identité de l’exploitant non confirmée à ce jour.",
                )}
                <br />
                {typo("Aucun lien avec l’éditeur de la plateforme.")}
              </p>
            </div>
          </div>
        </div>

        {/* ── 12. Barre d'action collante, écrans étroits ─────────────── */}
        <div className="rfb-barre">
          <Link href={tunnel()} className="rfb-btn rfb-btn--large">
            {typo("Rendre mon litige visible")}
          </Link>
        </div>
      </div>
    </Page>
  );
}
