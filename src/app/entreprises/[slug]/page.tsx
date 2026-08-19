import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { Page } from "@/components/chrome";
import { BarreOnglets } from "@/components/fiche/onglets";
import { Dossiers, type Dossier } from "@/components/fiche/dossiers";
import { Repli, Rubriques } from "@/components/fiche/rubriques";
import { InfoBulle } from "@/components/ui";
import { prisma } from "@/lib/db";
import { chargerEntreprise, detailEntreprise } from "@/lib/fiche";
import { indicesEntreprise } from "@/lib/stats";
import { versDossier } from "@/lib/dossiers";
import { DonneesStructurees, organisationJsonLd } from "@/components/donnees-structurees";
import { mediateurPublie, LISTE_OFFICIELLE } from "@/lib/mediation";
import { Voisines } from "@/components/fiche/voisines";
import {
  cheminCommune,
  cheminDepartement,
  cheminSecteur,
  libelleSecteur,
  nomDepartement,
  voisines,
} from "@/lib/maillage";
import {
  apprecier,
  couleurVerdict,
  couleurVigilance,
  formaterMontantCourt,
  SEUIL_PUBLICATION_EXPERIENCE,
  SEUIL_PUBLICATION_LITIGES,
  litigesPubliables,
} from "@/lib/scoring";
import { construireAlertes, couleurNiveau, estEnRetard, resumerAlertes } from "@/lib/alertes";
import { AVIS_ACTIFS } from "@/lib/config";
import { construireGuide } from "@/lib/demarches";
import { METHODOLOGIE } from "@/lib/contenus";
import {
  adressePostale,
  formatDate,
  formatDateCourte,
  formatDateLongue,
  formatMontant,
  formatNombre,
  formatPourcent,
  formatSiren,
  formatSiret,
  libelleEffectif,
  libelleSourceCourt,
  qualiteDirigeant,
} from "@/lib/format";

export const dynamic = "force-dynamic";

const JOUR = 86_400_000;

const TOUS_ONGLETS = [
  { cle: "synthese", libelle: "Fiche résumé" },
  { cle: "litiges", libelle: "Litiges et dossiers" },
  { cle: "donnees", libelle: "Données publiques" },
  { cle: "recours", libelle: "Médiation et recours" },
  { cle: "avis", libelle: "Avis" },
  { cle: "methodo", libelle: "Méthodologie" },
] as const;

// L'onglet « Avis » disparaît de la barre tant que la fonctionnalité est fermée
// (voir src/lib/config.ts).
const ONGLETS = TOUS_ONGLETS.filter((o) => o.cle !== "avis" || AVIS_ACTIFS);

type CleOnglet = (typeof TOUS_ONGLETS)[number]["cle"];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const entreprise = await prisma.entreprise.findUnique({ where: { slug } });
  if (!entreprise) return { title: "Fiche entreprise" };
  // Les mots du titre sont ceux que les gens tapent — avis, litige,
  // remboursement, service client, médiateur — et non le vocabulaire interne de
  // la plateforme, que personne ne cherche.
  return {
    title: `${entreprise.denomination} : litige, remboursement, médiateur`,
    description: `Un problème avec ${entreprise.denomination} ? Coordonnées du service client, médiateur compétent, délais légaux et démarches à suivre. Déclarations de consommateurs et données publiques (SIREN ${formatSiren(entreprise.siren)}).`,
    alternates: { canonical: `/entreprises/${slug}` },
  };
}

export default async function FicheEntreprise({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const onglet: CleOnglet = ONGLETS.some((o) => o.cle === query.onglet)
    ? (query.onglet as CleOnglet)
    : "synthese";
  const rubriqueInitiale = typeof query.rubrique === "string" ? query.rubrique : null;

  const base = await chargerEntreprise(slug);
  if (!base) notFound();
  if (base.slug !== slug) redirect(`/entreprises/${base.slug}`);

  const [{ entreprise, etablissements, evenements, comptes }, calcul] = await Promise.all([
    detailEntreprise(base.id),
    indicesEntreprise(base.id),
  ]);
  if (!entreprise || !calcul) notFound();
  const { transparence, experience, stats } = calcul;

  await prisma.entreprise.update({ where: { id: entreprise.id }, data: { vues: { increment: 1 } } });

  const [signalements, avisPublies, nbAvisNonVerifies, totalDossiers, notesVerifiees] = await Promise.all([
    prisma.signalement.findMany({
      where: { entrepriseId: entreprise.id, moderation: "PUBLIE" },
      orderBy: { creeLe: "desc" },
      take: 5,
    }),
    prisma.avis.findMany({
      where: { entrepriseId: entreprise.id, moderation: "PUBLIE", verifie: true },
      orderBy: { publieLe: "desc" },
      include: { signalement: { select: { reference: true, resolutionConfirmee: true } } },
      take: 2,
    }),
    prisma.avis.count({ where: { entrepriseId: entreprise.id, moderation: "PUBLIE", verifie: false } }),
    prisma.signalement.count({ where: { entrepriseId: entreprise.id, moderation: "PUBLIE" } }),
    prisma.avis.findMany({
      where: { entrepriseId: entreprise.id, moderation: "PUBLIE", verifie: true },
      select: { note: true },
    }),
  ]);

  const moyenne = notesVerifiees.length
    ? notesVerifiees.reduce((t, a) => t + a.note, 0) / notesVerifiees.length
    : null;

  const alertes = construireAlertes({
    entreprise: {
      denomination: entreprise.denomination,
      etatAdministratif: entreprise.etatAdministratif,
      dateImmatriculation: entreprise.dateImmatriculation,
      dateCessation: entreprise.dateCessation,
      commune: entreprise.commune,
    },
    comptes: comptes.map((c) => ({
      exercice: c.exercice,
      dateCloture: c.dateCloture,
      dateDepot: c.dateDepot,
      confidentiel: c.confidentiel,
    })),
    evenements: evenements.map((e) => ({
      date: e.date,
      source: e.source,
      titre: e.titre,
      detail: e.detail,
      categorie: e.categorie,
      procedureCollective: e.procedureCollective,
    })),
    stats,
    ouverts: stats.ouverts,
  });

  const anneeCourante = new Date().getFullYear();
  const comptesRecents = comptes.filter((c) =>
    [anneeCourante - 1, anneeCourante - 2, anneeCourante - 3].includes(c.exercice),
  );
  const anciennete = entreprise.dateImmatriculation
    ? Math.floor((Date.now() - entreprise.dateImmatriculation.getTime()) / (365.25 * JOUR))
    : null;

  const appreciation = apprecier({
    transparence,
    experience,
    stats: {
      verifies: stats.verifies,
      clotures: stats.clotures,
      tauxReponse: stats.tauxReponse,
      tauxResolution: stats.tauxResolution,
      tauxNonResolus: stats.tauxNonResolus,
      delaiMedian: stats.delaiMedian,
    },
    anciennete,
    procedures: evenements.filter((e) => e.procedureCollective).length,
    evenements3Ans: evenements.filter((e) => Date.now() - e.date.getTime() < 3 * 365.25 * JOUR).length,
    exercicesDeposes: comptesRecents.filter((c) => c.dateDepot !== null).length,
    exercicesEnRetard: comptesRecents.filter((c) => estEnRetard(c)).length,
    chiffreAffaires: comptes.slice(0, 3).map((c) => ({
      exercice: c.exercice,
      valeur: c.chiffreAffaires ? Number(c.chiffreAffaires) : null,
      resultat: c.resultatNet ? Number(c.resultatNet) : null,
    })),
    alertesElevees: alertes.filter((a) => a.niveau === "elevee").length,
    alertesSurveiller: alertes.filter((a) => a.niveau === "surveiller").length,
  });

  const dossiers: Dossier[] = signalements.map(versDossier);

  // Le médiateur n'est publié que s'il figure dans les CGV de l'entreprise. Un
  // organisme déduit du secteur serait plausible et faux — la vente en ligne
  // en compte vingt et un — et une saisine mal adressée consomme le délai de
  // deux mois du consommateur.
  const mediateurDeclare = mediateurPublie(entreprise);

  // La fiche boutique et la fiche entreprise décrivent le même commerçant sous
  // deux angles : sans lien entre elles, chacune serait un cul-de-sac.
  const boutique = await prisma.boutique.findFirst({
    where: { entrepriseId: entreprise.id },
    select: { slug: true, domaine: true },
  });

  // Entreprises comparables : ce sont elles qui relient la fiche au reste de
  // l'annuaire. Sans ce voisinage, chaque fiche resterait un cul-de-sac.
  const proches = await voisines(entreprise);

  const guide = construireGuide({
    categorie: "AUTRE",
    contactPrealable: "AUCUN",
    dateSignalement: new Date(),
    reference: "—",
    verifie: false,
    mediateur: mediateurDeclare,
  });

  // Les six sections sont désormais rendues ensemble : les onglets deviennent
  // des ancres dans la page. Auparavant chaque onglet portait sa propre URL,
  // soit cinq adresses par entreprise — soixante-cinq millions à explorer pour
  // treize millions de fiches — dont quatre étaient ensuite rabattues sur la
  // canonique, qui n'en montrait qu'un cinquième du contenu.
  const lien = (cle: CleOnglet) => `#${cle}`;
  // La rubrique reste un vrai paramètre : elle décide du volet ouvert dans
  // l'accordéon des données publiques.
  const lienEtablissements = `?rubrique=etablissements#donnees`;

  // Sous le seuil, la fiche n'affiche AUCUNE donnée de litige : ni compteur, ni
  // taux, ni répartition, ni dossier. Un signalement isolé n'a aucune valeur
  // statistique et publier l'accusation seule serait le pire des compromis.
  const publierLitiges = litigesPubliables(stats.total12Mois);

  const dernierCompte = comptes.find((c) => c.chiffreAffaires !== null) ?? comptes[0];
  const etablissementsOuverts =
    entreprise.nombreEtablissementsOuverts || etablissements.filter((e) => e.actif).length;

  const faits = [
    { cle: "Forme juridique", valeur: entreprise.formeJuridique ?? "Non renseignée", source: "Sirene" },
    {
      cle: "Immatriculée le",
      valeur: formatDateLongue(entreprise.dateImmatriculation),
      source: anciennete !== null ? `Ancienneté : ${anciennete} ans` : "Sirene",
    },
    {
      cle: dernierCompte ? `Chiffre d’affaires ${dernierCompte.exercice}` : "Chiffre d’affaires",
      valeur: dernierCompte?.chiffreAffaires
        ? formaterMontantCourt(Number(dernierCompte.chiffreAffaires))
        : "Non publié",
      source: dernierCompte?.chiffreAffaires ? "Comptes déposés" : "Aucun dépôt exploitable",
    },
    {
      cle: dernierCompte ? `Résultat net ${dernierCompte.exercice}` : "Résultat net",
      valeur: dernierCompte?.resultatNet
        ? `${Number(dernierCompte.resultatNet) >= 0 ? "+ " : "− "}${formaterMontantCourt(Math.abs(Number(dernierCompte.resultatNet)))}`
        : "Non publié",
      source: dernierCompte?.resultatNet ? "Comptes déposés" : "Aucun dépôt exploitable",
    },
    {
      cle: "Effectif",
      valeur: libelleEffectif(entreprise.trancheEffectif).replace(" (tranche Insee)", ""),
      source: "Sirene",
    },
    {
      cle: "Siège",
      valeur: entreprise.commune ? `${entreprise.commune} (${entreprise.departement ?? ""})` : "Non renseigné",
      source: "Sirene",
    },
    {
      cle: "Établissements",
      valeur: `${formatNombre(etablissementsOuverts)} actif${etablissementsOuverts > 1 ? "s" : ""}`,
      source: "Sirene",
    },
    {
      cle: "Procédure collective",
      valeur: evenements.some((e) => e.procedureCollective) ? "Publiée" : "Aucune",
      source: "BODACC",
    },
  ];

  const identite = [
    { cle: "Dénomination sociale", valeur: entreprise.denomination },
    { cle: "Nom commercial", valeur: entreprise.enseigne ?? "Non déclaré" },
    { cle: "SIREN", valeur: formatSiren(entreprise.siren) },
    { cle: "SIRET du siège", valeur: formatSiret(entreprise.siretSiege) },
    { cle: "Forme juridique", valeur: entreprise.formeJuridique ?? "Non renseignée" },
    {
      cle: "Code NAF/APE",
      valeur: entreprise.naf ? `${entreprise.naf} — ${entreprise.nafLibelle ?? ""}` : "Non renseigné",
    },
    { cle: "Date d’immatriculation", valeur: formatDateLongue(entreprise.dateImmatriculation) },
    {
      cle: "Capital social",
      valeur: entreprise.capital ? formatMontant(Number(entreprise.capital)) : "Non publié",
    },
    { cle: "Effectif déclaré", valeur: libelleEffectif(entreprise.trancheEffectif) },
    { cle: "Adresse du siège", valeur: adressePostale(entreprise) ?? "Non renseignée" },
    { cle: "Greffe", valeur: entreprise.greffe ?? "Non renseigné" },
    { cle: "État administratif", valeur: entreprise.etatAdministratif === "ACTIVE" ? "Active" : "Cessée" },
    { cle: "Numéro de TVA", valeur: entreprise.numeroTva ?? "Non publié" },
    { cle: "Dernière mise à jour Sirene", valeur: formatDate(entreprise.syncSirene) },
  ];

  const maxMotif = Math.max(1, ...stats.motifs.map((m) => m.pourcentage));
  const couleurBarre = (i: number) =>
    i < 2 ? "var(--rfi-barre-1)" : i < 4 ? "var(--rfi-barre-2)" : "var(--rfi-barre-3)";

  return (
    <Page
      habillage="institutionnel"
      entete={{ baseline: "Signalement des litiges de consommation" }}
      fil={[
        { libelle: "Annuaire", href: "/annuaire" },
        ...(entreprise.secteur
          ? [{ libelle: libelleSecteur(entreprise.secteur), href: cheminSecteur(entreprise.secteur) }]
          : []),
        ...(entreprise.secteur && entreprise.departement && nomDepartement(entreprise.departement)
          ? [
              {
                libelle: nomDepartement(entreprise.departement)!,
                href: cheminDepartement(entreprise.secteur, entreprise.departement) ?? undefined,
              },
            ]
          : []),
        ...(entreprise.secteur && entreprise.departement && entreprise.commune
          ? [
              {
                libelle: entreprise.commune,
                href: cheminCommune(entreprise.secteur, entreprise.departement, entreprise.commune) ?? undefined,
              },
            ]
          : []),
        { libelle: entreprise.denomination },
      ]}
    >
      {/* ── En-tête entreprise ────────────────────────────────────────────── */}
      <div className="rfi-conteneur" style={{ padding: "30px 32px 0" }}>
        <div
          className="rfi-entete-entreprise"
          style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 36, alignItems: "start" }}
        >
          <div style={{ minWidth: 0 }}>
            <DonneesStructurees
              donnees={organisationJsonLd({
                nom: entreprise.denomination,
                siren: entreprise.siren,
                url: `/entreprises/${slug}`,
                siteWeb: entreprise.siteWeb,
                adresse: entreprise.adresseSiege,
                codePostal: entreprise.codePostal,
                commune: entreprise.commune,
                telephone: entreprise.telephoneReclamation,
                email: entreprise.emailReclamation,
              })}
            />
            <h1 className="rfi-titre">
              {entreprise.denomination}
              <span className="rfi-titre__suite"> — litige, réclamation et recours</span>
            </h1>
            <div className="rfi-identification">
              <span className="rfi-jeton">Unité légale</span>
              <span aria-hidden="true" style={{ color: "var(--rf-texte-desactive)" }}>
                ›
              </span>
              <span className="rf-nombres" style={{ fontSize: 15, fontWeight: 500 }}>
                {formatSiren(entreprise.siren)}
              </span>
              <span
                className={`rfi-marqueur ${entreprise.etatAdministratif === "ACTIVE" ? "rfi-marqueur--actif" : "rfi-marqueur--cesse"}`}
              >
                {entreprise.etatAdministratif === "ACTIVE" ? "EN ACTIVITÉ" : "CESSÉE"}
              </span>
              <span className="rfi-marqueur rfi-marqueur--verifie">IDENTITÉ VÉRIFIÉE</span>
            </div>
            <div className="rfi-arbre">
              <span className="rfi-arbre__coude" aria-hidden="true" />
              <Link href={lienEtablissements} style={{ fontSize: 14 }}>
                {formatNombre(etablissementsOuverts)} établissement{etablissementsOuverts > 1 ? "s" : ""}
              </Link>
            </div>
          </div>
          <div style={{ minWidth: 230 }}>
            <Link href={`/signaler?siren=${entreprise.siren}`} className="rfi-bouton">
              Signaler un litige
            </Link>
            <div className="rfi-source" style={{ textAlign: "center", marginTop: 7 }}>
              Gratuit · 3 à 5 minutes
            </div>
            <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 14, fontSize: 12.5 }}>
              <a href={`/api/entreprises/${entreprise.siren}`} style={{ textDecoration: "none" }}>
                Partager
              </a>
              <a href={`/entreprises/${slug}/fiche.pdf`} style={{ textDecoration: "none" }}>
                Imprimer
              </a>
              <Link href={`/entreprises/${slug}/suivre`} style={{ textDecoration: "none" }}>
                Suivre
              </Link>
            </div>
          </div>
        </div>

        {/* Paragraphe de synthèse, en prose */}
        <p className="rfi-synthese" style={{ marginTop: 26 }}>
          {phraseIdentite(entreprise, anciennete)}
        </p>
        <p className="rfi-synthese">
          Son <Link href={lienEtablissements}>siège social</Link> est domicilié au{" "}
          <Link href={lienEtablissements}>{(adressePostale(entreprise) ?? "adresse non publiée").toUpperCase()}</Link>.
          {etablissementsOuverts > 1 ? (
            <>
              {" "}
              Elle possède{" "}
              <Link href={lienEtablissements}>{formatNombre(etablissementsOuverts)} établissements</Link>.
            </>
          ) : null}{" "}
          {publierLitiges ? (
            <>
              <strong>
                {formatNombre(stats.total12Mois)} dossier{stats.total12Mois > 1 ? "s" : ""}
              </strong>{" "}
              de litige {stats.total12Mois > 1 ? "ont" : "a"} été enregistré{stats.total12Mois > 1 ? "s" : ""} sur
              Recours France au cours des douze derniers mois, dont{" "}
              <strong>
                {formatNombre(stats.enCours)} {stats.enCours > 1 ? "sont encore en cours" : "est encore en cours"}
              </strong>
              .
            </>
          ) : (
            <>Aucun dossier de litige n’a été enregistré sur Recours France au cours des douze derniers mois.</>
          )}
        </p>
        <p className="rfi-source" style={{ marginTop: 14, fontSize: 12.5 }}>
          Données publiques mises à jour le {formatDateLongue(entreprise.syncSirene ?? entreprise.majLe)} — Sirene,
          RNE/INPI, BODACC.
        </p>
      </div>

      {/* ── Barre d'onglets ───────────────────────────────────────────────── */}
      <BarreOnglets
        onglets={ONGLETS.map((o) => ({ cle: o.cle, libelle: o.libelle, href: lien(o.cle) }))}
        actif={onglet}
      />

      {/* ── Onglet : fiche résumé ─────────────────────────────────────────── */}
      <section id="synthese">
        <div className="rfi-conteneur" style={{ padding: "26px 32px 8px" }}>
          <section className="rfi-bloc">
            <div className="rfi-bloc__tete">
              <h2 className="rfi-pastille-titre">Litiges et signalements concernant {entreprise.denomination}</h2>
              <span className="rfi-source">Source : dossiers enregistrés · déclarations des consommateurs</span>
            </div>
            <p className="rfi-chapo">
              Données issues des dossiers enregistrés sur Recours France et des justificatifs transmis par les
              consommateurs, sur les douze derniers mois. Les dossiers sans justificatif sont comptés dans le volume
              mais exclus de tous les taux.
            </p>

            <p
              className="rfi-chapo"
              style={{
                marginTop: 16,
                paddingTop: 14,
                borderTop: "1px solid var(--rfi-bordure-bloc)",
                fontSize: 13.5,
              }}
            >
              Les informations relatives aux litiges sont <strong>déclarées par les utilisateurs</strong>.
              Recours France distingue les déclarations sans pièce, celles comportant une pièce justificative
              et celles dont la nature de la pièce a été contrôlée. <strong>L’existence d’une déclaration ne
              constitue pas une constatation de faute du professionnel.</strong> Toute entreprise peut
              contester une déclaration.
            </p>

            {!publierLitiges ? (
              <div className="rfi-ouverture" style={{ marginTop: 20, paddingTop: 20 }}>
                <p style={{ fontSize: 16, fontWeight: 600 }}>
                  {stats.total12Mois === 0
                    ? "Aucun dossier enregistré sur cette entreprise."
                    : "Trop peu de dossiers pour publier des données de litige."}
                </p>
                <p className="rfi-chapo" style={{ marginTop: 8 }}>
                  {stats.total12Mois === 0
                    ? "Les points de vigilance ci-dessous reposent uniquement sur les registres publics."
                    : `Aucune donnée de litige n’est publiée en dessous de ${SEUIL_PUBLICATION_LITIGES} dossiers sur douze mois : en dessous de ce volume, un chiffre ne dit rien de fiable sur une entreprise. Les points de vigilance ci-dessous reposent uniquement sur les registres publics.`}
                </p>
              </div>
            ) : (
              <>
                <div className="rfi-chiffres">
                  <Chiffre
                    id="resolution"
                    valeur={stats.tauxResolution === null ? "—" : formatPourcent(stats.tauxResolution)}
                    libelle="de résolution confirmée"
                    base={`base : ${stats.clotures} dossier${stats.clotures > 1 ? "s" : ""} clôturé${stats.clotures > 1 ? "s" : ""}`}
                    aide="Part des dossiers accompagnés d’un justificatif et clôturés dont la résolution a été confirmée par le consommateur. Un abandon ou une absence de retour n’est jamais compté comme résolu."
                  />
                  <Chiffre
                    id="total"
                    valeur={formatNombre(stats.total12Mois)}
                    libelle="déclarations enregistrées"
                    base="12 derniers mois, avec ou sans justificatif"
                    aide="Total des signalements déposés par des consommateurs sur les douze derniers mois. Un dossier par consommateur et par litige."
                  />
                  <Chiffre
                    id="verifies"
                    valeur={formatNombre(stats.verifies)}
                    libelle="comportant au moins une pièce"
                    base="pièce fournie, horodatée et scellée"
                    aide="Dossiers accompagnés d’une pièce déposée par le consommateur — facture, commande, contrat ou preuve de paiement — horodatée et scellée. Seule base des taux publiés. La pièce n’est examinée qu’en cas de contestation."
                  />
                  <Chiffre
                    id="encours"
                    valeur={formatNombre(stats.enCours)}
                    libelle="litiges en cours"
                    base={`dont ${stats.ouverts.filter((o) => o.jours > 30).length} ouverts depuis plus de 30 jours`}
                    aide="Dossiers accompagnés d’un justificatif et non clôturés à ce jour, quel que soit leur statut déclaré."
                    couleur={stats.ouverts.filter((o) => o.jours > 30).length ? "var(--rfi-ambre)" : undefined}
                  />
                  <Chiffre
                    id="delai"
                    valeur={stats.delaiMedian === null ? "—" : `${stats.delaiMedian} j`}
                    libelle="de délai médian de résolution"
                    base="médiane déclarée, dossiers résolus"
                    aide="Délai médian déclaré entre le dépôt du dossier et la confirmation de résolution. La médiane évite l’effet des cas extrêmes."
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 20,
                    flexWrap: "wrap",
                    paddingTop: 12,
                    fontSize: 12.5,
                    color: "var(--rf-texte-3)",
                  }}
                >
                  <span>
                    Évolution sur 90 jours :{" "}
                    {stats.evolution90j === null ? (
                      <strong style={{ fontWeight: 600 }}>base insuffisante</strong>
                    ) : (
                      <strong
                        style={{
                          color: stats.evolution90j > 0 ? "var(--rfi-ambre)" : "var(--rfi-vert)",
                          fontWeight: 600,
                        }}
                      >
                        {stats.evolution90j > 0 ? "+ " : "− "}
                        {Math.abs(Math.round(stats.evolution90j))} % de nouveaux signalements
                      </strong>
                    )}{" "}
                    par rapport au trimestre précédent.
                  </span>
                  <Link href={lien("litiges")} style={{ fontSize: 12.5, fontWeight: 600 }}>
                    Consulter les dossiers →
                  </Link>
                </div>
              </>
            )}
          </section>

          <section className="rfi-bloc">
            <div className="rfi-bloc__tete">
              <h2 className="rfi-pastille-titre">Points de vigilance relevés</h2>
              <span className="rfi-source">{resumerAlertes(alertes)}</span>
            </div>
            <div className="rfi-ouverture" style={{ marginTop: 18 }}>
              {alertes.length === 0 ? (
                <p className="rfi-legende" style={{ padding: "18px 0" }}>
                  Aucun point de vigilance relevé à ce jour sur les sources consultées.
                </p>
              ) : (
                alertes.map((a) => (
                  <div key={a.titre} className="rfi-alerte">
                    <div className="rfi-alerte__niveau" style={{ color: couleurNiveau(a.niveau) }}>
                      <span
                        className="rfi-alerte__carre"
                        style={{ background: couleurNiveau(a.niveau) }}
                        aria-hidden="true"
                      />
                      <span>{a.libelle}</span>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 15.5, fontWeight: 600, lineHeight: 1.4 }}>{a.titre}</div>
                      <p style={{ fontSize: 13.5, color: "var(--rf-texte-2)", lineHeight: 1.6, marginTop: 5 }}>
                        {a.description}
                      </p>
                    </div>
                    <div className="rfi-source" style={{ textAlign: "right" }}>
                      {a.source}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rfi-bloc">
            <h2 className="rfi-pastille-titre">Appréciation générale de Recours France</h2>
            <div
              className="rfi-deux-colonnes--large"
              style={{ display: "grid", gap: 40, marginTop: 20, alignItems: "start" }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 21, fontWeight: 700, letterSpacing: "-0.015em" }}>
                  Niveau de vigilance :{" "}
                  <span style={{ color: couleurVigilance(appreciation.niveauVigilance) }}>
                    {appreciation.niveauVigilance}
                  </span>
                </div>
                <div style={{ fontSize: 15, marginTop: 10 }}>{resumerAlertes(alertes)}.</div>
                <p
                  style={{ fontSize: 13.5, color: "var(--rf-texte-2)", lineHeight: 1.65, marginTop: 8, maxWidth: 620 }}
                >
                  {appreciation.commentaire}
                </p>
                <div style={{ paddingTop: 14 }}>
                  <Repli variante="lien" libelleFerme="Consulter les critères →" libelleOuvert="Masquer les critères">
                    <div style={{ marginTop: 22 }}>
                      <div className="rfi-tete-tableau">
                        <span style={{ flex: "1 1 260px" }}>Critère</span>
                        <span style={{ flex: "1 1 320px" }}>Constat</span>
                        <span style={{ flex: "none", width: 110, textAlign: "right" }}>Appréciation</span>
                      </div>
                      {appreciation.criteres.map((c) => (
                        <div
                          key={c.cle}
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "8px 20px",
                            borderBottom: "1px solid var(--rfi-filet-ligne)",
                            padding: "14px 0",
                            alignItems: "baseline",
                          }}
                        >
                          <span style={{ flex: "1 1 260px", fontSize: 14.5, fontWeight: 600 }}>{c.libelle}</span>
                          <span
                            style={{ flex: "1 1 320px", fontSize: 13.5, color: "var(--rf-texte-2)", lineHeight: 1.6 }}
                          >
                            {c.constat}
                          </span>
                          <span
                            style={{
                              flex: "none",
                              width: 110,
                              textAlign: "right",
                              fontSize: 13.5,
                              fontWeight: 600,
                              color: couleurVerdict(c.verdict),
                            }}
                          >
                            {c.verdict}
                          </span>
                        </div>
                      ))}
                      <p className="rfi-legende" style={{ marginTop: 12 }}>
                        Trois critères reposent sur les registres publics, deux sur les dossiers avec justificatif et les
                        déclarations des consommateurs.
                      </p>
                    </div>
                  </Repli>
                </div>
              </div>
              <div style={{ minWidth: 0, borderLeft: "1px solid var(--rfi-filet)", paddingLeft: 22 }}>
                <div className="rfi-etiquette" style={{ fontSize: 12 }}>
                  Indice de confiance
                </div>
                <div className="rf-nombres" style={{ fontSize: 15, marginTop: 8 }}>
                  {appreciation.indice}/100 — {appreciation.bande}
                </div>
                <p className="rfi-legende" style={{ marginTop: 8 }}>
                  Recalculé chaque jour. Un dossier sans justificatif ne fait pas varier cet indice.
                  {appreciation.comportementPublie
                    ? ""
                    : ` Faute de ${SEUIL_PUBLICATION_EXPERIENCE} dossiers avec justificatif sur douze mois, il repose ici sur les seuls registres publics.`}
                </p>
                <div style={{ paddingTop: 10 }}>
                  <Link href={lien("methodo")} style={{ fontSize: 12.5 }}>
                    Méthodologie de calcul
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </div>
      </section>

      {/* ── Onglet : litiges et dossiers ──────────────────────────────────── */}
      <section id="litiges">
        <div className="rfi-conteneur" style={{ padding: "26px 32px 8px" }}>
          <section className="rfi-bloc">
            <div className="rfi-bloc__tete">
              <h2 className="rfi-pastille-titre">Déclarations enregistrées sur Recours France</h2>
              <span className="rfi-source">
                {publierLitiges
                  ? `${formatNombre(stats.total12Mois)} déclaration${stats.total12Mois > 1 ? "s" : ""} · ${formatNombre(stats.verifies)} comportant au moins une pièce`
                  : "Volume insuffisant pour publication"}
              </span>
            </div>

            <p
              className="rfi-chapo"
              style={{
                marginTop: 16,
                paddingTop: 14,
                borderTop: "1px solid var(--rfi-bordure-bloc)",
                fontSize: 13.5,
              }}
            >
              Les informations relatives aux litiges sont <strong>déclarées par les utilisateurs</strong>.
              Recours France distingue les déclarations sans pièce, celles comportant une pièce justificative
              et celles dont la nature de la pièce a été contrôlée. <strong>L’existence d’une déclaration ne
              constitue pas une constatation de faute du professionnel.</strong> Toute entreprise peut
              contester une déclaration.
            </p>

            {!publierLitiges ? (
              <div className="rfi-ouverture" style={{ marginTop: 20, paddingTop: 20 }}>
                <p style={{ fontSize: 16, fontWeight: 600 }}>
                  {stats.total12Mois === 0
                    ? "Aucun dossier enregistré sur cette entreprise."
                    : "Trop peu de dossiers pour publier des données de litige."}
                </p>
                <p className="rfi-chapo" style={{ marginTop: 8 }}>
                  {stats.total12Mois === 0
                    ? `Si vous rencontrez un litige avec ${entreprise.denomination}, vous pouvez le signaler gratuitement : trois à cinq minutes, sans création de compte.`
                    : `Aucun dossier n’est publié en dessous de ${SEUIL_PUBLICATION_LITIGES} sur douze mois. Les dossiers déjà déposés sont bien enregistrés et suivis par leurs auteurs ; ils seront publiés lorsque ce volume sera atteint.`}
                </p>
              </div>
            ) : (
              <div className="rfi-deux-colonnes" style={{ marginTop: 22 }}>
                <Dossiers
                  slug={slug}
                  dossiers={dossiers}
                  total={totalDossiers}
                  lienTous={`/entreprises/${slug}/dossiers`}
                />

                <div style={{ minWidth: 0 }}>
                  <div className="rfi-ouverture" style={{ paddingTop: 14 }}>
                    <h3 className="rfi-h3 rfi-h3--petit">Motifs déclarés</h3>
                    <div className="rfi-source" style={{ marginTop: 4 }}>
                      Répartition sur {formatNombre(stats.total12Mois)} dossiers
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
                      {stats.motifs.map((m, i) => (
                        <div key={m.cle}>
                          <div
                            style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}
                          >
                            <span style={{ fontSize: 13.5 }}>{m.libelle}</span>
                            <span className="rf-nombres" style={{ fontSize: 13, color: "var(--rf-texte-2)" }}>
                              {m.pourcentage} %
                            </span>
                          </div>
                          <div className="rfi-barre">
                            <span
                              style={{
                                width: `${Math.round((m.pourcentage / maxMotif) * 100)}%`,
                                background: couleurBarre(i),
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rfi-ouverture--legere" style={{ marginTop: 24, paddingTop: 16 }}>
                    <h3 className="rfi-h3 rfi-h3--petit">Deux niveaux de fiabilité</h3>
                    <div style={{ marginTop: 14 }}>
                      <span className="rfi-badge rfi-badge--verifie">✓ Justificatif déposé</span>
                      <p style={{ fontSize: 12.5, color: "var(--rf-texte-2)", lineHeight: 1.6, marginTop: 8 }}>
                        Facture, commande ou preuve de paiement déposée par le consommateur, horodatée et
                        scellée. Seuls ces dossiers
                        entrent dans les taux publiés.
                      </p>
                    </div>
                    <div style={{ marginTop: 16 }}>
                      <span className="rfi-badge rfi-badge--neutre">Sans justificatif</span>
                      <p style={{ fontSize: 12.5, color: "var(--rf-texte-2)", lineHeight: 1.6, marginTop: 8 }}>
                        Déclaration sans pièce. Comptée dans le volume, exclue de tous les taux.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </section>

      {/* ── Onglet : données publiques ────────────────────────────────────── */}
      <section id="donnees">
        <div className="rfi-conteneur" style={{ padding: "26px 32px 8px" }}>
          <section className="rfi-bloc">
            <div className="rfi-bloc__tete">
              <h2 className="rfi-pastille-titre">Informations légales de {entreprise.denomination}</h2>
              <span className="rfi-source">Sources : Insee · INPI · BODACC</span>
            </div>

            <div className="rfi-faits">
              {faits.map((f) => (
                <div key={f.cle} className="rfi-fait">
                  <div className="rfi-etiquette">{f.cle}</div>
                  <div className="rfi-fait__valeur">{f.valeur}</div>
                  <div className="rfi-source" style={{ fontSize: 11.5, marginTop: 4 }}>
                    {f.source}
                  </div>
                </div>
              ))}
            </div>

            <Rubriques
              initiale={rubriqueInitiale}
              rubriques={[
                {
                  cle: "comptes",
                  titre: "Comptes annuels et résultats",
                  indice: comptes.length
                    ? `${comptes.length} exercice${comptes.length > 1 ? "s" : ""} connu${comptes.length > 1 ? "s" : ""}, avec dates de dépôt`
                    : "Aucun dépôt trouvé au BODACC",
                  contenu: comptes.length ? (
                    <div>
                      <div className="rfi-tete-tableau">
                        <span style={{ flex: "1 1 90px" }}>Exercice</span>
                        <span style={{ flex: "1 1 130px", textAlign: "right" }}>Chiffre d’affaires</span>
                        <span style={{ flex: "1 1 120px", textAlign: "right" }}>Résultat net</span>
                        <span style={{ flex: "1 1 170px", textAlign: "right" }}>Dépôt au greffe</span>
                      </div>
                      {comptes.slice(0, 6).map((c) => {
                        const retard = estEnRetard(c);
                        return (
                          <div key={c.exercice} className="rfi-ligne-tableau">
                            <span style={{ flex: "1 1 90px", fontWeight: 600 }}>{c.exercice}</span>
                            <span className="rf-nombres" style={{ flex: "1 1 130px", textAlign: "right" }}>
                              {c.chiffreAffaires ? formaterMontantCourt(Number(c.chiffreAffaires)) : "—"}
                            </span>
                            <span className="rf-nombres" style={{ flex: "1 1 120px", textAlign: "right" }}>
                              {c.resultatNet
                                ? `${Number(c.resultatNet) >= 0 ? "+ " : "− "}${formaterMontantCourt(Math.abs(Number(c.resultatNet)))}`
                                : "—"}
                            </span>
                            <span
                              style={{
                                flex: "1 1 170px",
                                textAlign: "right",
                                fontSize: 12.5,
                                color: retard ? "var(--rfi-ambre)" : "var(--rf-texte-3)",
                              }}
                            >
                              {c.dateDepot ? formatDate(c.dateDepot) : "dépôt non trouvé"}
                              {retard ? " — en retard" : ""}
                              {c.confidentiel ? " — confidentiel" : ""}
                            </span>
                          </div>
                        );
                      })}
                      <p className="rfi-legende" style={{ marginTop: 12 }}>
                        Montants issus des comptes annuels déposés au greffe et publiés au BODACC. Le dépôt est dû
                        dans les sept mois suivant la clôture de l’exercice.
                      </p>
                    </div>
                  ) : (
                    <p className="rfi-legende">
                      Aucun dépôt de comptes annuels n’a été trouvé dans les annonces BODACC consultées.
                    </p>
                  ),
                },
                {
                  cle: "dirigeants",
                  titre: "Dirigeants et capital",
                  indice: "Fonction du représentant légal, capital social",
                  contenu: (
                    <>
                      <div className="rfi-grille" style={{ gap: "0 44px" }}>
                        <div>
                          <Paire
                            cle="Représentant légal"
                            valeur={qualiteDirigeant(entreprise.representantLegal) ?? "Non publié"}
                          />
                          <Paire
                            cle="Capital social"
                            valeur={entreprise.capital ? formatMontant(Number(entreprise.capital)) : "Non publié"}
                          />
                          <Paire cle="Forme juridique" valeur={entreprise.formeJuridique ?? "Non renseignée"} />
                        </div>
                        <div>
                          <Paire cle="Greffe compétent" valeur={entreprise.greffe ?? "Non renseigné"} />
                          <Paire cle="Numéro de TVA" valeur={entreprise.numeroTva ?? "Non publié"} />
                          <Paire
                            cle="Dernière mise à jour RNE"
                            valeur={entreprise.syncRne ? formatDate(entreprise.syncRne) : "Source non connectée"}
                          />
                        </div>
                      </div>
                      <p className="rfi-legende" style={{ marginTop: 14 }}>
                        Le nom des personnes physiques dirigeantes n’est pas publié sur cette fiche. Source : RNE /
                        INPI.
                      </p>
                    </>
                  ),
                },
                {
                  cle: "etablissements",
                  titre: "Siège et établissements",
                  indice: `${formatNombre(etablissementsOuverts)} établissement${etablissementsOuverts > 1 ? "s" : ""} actif${etablissementsOuverts > 1 ? "s" : ""}, dont le siège`,
                  contenu: (
                    <>
                      <div className="rfi-grille" style={{ gap: "0 44px" }}>
                        <div>
                          <Paire cle="Siège social" valeur={adressePostale(entreprise) ?? "Non renseigné"} />
                          <Paire cle="SIRET du siège" valeur={formatSiret(entreprise.siretSiege)} />
                          <Paire cle="Greffe compétent" valeur={entreprise.greffe ?? "Non renseigné"} />
                        </div>
                        <div>
                          {etablissements
                            .filter((e) => !e.estSiege)
                            .slice(0, 6)
                            .map((e) => (
                              <Paire
                                key={e.siret}
                                cle={e.actif ? "Établissement actif" : "Établissement fermé"}
                                valeur={`${e.commune ?? "Commune inconnue"}${e.departement ? ` (${e.departement})` : ""}${
                                  e.dateCreation ? ` — depuis ${e.dateCreation.getFullYear()}` : ""
                                }`}
                              />
                            ))}
                          {etablissements.filter((e) => !e.estSiege).length === 0 ? (
                            <Paire
                              cle="Autres établissements"
                              valeur={`${formatNombre(Math.max(0, entreprise.nombreEtablissements - 1))} recensés au répertoire`}
                            />
                          ) : null}
                        </div>
                      </div>
                      <p className="rfi-legende" style={{ marginTop: 14 }}>
                        Adresses issues du répertoire Sirene, mises à jour le {formatDate(entreprise.syncSirene)}.
                        Source : Sirene (Insee).
                      </p>
                    </>
                  ),
                },
                {
                  cle: "historique",
                  titre: "Historique juridique",
                  indice: `${evenements.length} événement${evenements.length > 1 ? "s" : ""} enregistré${evenements.length > 1 ? "s" : ""}`,
                  contenu: evenements.length ? (
                    <div>
                      {evenements.slice(0, 12).map((e) => (
                        <div
                          key={e.id}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "minmax(96px,110px) minmax(0,1fr) minmax(70px,90px)",
                            gap: 20,
                            padding: "13px 0",
                            borderBottom: "1px solid var(--rfi-filet-ligne)",
                            alignItems: "baseline",
                          }}
                        >
                          <span
                            className="rf-nombres"
                            style={{ fontSize: 13, fontWeight: 600, color: "var(--rf-texte-2)" }}
                          >
                            {formatDateCourte(e.date)}
                          </span>
                          <span style={{ minWidth: 0 }}>
                            <span style={{ display: "block", fontSize: 14.5, fontWeight: 600 }}>{e.titre}</span>
                            {e.detail ? (
                              <span
                                style={{
                                  display: "block",
                                  fontSize: 13,
                                  color: "var(--rf-texte-2)",
                                  lineHeight: 1.55,
                                  marginTop: 4,
                                }}
                              >
                                {e.detail}
                              </span>
                            ) : null}
                          </span>
                          <span className="rfi-source" style={{ textAlign: "right", fontSize: 11.5 }}>
                            {libelleSourceCourt(e.source)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="rfi-legende">Aucun événement légal publié dans les sources consultées.</p>
                  ),
                },
              ]}
            />

            <Repli titre="Identité complète" indice="Dénomination, SIREN, SIRET, code NAF, greffe, TVA">
              <div className="rfi-grille" style={{ gap: "0 44px" }}>
                <div>
                  {identite.slice(0, 7).map((l) => (
                    <Paire key={l.cle} cle={l.cle} valeur={l.valeur} />
                  ))}
                </div>
                <div>
                  {identite.slice(7).map((l) => (
                    <Paire key={l.cle} cle={l.cle} valeur={l.valeur} />
                  ))}
                </div>
              </div>
              <p className="rfi-legende" style={{ marginTop: 14 }}>
                Les données brutes de cette fiche sont accessibles en lecture via l’
                <Link href={`/api/entreprises/${entreprise.siren}`}>API publique</Link>.
              </p>
            </Repli>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 18,
                flexWrap: "wrap",
                fontSize: 12,
                color: "var(--rf-texte-3)",
                paddingTop: 16,
              }}
            >
              <span>Sources : Sirene (Insee) · RNE (INPI) · BODACC</span>
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                <Link href={`/entreprises/${slug}/signaler-une-erreur`}>Signaler une information inexacte</Link>
                <Link href={`/entreprises/${slug}/revendiquer`}>Demander la rectification d’une donnée publique</Link>
              </div>
            </div>
          </section>
        </div>
      </section>

      {/* ── Onglet : médiation et recours ─────────────────────────────────── */}
      <section id="recours">
        <div className="rfi-conteneur" style={{ padding: "26px 32px 8px" }}>
          <section className="rfi-bloc">
            <div className="rfi-bloc__tete">
              <h2 className="rfi-pastille-titre">Médiation et voies de recours</h2>
              <span className="rfi-source">Dispositifs applicables à cette entreprise</span>
            </div>

            {entreprise.siteWeb ? (
              <div className="rfi-ouverture" style={{ marginTop: 18, paddingTop: 14 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>Site officiel</div>
                <p style={{ marginTop: 8, fontSize: 14.5 }}>
                  <a href={entreprise.siteWeb} target="_blank" rel="noreferrer noopener">
                    {entreprise.siteWeb.replace(/^https?:\/\//, "")}
                  </a>
                  {boutique ? (
                    <>
                      {" · "}
                      <Link href={`/boutiques/${boutique.slug}`}>
                        déclarations concernant cette boutique
                      </Link>
                    </>
                  ) : null}
                </p>
                <p className="rfi-legende" style={{ marginTop: 8 }}>
                  Rattachement établi à partir de {entreprise.siteWebSource === "osm" ? "OpenStreetMap" : "Wikidata"},
                  base contributive. Il n’a pas été reconfirmé auprès du site.
                </p>
              </div>
            ) : null}

            <div
              className="rfi-ouverture rfi-grille--320"
              style={{ display: "grid", marginTop: 20, paddingTop: 16, alignItems: "start" }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>
                  {mediateurDeclare?.nom ?? "Médiateur non établi"}
                </div>
                <div style={{ marginTop: 12 }}>
                  {mediateurDeclare && entreprise.mediateur ? (
                    <>
                      <Paire cle="Rattachement" valeur="Déclaré par l’entreprise dans ses conditions générales" />
                      <Paire
                        cle="Délai de traitement annoncé"
                        valeur={entreprise.mediateur.delaiInstruction ?? "90 jours"}
                      />
                      <Paire
                        cle="Coût pour le consommateur"
                        valeur={entreprise.mediateur.coutConsommateur ?? "Gratuit"}
                      />
                      <Paire
                        cle="Condition préalable"
                        valeur={
                          entreprise.mediateur.conditionPrealable ??
                          "Réclamation écrite restée sans réponse satisfaisante"
                        }
                      />
                    </>
                  ) : (
                    <>
                      <p className="rfi-legende">
                        Le médiateur compétent n’a pas été relevé dans les conditions générales de cette
                        entreprise. Nous ne le déduisons pas de son secteur d’activité :{" "}
                        <strong>une saisine adressée au mauvais organisme est irrecevable</strong>, et le délai
                        de deux mois serait consommé pour rien.
                      </p>
                      <p className="rfi-legende" style={{ marginTop: 10 }}>
                        La loi oblige le professionnel à indiquer son médiateur dans ses conditions générales
                        et sur son site. À défaut, la{" "}
                        <a href={LISTE_OFFICIELLE} target="_blank" rel="noreferrer noopener">
                          liste officielle des médiateurs référencés
                        </a>{" "}
                        permet d’identifier ceux de son secteur.
                      </p>
                    </>
                  )}
                </div>
                <p className="rfi-legende" style={{ marginTop: 14 }}>
                  Informations générales et parcours prédéfinis. Recours France ne délivre pas de consultation
                  juridique personnalisée et ne transmet pas les réclamations aux professionnels.
                </p>
                {mediateurDeclare?.siteWeb ? (
                  <p style={{ marginTop: 10 }}>
                    <a
                      href={mediateurDeclare.siteWeb}
                      target="_blank"
                      rel="noreferrer noopener"
                      style={{ fontSize: 13.5 }}
                    >
                      Site du médiateur
                    </a>
                  </p>
                ) : null}
              </div>

              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>Les démarches possibles, dans l’ordre</div>
                <div style={{ marginTop: 12 }}>
                  {guide.etapes.map((e) => (
                    <div
                      key={e.numero}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "22px minmax(0,1fr) minmax(80px,110px)",
                        gap: 14,
                        padding: "12px 0",
                        borderBottom: "1px solid var(--rfi-filet-ligne)",
                        alignItems: "baseline",
                      }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--rfi-bleu)" }}>{e.numero}</span>
                      <span style={{ minWidth: 0 }}>
                        <span style={{ display: "block", fontSize: 14, fontWeight: 600 }}>{e.titre}</span>
                        <span
                          style={{
                            display: "block",
                            fontSize: 12.5,
                            color: "var(--rf-texte-2)",
                            lineHeight: 1.55,
                            marginTop: 3,
                          }}
                        >
                          {e.description}
                        </span>
                      </span>
                      <span className="rfi-source" style={{ textAlign: "right", fontSize: 11.5 }}>
                        {e.delai}
                      </span>
                    </div>
                  ))}
                </div>
                <p style={{ marginTop: 12 }}>
                  <Link href="/demarches-officielles" style={{ fontSize: 13.5 }}>
                    Démarches officielles disponibles en parallèle
                  </Link>
                </p>
              </div>
            </div>
          </section>
        </div>
      </section>

      {/* ── Onglet : avis ─────────────────────────────────────────────────── */}
      <section id="avis">{AVIS_ACTIFS ? (
        <div className="rfi-conteneur" style={{ padding: "26px 32px 8px" }}>
          <section className="rfi-bloc">
            <div className="rfi-bloc__tete">
              <h2 className="rfi-pastille-titre">Avis des consommateurs</h2>
              <span className="rfi-source">Appréciations subjectives, distinctes des dossiers documentés</span>
            </div>
            <div
              className="rfi-ouverture"
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 14,
                marginTop: 20,
                paddingTop: 16,
                flexWrap: "wrap",
              }}
            >
              <span className="rf-nombres" style={{ fontSize: 30, fontWeight: 700, lineHeight: 1 }}>
                {moyenne === null ? "—" : moyenne.toFixed(1).replace(".", ",")}
                <span style={{ fontSize: 16, color: "var(--rf-texte-3)", fontWeight: 400 }}>/5</span>
              </span>
              <span style={{ fontSize: 13.5, color: "var(--rf-texte-2)" }}>
                {formatNombre(notesVerifiees.length)} avis rattaché{notesVerifiees.length > 1 ? "s" : ""} à un dossier
                avec justificatif · {formatNombre(nbAvisNonVerifies)} avis sans justificatif, exclu
                {nbAvisNonVerifies > 1 ? "s" : ""} de la moyenne
              </span>
            </div>
            <div style={{ marginTop: 8 }}>
              {avisPublies.length === 0 ? (
                <p className="rfi-legende" style={{ padding: "16px 0" }}>
                  Aucun avis rattaché à un dossier accompagné d’un justificatif n’a encore été publié pour cette entreprise.
                </p>
              ) : (
                avisPublies.map((a) => (
                  <article key={a.id} style={{ padding: "16px 0", borderBottom: "1px solid var(--rfi-filet)" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 14,
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 13.5, color: "var(--rf-texte-2)", letterSpacing: 2 }} aria-hidden="true">
                          {"★".repeat(a.note)}
                          {"☆".repeat(5 - a.note)}
                        </span>
                        <span className="rf-vh">{a.note} sur 5</span>
                        <span className="rfi-badge rfi-badge--verifie">✓ Rattaché à un dossier avec justificatif</span>
                      </div>
                      <span className="rfi-source" style={{ fontSize: 11.5 }}>
                        {formatDate(a.publieLe ?? a.creeLe)}
                      </span>
                    </div>
                    <p style={{ fontSize: 13.5, lineHeight: 1.65, marginTop: 10 }}>{a.texte}</p>
                    {a.signalement ? (
                      <div
                        style={{
                          display: "flex",
                          gap: 14,
                          flexWrap: "wrap",
                          alignItems: "center",
                          marginTop: 9,
                          fontSize: 11.5,
                          color: "var(--rf-texte-3)",
                        }}
                      >
                        <span className="rf-mono" style={{ whiteSpace: "nowrap" }}>
                          {a.signalement.reference}
                        </span>
                        <span>
                          {a.signalement.resolutionConfirmee
                            ? "Résolution confirmée par le consommateur"
                            : "Statut déclaré par le consommateur"}
                        </span>
                      </div>
                    ) : null}
                  </article>
                ))
              )}
              <div style={{ paddingTop: 14, display: "flex", gap: 20, flexWrap: "wrap" }}>
                <Link href={`/entreprises/${slug}/tous-les-avis`} style={{ fontSize: 13.5 }}>
                  Consulter les {formatNombre(notesVerifiees.length)} avis avec justificatif
                </Link>
                <Link href={`/entreprises/${slug}/avis`} style={{ fontSize: 13.5 }}>
                  Laisser un avis
                </Link>
              </div>
            </div>
          </section>
        </div>
      ) : null}</section>

      {/* ── Onglet : méthodologie ─────────────────────────────────────────── */}
      <section id="methodo">
        <div className="rfi-conteneur" style={{ padding: "26px 32px 8px" }}>
          <section className="rfi-bloc">
            <div className="rfi-bloc__tete">
              <h2 className="rfi-pastille-titre">Méthodologie et origine des données</h2>
              <span className="rfi-source">
                Mise à jour le {formatDateLongue(entreprise.syncSirene ?? entreprise.majLe)}
              </span>
            </div>
            <div className="rfi-ouverture rfi-grille" style={{ display: "grid", marginTop: 20, paddingTop: 20 }}>
              {METHODOLOGIE.map((m) => (
                <div key={m.q}>
                  <div style={{ fontSize: 14.5, fontWeight: 700 }}>{m.q}</div>
                  <p style={{ fontSize: 13.5, color: "var(--rf-texte-2)", lineHeight: 1.65, marginTop: 6 }}>{m.a}</p>
                </div>
              ))}
            </div>
            <p style={{ marginTop: 18 }}>
              <Link href="/methodologie" style={{ fontSize: 13.5 }}>
                Consulter la méthodologie complète et opposable
              </Link>
            </p>
          </section>
        </div>
      </section>

      {/* ── Entreprises comparables, sous tous les onglets ────────────────── */}
      <Voisines
        secteur={entreprise.secteur}
        departement={entreprise.departement}
        commune={entreprise.commune}
        memeVille={proches.memeVille}
        memeDepartement={proches.memeDepartement}
        memeSecteur={proches.memeSecteur}
      />

      {/* ── Bloc d'action, sous tous les onglets ──────────────────────────── */}
      <div className="rfi-conteneur" style={{ padding: "26px 32px 34px" }}>
        <div className="rfi-action">
          <div>
            <h2 style={{ fontSize: 23, fontWeight: 700, letterSpacing: "-0.025em", lineHeight: 1.28 }}>
              Vous rencontrez un litige avec cette entreprise&nbsp;?
            </h2>
            <p style={{ fontSize: 15.5, color: "var(--rfi-sur-bleu)", lineHeight: 1.65, marginTop: 12, maxWidth: 600 }}>
              Signalez gratuitement votre litige. Recours France structure votre situation, identifie les
              justificatifs utiles et vous indique les démarches à effectuer dans le bon ordre.
            </p>
            <div style={{ borderTop: "1px solid var(--rfi-filet-bleu)", marginTop: 20, paddingTop: 16 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--rfi-sur-bleu-attenue)",
                  textTransform: "uppercase",
                  letterSpacing: ".06em",
                }}
              >
                Ce que vous obtenez gratuitement
              </div>
              <ul className="rfi-grille--250" style={{ display: "grid", marginTop: 12 }}>
                {[
                  "Les démarches à effectuer dans le bon ordre",
                  "Les justificatifs et preuves à conserver",
                  "Les coordonnées utiles du professionnel",
                  "Le médiateur compétent lorsqu’il est identifié",
                  "Les recours officiels disponibles",
                  "SignalConso lorsque cette démarche est pertinente",
                ].map((d) => (
                  <li key={d} style={{ fontSize: 13.5, color: "var(--rfi-sur-bleu)", lineHeight: 1.5 }}>
                    — {d}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div style={{ maxWidth: 340, width: "100%", justifySelf: "end" }}>
            <Link href={`/signaler?siren=${entreprise.siren}`} className="rfi-bouton rfi-bouton--blanc">
              Signaler mon litige gratuitement
            </Link>
            <div
              style={{
                fontSize: 12.5,
                color: "var(--rfi-sur-bleu-attenue)",
                textAlign: "center",
                lineHeight: 1.55,
                marginTop: 10,
              }}
            >
              Gratuit · 3 à 5 minutes · justificatifs facultatifs
              {publierLitiges ? (
                <>
                  <br />
                  {formatNombre(stats.total12Mois)} consommateur{stats.total12Mois > 1 ? "s ont" : " a"} déjà signalé
                  un litige avec cette entreprise.
                </>
              ) : null}
            </div>
            <div style={{ textAlign: "center", marginTop: 12 }}>
              {AVIS_ACTIFS ? (
                <Link href={lien("avis")} style={{ fontSize: 12.5 }}>
                  Laisser seulement un avis
                </Link>
              ) : null}
            </div>
          </div>
        </div>
        <div style={{ fontSize: 12, color: "var(--rf-texte-3)", paddingTop: 14 }}>
          Fiche consultée {formatNombre(entreprise.vues)} fois depuis sa création.
        </div>
      </div>
    </Page>
  );
}

// ── Fragments d'affichage ───────────────────────────────────────────────────

function Chiffre({
  id,
  valeur,
  libelle,
  base,
  aide,
  couleur,
}: {
  id: string;
  valeur: string;
  libelle: string;
  base: string;
  aide: string;
  couleur?: string;
}) {
  return (
    <div className="rfi-chiffre">
      <div className="rfi-chiffre__valeur" style={couleur ? { color: couleur } : undefined}>
        {valeur}
      </div>
      <div className="rfi-chiffre__libelle">
        <span>{libelle}</span>
        <InfoBulle id={`aide-${id}`} texte={aide} />
      </div>
      <div className="rfi-chiffre__base">{base}</div>
    </div>
  );
}

function Paire({ cle, valeur }: { cle: string; valeur: string }) {
  return (
    <div className="rfi-paire">
      <span>{cle}</span>
      <span>{valeur}</span>
    </div>
  );
}

/** Premier alinéa du paragraphe de synthèse, rédigé en prose à partir des registres. */
function phraseIdentite(
  e: {
    denomination: string;
    formeJuridique: string | null;
    dateImmatriculation: Date | null;
    nafLibelle: string | null;
    trancheEffectif: string | null;
    etatAdministratif: string;
  },
  anciennete: number | null,
) {
  const effectif = libelleEffectif(e.trancheEffectif).replace(" (tranche Insee)", "");
  return (
    <>
      La société <strong>{e.denomination}</strong>
      {e.dateImmatriculation ? (
        <>
          {" "}
          a été créée le <strong>{formatDateLongue(e.dateImmatriculation)}</strong>
          {anciennete !== null ? `, il y a ${anciennete} an${anciennete > 1 ? "s" : ""}` : ""}
        </>
      ) : (
        " est immatriculée aux registres publics"
      )}
      .{" "}
      {e.formeJuridique ? (
        <>
          Sa forme juridique est <strong>{e.formeJuridique}</strong>.{" "}
        </>
      ) : null}
      {e.nafLibelle ? <>Son domaine d’activité est : {e.nafLibelle.toLowerCase()}. </> : null}
      {e.trancheEffectif && e.trancheEffectif !== "NN" ? <>Elle comptait {effectif.toLowerCase()}. </> : null}
      {e.etatAdministratif === "ACTIVE" ? null : <>Elle est déclarée cessée dans le répertoire Sirene. </>}
    </>
  );
}
