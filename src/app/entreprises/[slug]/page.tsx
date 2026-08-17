import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { Page } from "@/components/chrome";
import { Dossiers, type Dossier } from "@/components/fiche/dossiers";
import { Repli, Rubriques } from "@/components/fiche/rubriques";
import { InfoBulle } from "@/components/ui";
import { prisma } from "@/lib/db";
import { chargerEntreprise, detailEntreprise } from "@/lib/fiche";
import { indicesEntreprise } from "@/lib/stats";
import {
  apprecier,
  couleurVerdict,
  couleurVigilance,
  formaterMontantCourt,
  SEUIL_PUBLICATION_EXPERIENCE,
} from "@/lib/scoring";
import { construireAlertes, couleurNiveau, estEnRetard, resumerAlertes } from "@/lib/alertes";
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
  LIBELLES_CATEGORIE,
  qualiteDirigeant,
} from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const entreprise = await prisma.entreprise.findUnique({ where: { slug } });
  if (!entreprise) return { title: "Fiche entreprise" };
  return {
    title: `${entreprise.denomination} — litiges, données publiques et points de vigilance`,
    description: `Fiche de ${entreprise.denomination} (SIREN ${formatSiren(entreprise.siren)}) : dossiers de consommateurs, points de vigilance relevés sur les registres publics, comptes annuels et voies de recours.`,
  };
}

const JOUR = 86_400_000;

export default async function FicheEntreprise({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
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

  const [signalements, avisPublies, nbAvisNonVerifies, totalDossiers] = await Promise.all([
    prisma.signalement.findMany({
      where: { entrepriseId: entreprise.id, moderation: "PUBLIE" },
      orderBy: { creeLe: "desc" },
      take: 5,
    }),
    prisma.avis.findMany({
      where: { entrepriseId: entreprise.id, moderation: "PUBLIE", verifie: true },
      orderBy: { publieLe: "desc" },
      include: { signalement: { select: { reference: true, statut: true, resolutionConfirmee: true } } },
      take: 2,
    }),
    prisma.avis.count({ where: { entrepriseId: entreprise.id, moderation: "PUBLIE", verifie: false } }),
    prisma.signalement.count({ where: { entrepriseId: entreprise.id, moderation: "PUBLIE" } }),
  ]);

  const notesVerifiees = await prisma.avis.findMany({
    where: { entrepriseId: entreprise.id, moderation: "PUBLIE", verifie: true },
    select: { note: true },
  });
  const moyenne = notesVerifiees.length
    ? notesVerifiees.reduce((t, a) => t + a.note, 0) / notesVerifiees.length
    : null;

  // ── Points de vigilance et appréciation ──────────────────────────────────
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
    // Le critère porte sur les trois derniers exercices attendus, pas sur tout l'historique.
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

  // ── Dossiers récents ─────────────────────────────────────────────────────
  const dossiers: Dossier[] = signalements.map((s) => {
    const verifie = s.niveauVerification === "VERIFIE";
    const clos = s.closLe !== null;
    const jours = Math.max(
      0,
      Math.round(((clos ? s.closLe!.getTime() : Date.now()) - s.creeLe.getTime()) / JOUR),
    );
    const statut = etatDossier(s.statut, s.resolutionConfirmee, s.reponseDeclaree);
    return {
      reference: s.reference,
      motif: intituleDossier(s.categorie),
      montant: s.montant ? formatMontant(Number(s.montant)) : "montant non déclaré",
      verifie,
      resolu: s.resolutionConfirmee,
      date: formatDateLongue(s.creeLe),
      duree: clos ? libelleDuree("Clos en", jours) : libelleDuree("Ouvert depuis", jours),
      dureeAlerte: !clos && jours > 60,
      statut: statut.libelle,
      statutClasse: statut.classe,
      detail: [
        { cle: "Catégorie", valeur: LIBELLES_CATEGORIE[s.categorie] },
        { cle: "Montant déclaré", valeur: s.montant ? formatMontant(Number(s.montant)) : "Non déclaré" },
        {
          cle: "Vérification",
          valeur: verifie ? "Pièce contrôlée par Recours France" : "Aucun justificatif contrôlé",
        },
        {
          cle: "Réponse du professionnel",
          valeur: s.reponseDeclaree ? "Oui, selon le consommateur" : "Non renseignée",
        },
        {
          cle: "Résolution",
          valeur: s.resolutionConfirmee ? "Confirmée par le consommateur" : "Non confirmée",
        },
        {
          cle: clos ? "Clôture" : "Dernière mise à jour",
          valeur: formatDateLongue(clos ? s.closLe : s.majLe),
        },
      ],
      resume: resumeFactuel(s.categorie, s.statut, s.reponseDeclaree, s.resolutionConfirmee, verifie),
    };
  });

  // ── Synthèse en 8 faits ──────────────────────────────────────────────────
  const dernierCompte = comptes.find((c) => c.chiffreAffaires !== null) ?? comptes[0];
  const faits = [
    { cle: "Forme juridique", valeur: entreprise.formeJuridique ?? "Non renseignée", source: "Sirene" },
    {
      cle: "Immatriculée le",
      valeur: formatDateLongue(entreprise.dateImmatriculation),
      source: anciennete !== null ? `Ancienneté : ${anciennete} ans` : "Sirene",
    },
    {
      cle: dernierCompte ? `Chiffre d’affaires ${dernierCompte.exercice}` : "Chiffre d’affaires",
      valeur: dernierCompte?.chiffreAffaires ? formaterMontantCourt(Number(dernierCompte.chiffreAffaires)) : "Non publié",
      source: dernierCompte?.chiffreAffaires ? "Comptes déposés" : "Aucun dépôt exploitable",
    },
    {
      cle: dernierCompte ? `Résultat net ${dernierCompte.exercice}` : "Résultat net",
      valeur: dernierCompte?.resultatNet
        ? `${Number(dernierCompte.resultatNet) >= 0 ? "+ " : "− "}${formaterMontantCourt(Math.abs(Number(dernierCompte.resultatNet)))}`
        : "Non publié",
      source: dernierCompte?.resultatNet ? "Comptes déposés" : "Aucun dépôt exploitable",
    },
    { cle: "Effectif", valeur: libelleEffectif(entreprise.trancheEffectif).replace(" (tranche Insee)", ""), source: "Sirene" },
    {
      cle: "Siège",
      valeur: entreprise.commune ? `${entreprise.commune} (${entreprise.departement ?? ""})` : "Non renseigné",
      source: "Sirene",
    },
    {
      cle: "Établissements",
      valeur: `${formatNombre(entreprise.nombreEtablissementsOuverts)} actif${entreprise.nombreEtablissementsOuverts > 1 ? "s" : ""}`,
      source: "Sirene",
    },
    {
      cle: "Procédure collective",
      valeur: evenements.some((e) => e.procedureCollective) ? "Publiée" : "Aucune",
      source: "BODACC",
    },
  ];

  const guide = construireGuide({
    categorie: "AUTRE",
    contactPrealable: "AUCUN",
    dateSignalement: new Date(),
    reference: "—",
    verifie: false,
    mediateur: entreprise.mediateur,
  });

  const maxMotif = Math.max(1, ...stats.motifs.map((m) => m.pourcentage));
  const couleurBarre = (i: number) =>
    i < 2 ? "var(--rfi-barre-1)" : i < 4 ? "var(--rfi-barre-2)" : "var(--rfi-barre-3)";

  const identite: { cle: string; valeur: string }[] = [
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

  return (
    <Page
      habillage="institutionnel"
      entete={{ baseline: "Signalement des litiges de consommation" }}
      fil={[
        { libelle: "Annuaire des entreprises", href: "/entreprises" },
        { libelle: entreprise.denomination },
      ]}
    >
      {/* ── En-tête entreprise ────────────────────────────────────────────── */}
      <div
        className="rfi-conteneur rfi-entete-entreprise"
        style={{
          padding: "32px 32px 26px",
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr) auto",
          gap: 36,
          alignItems: "end",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <h1 className="rfi-h1">{entreprise.denomination}</h1>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              flexWrap: "wrap",
              marginTop: 13,
              fontSize: 13.5,
              color: "var(--rf-texte-2)",
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7, color: "var(--rf-encre)", fontWeight: 600 }}>
              <span
                aria-hidden="true"
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: entreprise.etatAdministratif === "ACTIVE" ? "var(--rfi-vert)" : "var(--rfi-rouge)",
                  display: "block",
                }}
              />
              {entreprise.etatAdministratif === "ACTIVE" ? "Entreprise active" : "Entreprise cessée"}
            </span>
            <span className="rfi-sep" aria-hidden="true">|</span>
            <span>
              SIREN{" "}
              <strong className="rf-nombres" style={{ fontWeight: 600 }}>
                {formatSiren(entreprise.siren)}
              </strong>
            </span>
            <span className="rfi-sep" aria-hidden="true">|</span>
            <span>Identité vérifiée auprès des registres publics</span>
            <span className="rfi-sep" aria-hidden="true">|</span>
            <span>
              {[
                entreprise.formeJuridique,
                entreprise.nafLibelle?.toLowerCase(),
                entreprise.commune ? `${entreprise.commune} (${entreprise.departement ?? ""})` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </div>
          <div className="rfi-source" style={{ marginTop: 9, fontSize: 12.5 }}>
            Dernière mise à jour des données publiques : {formatDateLongue(entreprise.syncSirene ?? entreprise.majLe)} —
            Sirene, RNE/INPI, BODACC.
          </div>
        </div>
        <div style={{ minWidth: 220 }}>
          <Link href={`/signaler?siren=${entreprise.siren}`} className="rfi-bouton">
            Signaler un litige
          </Link>
          <div className="rfi-source" style={{ textAlign: "center", marginTop: 7 }}>
            Gratuit · 3 à 5 minutes
          </div>
        </div>
      </div>

      {/* ── Litiges et signalements ───────────────────────────────────────── */}
      <section className="rfi-section--dominante">
        <div className="rfi-conteneur">
          <div className="rfi-entete-section">
            <div>
              <h2 className="rfi-h2">Litiges et signalements concernant cette entreprise</h2>
              <p className="rfi-chapo">
                Données issues des dossiers enregistrés sur Recours France et des justificatifs transmis par les
                consommateurs, sur les douze derniers mois.
              </p>
            </div>
            <Link href="/methodologie" style={{ fontSize: 13.5 }}>
              Consulter la méthodologie
            </Link>
          </div>

          {stats.total12Mois === 0 ? (
            <div className="rfi-ouverture" style={{ marginTop: 22, padding: "26px 0" }}>
              <p style={{ fontSize: 16, fontWeight: 600 }}>Aucun dossier enregistré sur cette entreprise.</p>
              <p className="rfi-chapo" style={{ maxWidth: 720 }}>
                Aucun taux n’est publié : les statistiques de comportement ne sont calculées qu’à partir de
                dossiers vérifiés. Les points de vigilance ci-dessous reposent alors uniquement sur les
                registres publics.
              </p>
            </div>
          ) : (
            <>
              <div className="rfi-chiffres">
                <Chiffre
                  id="total"
                  valeur={formatNombre(stats.total12Mois)}
                  libelle="dossiers enregistrés"
                  base="12 derniers mois, vérifiés ou non"
                  aide="Total des signalements déposés par des consommateurs sur les douze derniers mois. Un dossier par consommateur et par litige."
                />
                <Chiffre
                  id="verifies"
                  valeur={formatNombre(stats.verifies)}
                  libelle="dossiers vérifiés"
                  base="justificatif contrôlé par Recours France"
                  aide="Dossiers pour lesquels une pièce a été contrôlée : facture, commande, contrat ou preuve de paiement. Seule base des taux publiés."
                />
                <Chiffre
                  id="encours"
                  valeur={formatNombre(stats.enCours)}
                  libelle="litiges en cours"
                  base={`dont ${stats.ouverts.filter((o) => o.jours > 30).length} ouverts depuis plus de 30 jours`}
                  aide="Dossiers vérifiés non clôturés à ce jour, quel que soit leur statut déclaré."
                  couleur={stats.ouverts.filter((o) => o.jours > 30).length ? "var(--rfi-ambre)" : undefined}
                />
                <Chiffre
                  id="resolution"
                  valeur={stats.tauxResolution === null ? "—" : formatPourcent(stats.tauxResolution)}
                  libelle="de résolution confirmée"
                  base={`base : ${stats.clotures} dossier${stats.clotures > 1 ? "s" : ""} clôturé${stats.clotures > 1 ? "s" : ""}`}
                  aide="Part des dossiers vérifiés et clôturés dont la résolution a été confirmée par le consommateur. Un abandon ou une absence de retour n’est jamais compté comme résolu."
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
                  padding: "12px 0 0",
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
                <span>Source : dossiers enregistrés · déclarations des consommateurs</span>
              </div>

              <div className="rfi-deux-colonnes" style={{ marginTop: 34 }}>
                <Dossiers dossiers={dossiers} total={totalDossiers} lienTous={`/entreprises/${entreprise.slug}/dossiers`} />

                <div style={{ minWidth: 0 }}>
                  <div className="rfi-ouverture" style={{ paddingTop: 14 }}>
                    <h3 className="rfi-h3 rfi-h3--petit">Motifs déclarés</h3>
                    <div className="rfi-source" style={{ marginTop: 4 }}>
                      Répartition sur {formatNombre(stats.total12Mois)} dossiers
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
                      {stats.motifs.map((m, i) => (
                        <div key={m.cle}>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
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

                  <div className="rfi-ouverture--legere" style={{ marginTop: 26, paddingTop: 16 }}>
                    <h3 className="rfi-h3 rfi-h3--petit">Deux niveaux de fiabilité</h3>
                    <div style={{ marginTop: 14 }}>
                      <span className="rfi-badge rfi-badge--verifie">✓ Justificatif vérifié</span>
                      <p style={{ fontSize: 12.5, color: "var(--rf-texte-2)", lineHeight: 1.6, marginTop: 8 }}>
                        Facture, commande ou preuve de paiement contrôlée par Recours France. Seuls ces dossiers
                        entrent dans les taux publiés.
                      </p>
                    </div>
                    <div style={{ marginTop: 16 }}>
                      <span className="rfi-badge rfi-badge--neutre">Non vérifié</span>
                      <p style={{ fontSize: 12.5, color: "var(--rf-texte-2)", lineHeight: 1.6, marginTop: 8 }}>
                        Déclaration sans pièce contrôlée. Comptée dans le volume, exclue de tous les taux.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ── Points de vigilance ───────────────────────────────────────────── */}
      <section className="rfi-section rfi-section--alternee">
        <div className="rfi-conteneur">
          <div className="rfi-entete-section">
            <div>
              <h2 className="rfi-h2">Points de vigilance relevés sur cette entreprise</h2>
              <p className="rfi-chapo">
                Événements détectés sur les registres publics et sur les dossiers enregistrés. Chaque élément
                indique sa source.
              </p>
            </div>
            <span className="rfi-legende">{resumerAlertes(alertes)}</span>
          </div>

          <div className="rfi-ouverture" style={{ marginTop: 20 }}>
            {alertes.length === 0 ? (
              <p className="rfi-legende" style={{ padding: "20px 0" }}>
                Aucun point de vigilance relevé à ce jour sur les sources consultées.
              </p>
            ) : (
              alertes.map((a) => (
                <div key={a.titre} className="rfi-alerte">
                  <div className="rfi-alerte__niveau" style={{ color: couleurNiveau(a.niveau) }}>
                    <span className="rfi-alerte__carre" style={{ background: couleurNiveau(a.niveau) }} aria-hidden="true" />
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
        </div>
      </section>

      {/* ── Bloc d'action ─────────────────────────────────────────────────── */}
      <section className="rfi-section--marine">
        <div
          className="rfi-conteneur"
          style={{
            padding: "38px 32px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,320px),1fr))",
            gap: 44,
            alignItems: "start",
          }}
        >
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.025em", lineHeight: 1.25 }}>
              Vous rencontrez un litige avec cette entreprise&nbsp;?
            </h2>
            <p style={{ fontSize: 15.5, color: "var(--rf-sur-marine)", lineHeight: 1.65, marginTop: 12, maxWidth: 600 }}>
              Signalez gratuitement votre litige. Recours France structure votre situation, identifie les
              justificatifs utiles et vous indique les démarches à effectuer dans le bon ordre.
            </p>
            <div style={{ borderTop: "1px solid var(--rf-filet-marine)", marginTop: 20, paddingTop: 16 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--rf-sur-marine-attenue)",
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
                  <li key={d} style={{ fontSize: 13.5, color: "var(--rf-sur-marine)", lineHeight: 1.5 }}>
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
                color: "var(--rf-sur-marine-attenue)",
                textAlign: "center",
                lineHeight: 1.55,
                marginTop: 10,
              }}
            >
              Gratuit · 3 à 5 minutes · justificatifs facultatifs
              {stats.total12Mois > 0 ? (
                <>
                  <br />
                  {formatNombre(stats.total12Mois)} consommateur{stats.total12Mois > 1 ? "s ont" : " a"} déjà
                  signalé un litige avec cette entreprise.
                </>
              ) : null}
            </div>
            <div style={{ textAlign: "center", marginTop: 12 }}>
              <Link href={`/entreprises/${entreprise.slug}/avis`} style={{ fontSize: 12.5, color: "var(--rf-sur-marine)" }}>
                Laisser seulement un avis
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Informations légales, publiques et financières ────────────────── */}
      <section className="rfi-conteneur" style={{ padding: "36px 32px 34px" }}>
        <div className="rfi-entete-section">
          <div>
            <h2 className="rfi-h2">Informations légales, publiques et financières</h2>
            <p className="rfi-chapo">
              Données issues des registres publics. Chaque rubrique peut être dépliée pour consulter le détail
              et sa source.
            </p>
          </div>
          <span className="rfi-legende">Sirene · RNE/INPI · BODACC</span>
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
                  Aucun dépôt de comptes annuels n’a été trouvé dans les annonces BODACC consultées pour cette
                  entreprise.
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
                      <Paire cle="Représentant légal" valeur={qualiteDirigeant(entreprise.representantLegal) ?? "Non publié"} />
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
              indice: `${formatNombre(entreprise.nombreEtablissementsOuverts)} établissement${entreprise.nombreEtablissementsOuverts > 1 ? "s" : ""} actif${entreprise.nombreEtablissementsOuverts > 1 ? "s" : ""}, dont le siège`,
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
                        .slice(0, 5)
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
                      <span className="rf-nombres" style={{ fontSize: 13, fontWeight: 600, color: "var(--rf-texte-2)" }}>
                        {formatDateCourte(e.date)}
                      </span>
                      <span style={{ minWidth: 0 }}>
                        <span style={{ display: "block", fontSize: 14.5, fontWeight: 600 }}>{e.titre}</span>
                        {e.detail ? (
                          <span
                            style={{ display: "block", fontSize: 13, color: "var(--rf-texte-2)", lineHeight: 1.55, marginTop: 4 }}
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

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 18,
            flexWrap: "wrap",
            fontSize: 12,
            color: "var(--rf-texte-3)",
            padding: "14px 0 0",
          }}
        >
          <span>Sources : Sirene (Insee) · RNE (INPI) · BODACC · déclarations des consommateurs</span>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            <Link href={`/entreprises/${entreprise.slug}/signaler-une-erreur`}>Signaler une information inexacte</Link>
            <Link href={`/entreprises/${entreprise.slug}/revendiquer`}>Demander la rectification d’une donnée publique</Link>
          </div>
        </div>
      </section>

      {/* ── Appréciation générale ─────────────────────────────────────────── */}
      <section className="rfi-section rfi-section--filet">
        <div className="rfi-conteneur">
          <h2 className="rfi-h2">Appréciation générale de Recours France</h2>
          <p className="rfi-chapo" style={{ maxWidth: 760 }}>
            Appréciation établie à partir des registres publics et des dossiers vérifiés. Elle ne constitue ni
            une recommandation, ni un avertissement officiel.
          </p>

          <div
            className="rfi-ouverture"
            style={{
              marginTop: 20,
              paddingTop: 22,
              display: "grid",
              gridTemplateColumns: "minmax(0,1fr) minmax(240px,300px)",
              gap: 44,
              alignItems: "start",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.015em" }}>
                Niveau de vigilance :{" "}
                <span style={{ color: couleurVigilance(appreciation.niveauVigilance) }}>
                  {appreciation.niveauVigilance}
                </span>
              </div>
              <div style={{ fontSize: 15, marginTop: 10 }}>{resumerAlertes(alertes)}.</div>
              <p style={{ fontSize: 13.5, color: "var(--rf-texte-2)", lineHeight: 1.65, marginTop: 8, maxWidth: 620 }}>
                {appreciation.commentaire}
              </p>
              <div style={{ marginTop: 14 }}>
                <Repli
                  variante="lien"
                  libelleFerme="Consulter les critères →"
                  libelleOuvert="Masquer les critères"
                >
                  <div style={{ marginTop: 24 }}>
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
                        <span style={{ flex: "1 1 320px", fontSize: 13.5, color: "var(--rf-texte-2)", lineHeight: 1.6 }}>
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
                      Trois critères reposent sur les registres publics, deux sur les dossiers vérifiés et les
                      déclarations des consommateurs. Les deux familles ne sont jamais fondues dans un même
                      critère.
                    </p>
                  </div>
                </Repli>
              </div>
            </div>

            <div style={{ minWidth: 0, borderLeft: "1px solid var(--rfi-filet)", paddingLeft: 24 }}>
              <div className="rfi-etiquette" style={{ fontSize: 12 }}>
                Indice de confiance
              </div>
              <div className="rf-nombres" style={{ fontSize: 15, marginTop: 8 }}>
                {appreciation.indice}/100 — {appreciation.bande}
              </div>
              <p className="rfi-legende" style={{ marginTop: 8 }}>
                Recalculé chaque jour. Un signalement non vérifié ne fait pas varier cet indice.
                {appreciation.comportementPublie
                  ? ""
                  : ` Faute de ${SEUIL_PUBLICATION_EXPERIENCE} dossiers vérifiés sur douze mois, il repose ici sur les seuls registres publics.`}
              </p>
              <div style={{ marginTop: 10 }}>
                <Link href="/methodologie#m4" style={{ fontSize: 12.5 }}>
                  Méthodologie de calcul
                </Link>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 18, borderTop: "1px solid var(--rfi-filet)" }}>
            <Repli titre="Méthodologie et origine des données">
              <div className="rfi-grille">
                {METHODOLOGIE.map((m) => (
                  <div key={m.q}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{m.q}</div>
                    <p style={{ fontSize: 13, color: "var(--rf-texte-2)", lineHeight: 1.65, marginTop: 5 }}>{m.a}</p>
                  </div>
                ))}
              </div>
            </Repli>
          </div>
        </div>
      </section>

      {/* ── Médiation et avis ─────────────────────────────────────────────── */}
      <section className="rfi-section rfi-section--alternee">
        <div className="rfi-conteneur rfi-grille--330" style={{ display: "grid", alignItems: "start" }}>
          <div style={{ minWidth: 0 }}>
            <h2 className="rfi-h2 rfi-h2--secondaire">Médiation et voies de recours</h2>
            <p className="rfi-chapo" style={{ fontSize: 13.5, marginTop: 7 }}>
              Dispositifs applicables à cette entreprise.
            </p>
            <div className="rfi-ouverture" style={{ marginTop: 16, paddingTop: 14 }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>
                {entreprise.mediateur?.nom ?? "Médiateur non identifié"}
              </div>
              <div style={{ marginTop: 10 }}>
                {entreprise.mediateur ? (
                  <>
                    <Paire
                      cle="Rattachement"
                      valeur={entreprise.mediateurAdhesionDepuis ?? "Présumé d’après le secteur d’activité"}
                      bordure="var(--rfi-filet)"
                    />
                    <Paire
                      cle="Délai de traitement annoncé"
                      valeur={entreprise.mediateur.delaiInstruction ?? "90 jours"}
                      bordure="var(--rfi-filet)"
                    />
                    <Paire
                      cle="Coût pour le consommateur"
                      valeur={entreprise.mediateur.coutConsommateur ?? "Gratuit"}
                      bordure="var(--rfi-filet)"
                    />
                    <Paire
                      cle="Condition préalable"
                      valeur={entreprise.mediateur.conditionPrealable ?? "Réclamation écrite restée sans réponse satisfaisante"}
                      bordure="var(--rfi-filet)"
                    />
                  </>
                ) : (
                  <p className="rfi-legende">
                    Aucun médiateur n’a pu être rattaché à cette entreprise à partir de la liste publique des
                    médiateurs de la consommation. Le médiateur compétent doit figurer dans les conditions
                    générales du professionnel : la loi l’oblige à le communiquer.
                  </p>
                )}
              </div>
              <div style={{ paddingTop: 4 }}>
                <Repli
                  variante="lien"
                  libelleFerme="Consulter les démarches possibles, dans l’ordre"
                  libelleOuvert="Masquer les démarches"
                >
                  <div style={{ marginTop: 12 }}>
                    {guide.etapes.map((e) => (
                      <div
                        key={e.numero}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "22px minmax(0,1fr) minmax(80px,110px)",
                          gap: 14,
                          padding: "12px 0",
                          borderBottom: "1px solid var(--rfi-filet)",
                          alignItems: "baseline",
                        }}
                      >
                        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--rfi-marine)" }}>{e.numero}</span>
                        <span style={{ minWidth: 0 }}>
                          <span style={{ display: "block", fontSize: 14, fontWeight: 600 }}>{e.titre}</span>
                          <span
                            style={{ display: "block", fontSize: 12.5, color: "var(--rf-texte-2)", lineHeight: 1.55, marginTop: 3 }}
                          >
                            {e.description}
                          </span>
                        </span>
                        <span className="rfi-source" style={{ textAlign: "right", fontSize: 11.5 }}>
                          {e.delai}
                        </span>
                      </div>
                    ))}
                    <p className="rfi-legende" style={{ marginTop: 12 }}>
                      Informations générales et parcours prédéfinis. Recours France ne délivre pas de
                      consultation juridique personnalisée et ne transmet pas les réclamations aux
                      professionnels.
                    </p>
                  </div>
                </Repli>
              </div>
            </div>
          </div>

          <div id="avis" style={{ minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 18, alignItems: "baseline", flexWrap: "wrap" }}>
              <div>
                <h2 className="rfi-h2 rfi-h2--secondaire">Avis des consommateurs</h2>
                <p className="rfi-chapo" style={{ fontSize: 13.5, marginTop: 7 }}>
                  Appréciations subjectives, distinctes des dossiers documentés.
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="rf-nombres" style={{ fontSize: 22, fontWeight: 700, lineHeight: 1 }}>
                  {moyenne === null ? "—" : moyenne.toFixed(1).replace(".", ",")}
                  <span style={{ fontSize: 14, color: "var(--rf-texte-3)", fontWeight: 400 }}>/5</span>
                </div>
                <div className="rfi-source" style={{ fontSize: 11.5, marginTop: 3 }}>
                  {formatNombre(notesVerifiees.length)} avis vérifié{notesVerifiees.length > 1 ? "s" : ""}
                </div>
              </div>
            </div>

            <div className="rfi-ouverture" style={{ marginTop: 16 }}>
              {avisPublies.length === 0 ? (
                <p className="rfi-legende" style={{ padding: "16px 0" }}>
                  Aucun avis rattaché à un dossier vérifié n’a encore été publié pour cette entreprise.
                </p>
              ) : (
                avisPublies.map((a) => (
                  <article key={a.id} style={{ padding: "16px 0", borderBottom: "1px solid var(--rfi-filet)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 13.5, color: "var(--rf-texte-2)", letterSpacing: 2 }} aria-hidden="true">
                          {"★".repeat(a.note)}
                          {"☆".repeat(5 - a.note)}
                        </span>
                        <span className="rf-vh">{a.note} sur 5</span>
                        <span className="rfi-badge rfi-badge--verifie">✓ Rattaché à un dossier vérifié</span>
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
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 16,
                  flexWrap: "wrap",
                  alignItems: "center",
                  paddingTop: 13,
                }}
              >
                <Link href={`/entreprises/${entreprise.slug}/avis`} style={{ fontSize: 13.5 }}>
                  Laisser un avis
                </Link>
                <span className="rfi-source">
                  {formatNombre(nbAvisNonVerifies)} avis non vérifié{nbAvisNonVerifies > 1 ? "s" : ""}, exclu
                  {nbAvisNonVerifies > 1 ? "s" : ""} de la moyenne
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Informations légales détaillées ───────────────────────────────── */}
      <div className="rfi-conteneur" style={{ padding: "0 32px" }}>
        <Repli titre="Informations légales détaillées" indice="Identité complète, établissements, greffe, coordonnées déclarées">
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
              {entreprise.emailReclamation || entreprise.telephoneReclamation ? (
                <Paire
                  cle="Service consommateurs déclaré"
                  valeur={[entreprise.emailReclamation, entreprise.telephoneReclamation].filter(Boolean).join(" · ")}
                />
              ) : null}
            </div>
          </div>
          <p className="rfi-legende" style={{ marginTop: 14 }}>
            Le nom des personnes physiques dirigeantes n’est pas publié. Les données brutes de cette fiche sont
            accessibles en lecture via l’<Link href={`/api/entreprises/${entreprise.siren}`}>API publique</Link>.
          </p>
        </Repli>
        <div style={{ padding: "16px 0 30px", fontSize: 12, color: "var(--rf-texte-3)" }}>
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

function Paire({ cle, valeur, bordure }: { cle: string; valeur: string; bordure?: string }) {
  return (
    <div className="rfi-paire" style={bordure ? { borderBottomColor: bordure } : undefined}>
      <span>{cle}</span>
      <span>{valeur}</span>
    </div>
  );
}

function intituleDossier(categorie: string): string {
  switch (categorie) {
    case "REMBOURSEMENT":
      return "Remboursement non reçu";
    case "LIVRAISON":
      return "Problème de livraison";
    case "GARANTIE":
      return "Garantie refusée";
    case "SAV":
      return "Service après-vente défaillant";
    case "RESILIATION":
      return "Prélèvement après résiliation";
    default:
      return "Pratique contestée";
  }
}

/** « Ouvert depuis 1 jour » plutôt que « depuis 0 jours » pour un dépôt du jour. */
function libelleDuree(prefixe: string, jours: number): string {
  if (jours <= 0) return prefixe.startsWith("Clos") ? "Clos le jour même" : "Ouvert aujourd’hui";
  if (jours === 1) return `${prefixe} 1 jour`;
  return `${prefixe} ${jours} jours`;
}

function etatDossier(
  statut: string,
  resolu: boolean,
  reponse: boolean,
): { libelle: string; classe: string } {
  if (resolu || statut === "RESOLU_CONFIRME") return { libelle: "Résolu", classe: "rfi-statut--vert" };
  if (statut === "NON_RESOLU") return { libelle: "Non résolu", classe: "rfi-statut--rouge" };
  if (statut === "ABANDONNE") return { libelle: "Abandonné", classe: "rfi-statut--neutre" };
  if (statut === "RESOLUTION_PARTIELLE") return { libelle: "Résolution partielle", classe: "rfi-statut--ambre" };
  if (statut === "REPONSE_DECLAREE" || statut === "SOLUTION_PROPOSEE" || reponse)
    return { libelle: "En cours", classe: "rfi-statut--ambre" };
  return { libelle: "Sans réponse", classe: "rfi-statut--neutre" };
}

/**
 * Résumé produit par la plateforme à partir des seules données structurées :
 * aucun texte libre du consommateur n'est publié (règle métier n° 7).
 */
function resumeFactuel(
  categorie: string,
  statut: string,
  reponse: boolean,
  resolu: boolean,
  verifie: boolean,
): string {
  const objet =
    categorie === "REMBOURSEMENT"
      ? "Un remboursement déclaré non reçu après annulation, rétractation ou retour"
      : categorie === "LIVRAISON"
        ? "Une livraison déclarée non conforme, incomplète ou très en retard"
        : categorie === "GARANTIE"
          ? "Une prise en charge au titre de la garantie légale déclarée refusée"
          : categorie === "SAV"
            ? "Une intervention de service après-vente déclarée non assurée"
            : categorie === "RESILIATION"
              ? "Des prélèvements déclarés poursuivis après une demande de résiliation"
              : "Un litige de consommation déclaré";

  const suite = reponse
    ? "Le consommateur déclare avoir reçu une réponse du professionnel."
    : "Le consommateur ne déclare aucune réponse du professionnel à ce jour.";

  const fin = resolu
    ? "La résolution a été confirmée par le consommateur après clôture."
    : statut === "NON_RESOLU"
      ? "Aucune résolution n’a été confirmée : le dossier est déclaré non résolu."
      : statut === "ABANDONNE"
        ? "Le dossier a été clôturé sans suite par le consommateur."
        : "Aucune résolution n’a été confirmée à ce jour.";

  const niveau = verifie ? "" : " Dossier non vérifié : exclu des taux publiés.";

  return `${objet}. ${suite} ${fin}${niveau}`;
}
