import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { Page } from "@/components/chrome";
import { Accordeon } from "@/components/accordeon";
import { ListeExperiences, type Experience } from "@/components/fiche/experiences";
import { BadgeEtatEntreprise, Etoiles, ItemCoche, Tuile } from "@/components/ui";
import { prisma } from "@/lib/db";
import { chargerEntreprise, detailEntreprise } from "@/lib/fiche";
import { indicesEntreprise } from "@/lib/stats";
import { couleurScore, couleurTon, SEUIL_PUBLICATION_EXPERIENCE } from "@/lib/scoring";
import { construireGuide } from "@/lib/demarches";
import {
  APRES_SIGNALEMENT,
  CE_QUE_LA_PLATEFORME_NE_FAIT_PAS,
  METHODOLOGIE,
  STATUTS_EXPLIQUES,
} from "@/lib/contenus";
import {
  auteurAnonyme,
  classeBadgeStatut,
  couleursSource,
  couleurStatut,
  formatDate,
  formatDateCourte,
  formatDateLongue,
  formatMontant,
  formatNombre,
  formatPourcent,
  formatSiren,
  formatSiret,
  ilYA,
  libelleAnciennete,
  libelleEffectif,
  libelleSource,
  libelleSourceCourt,
  LIBELLES_CATEGORIE,
  LIBELLES_STATUT,
} from "@/lib/format";
import { libelleSecteur, nomDepartement } from "@/lib/referentiels/naf";

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
    title: `${entreprise.denomination} — fiche, litiges et données publiques`,
    description: `Fiche de ${entreprise.denomination} (SIREN ${formatSiren(entreprise.siren)}) : données publiques Sirene, RNE/INPI et BODACC, indice de transparence et signalements de consommateurs.`,
  };
}

export default async function FicheEntreprise({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const base = await chargerEntreprise(slug);
  if (!base) notFound();
  if (base.slug !== slug) redirect(`/entreprises/${base.slug}`);

  const [{ entreprise, etablissements, evenements, comptes, sources }, calcul] = await Promise.all([
    detailEntreprise(base.id),
    indicesEntreprise(base.id),
  ]);
  if (!entreprise || !calcul) notFound();

  const { transparence, experience, stats } = calcul;

  // Compteur de consultation (donnée d'usage, affichée en bas de fiche).
  await prisma.entreprise.update({ where: { id: entreprise.id }, data: { vues: { increment: 1 } } });

  const [signalements, avisPublies, avisNonVerifies] = await Promise.all([
    prisma.signalement.findMany({
      where: { entrepriseId: entreprise.id, moderation: "PUBLIE" },
      orderBy: { creeLe: "desc" },
      take: 6,
    }),
    prisma.avis.findMany({
      where: { entrepriseId: entreprise.id, moderation: "PUBLIE", verifie: true },
      orderBy: { publieLe: "desc" },
      include: { signalement: { select: { reference: true, statut: true } } },
      take: 5,
    }),
    prisma.avis.findMany({
      where: { entrepriseId: entreprise.id, moderation: "PUBLIE", verifie: false },
      orderBy: { publieLe: "desc" },
      take: 10,
    }),
  ]);

  const notes = avisPublies.map((a) => a.note);
  const moyenne = notes.length ? notes.reduce((t, n) => t + n, 0) / notes.length : null;
  const distribution = [5, 4, 3, 2, 1].map((etoile) => ({
    etoile,
    pourcentage: notes.length ? Math.round((notes.filter((n) => n === etoile).length / notes.length) * 100) : 0,
  }));

  const anciennete = libelleAnciennete(entreprise.dateImmatriculation);
  const guide = construireGuide({
    categorie: "AUTRE",
    contactPrealable: "AUCUN",
    dateSignalement: new Date(),
    reference: "—",
    verifie: false,
    mediateur: entreprise.mediateur,
  });

  const experiences: Experience[] = signalements.map((s) => ({
    reference: s.reference,
    titre: `${LIBELLES_CATEGORIE[s.categorie]} — ${intituleCourt(s.categorie)}`,
    montant: s.montant ? formatMontant(Number(s.montant)) : "montant non déclaré",
    verifie: s.niveauVerification === "VERIFIE",
    meta: `${s.niveauVerification === "VERIFIE" ? "Justificatif contrôlé" : "Sans justificatif contrôlé"} · déclaré le ${formatDateLongue(s.creeLe)}`,
    reponse: s.reponseDeclaree ? "oui, selon le consommateur" : "non renseignée",
    statut: LIBELLES_STATUT[s.statut] ?? s.statut,
    statutCouleur: couleurStatut(s.statut),
    statutNote:
      s.statut === "RESOLU_CONFIRME"
        ? "Résolution confirmée par le consommateur"
        : "Statut déclaré par le consommateur",
    resume: resumeFactuel(s.categorie, s.statut, s.reponseDeclaree, s.resolutionConfirmee),
    champs: [
      { cle: "Catégorie", valeur: LIBELLES_CATEGORIE[s.categorie] },
      { cle: "Montant déclaré", valeur: s.montant ? formatMontant(Number(s.montant)) : "Non déclaré" },
      { cle: "Date de déclaration", valeur: formatDateLongue(s.creeLe) },
      {
        cle: "Vérification",
        valeur: s.niveauVerification === "VERIFIE" ? "Justificatif contrôlé" : "Aucun justificatif contrôlé",
      },
      { cle: "Réponse déclarée", valeur: s.reponseDeclaree ? "Oui" : "Non renseignée" },
      {
        cle: "Résolution",
        valeur: s.resolutionConfirmee ? "Confirmée par le consommateur" : "Non confirmée",
      },
    ],
    afficherTeaser: s.statut === "NON_RESOLU",
  }));

  const timelineCompacte = compacterParAnnee(evenements).slice(0, 4);
  const deposes = comptes.filter((c) => c.dateDepot !== null);

  const identite: { cle: string; valeur: string; source: string }[] = [
    { cle: "Dénomination sociale", valeur: entreprise.denomination, source: "SIRENE" },
    { cle: "Nom commercial", valeur: entreprise.enseigne ?? "Non déclaré", source: "SIRENE" },
    { cle: "Forme juridique", valeur: entreprise.formeJuridique ?? "Non renseignée", source: sources.get("formeJuridique")?.source ?? "SIRENE" },
    { cle: "SIREN", valeur: formatSiren(entreprise.siren), source: "SIRENE" },
    { cle: "SIRET du siège", valeur: formatSiret(entreprise.siretSiege), source: "SIRENE" },
    { cle: "N° TVA intracommunautaire", valeur: entreprise.numeroTva ?? "Non publié", source: "SIRENE" },
    {
      cle: "Activité principale (NAF)",
      valeur: entreprise.naf ? `${entreprise.naf} — ${entreprise.nafLibelle ?? ""}` : "Non renseignée",
      source: "SIRENE",
    },
    { cle: "Date d’immatriculation", valeur: formatDateLongue(entreprise.dateImmatriculation), source: "SIRENE" },
    {
      cle: "Capital social",
      valeur: entreprise.capital ? formatMontant(Number(entreprise.capital)) : "Non publié",
      source: sources.get("capital")?.source ?? "RNE",
    },
    { cle: "Effectif déclaré", valeur: libelleEffectif(entreprise.trancheEffectif), source: "SIRENE" },
    { cle: "Représentant légal", valeur: entreprise.representantLegal ?? "Non publié", source: sources.get("representantLegal")?.source ?? "RNE" },
    { cle: "Greffe de rattachement", valeur: entreprise.greffe ?? "Non renseigné", source: "RNE" },
    { cle: "Adresse du siège", valeur: entreprise.adresseSiege ?? "Non renseignée", source: "SIRENE" },
    {
      cle: "État administratif",
      valeur: `${entreprise.etatAdministratif === "ACTIVE" ? "En activité" : "Cessée"} — vérifié le ${formatDate(entreprise.syncSirene)}`,
      source: "SIRENE",
    },
  ];

  const maxTendance = Math.max(1, ...stats.tendance.map((t) => t.nombre));

  return (
    <Page
      entete={{
        baseline: "Signalement et suivi des litiges de consommation",
        recherche: true,
        valeurRecherche: entreprise.denomination,
      }}
      fil={[
        { libelle: "Annuaire des entreprises", href: "/entreprises" },
        { libelle: libelleSecteur(entreprise.secteur), href: `/entreprises?secteur=${entreprise.secteur ?? ""}` },
        { libelle: entreprise.denomination },
      ]}
    >
      {/* ── 1. Identité ──────────────────────────────────────────────────── */}
      <section className="rf-conteneur" style={{ padding: "36px 32px 32px" }}>
        <div style={{ display: "flex", gap: 40, alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 520px", minWidth: 0 }}>
            <div className="rf-ligne" style={{ gap: 8, marginBottom: 16 }}>
              <BadgeEtatEntreprise active={entreprise.etatAdministratif === "ACTIVE"} />
              <span className="rf-badge rf-badge--verifie-doux">✓ Identité vérifiée</span>
              {entreprise.nafLibelle ? (
                <span className="rf-badge rf-badge--contour">{entreprise.nafLibelle}</span>
              ) : null}
              {anciennete ? <span className="rf-badge rf-badge--contour">{anciennete}</span> : null}
            </div>
            <h1 className="rf-h1">{entreprise.denomination}</h1>
            <p className="rf-texte rf-texte--fort rf-mt-12" style={{ maxWidth: 760 }}>
              {entreprise.enseigne ? (
                <>
                  Enseigne <strong>{entreprise.enseigne}</strong> —{" "}
                </>
              ) : null}
              {entreprise.formeJuridique ?? "Entreprise"}
              {entreprise.dateImmatriculation ? ` créée en ${entreprise.dateImmatriculation.getFullYear()}` : ""}. SIREN{" "}
              {formatSiren(entreprise.siren)}
              {entreprise.commune
                ? `, siège social à ${entreprise.commune} (${entreprise.departement ?? ""})`
                : ""}
              {entreprise.nombreEtablissementsOuverts
                ? `, ${entreprise.nombreEtablissementsOuverts} établissement${entreprise.nombreEtablissementsOuverts > 1 ? "s" : ""} actif${entreprise.nombreEtablissementsOuverts > 1 ? "s" : ""}`
                : ""}
              .
            </p>
          </div>
          <div style={{ flex: "0 1 300px", display: "flex", flexDirection: "column", gap: 10 }}>
            <Link href={`/signaler?siren=${entreprise.siren}`} className="rf-btn rf-btn--primaire rf-btn--md rf-btn--bloc">
              Signaler mon litige gratuitement
            </Link>
            <div style={{ display: "flex", gap: 8 }}>
              <Link href={`/entreprises/${entreprise.slug}/suivre`} className="rf-btn rf-btn--tertiaire rf-btn--sm" style={{ flex: 1 }}>
                Suivre la fiche
              </Link>
              <Link href={`/entreprises/${entreprise.slug}/fiche.pdf`} className="rf-btn rf-btn--tertiaire rf-btn--sm" style={{ flex: 1 }}>
                Fiche PDF
              </Link>
            </div>
            <div className="rf-legende rf-centre">
              Fiche mise à jour le {formatDate(entreprise.syncSirene ?? entreprise.majLe)} · sources publiques
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. Indice de transparence ────────────────────────────────────── */}
      <section className="rf-bande--teinte">
        <div className="rf-conteneur" style={{ padding: "38px 32px 40px" }}>
          <div className="rf-ligne--entre" style={{ display: "flex", flexWrap: "wrap" }}>
            <div>
              <h2 className="rf-h2">Indice de transparence</h2>
              <p className="rf-texte rf-mt-8" style={{ fontSize: 14.5, maxWidth: 780 }}>
                Calculé uniquement à partir des registres publics : Sirene, RNE/INPI, BODACC. L’expérience des
                consommateurs est présentée à part et ne modifie pas cet indice.
              </p>
            </div>
            <Link href="/methodologie" style={{ fontSize: 13.5, fontWeight: 500 }}>
              Comprendre nos données et notre méthodologie
            </Link>
          </div>

          <div className="rf-grille rf-grille--280 rf-mt-26" style={{ alignItems: "stretch" }}>
            <div className="rf-carte--marine" style={{ padding: "26px 24px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div style={{ fontSize: 12.5, color: "var(--rf-sur-marine-attenue)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em" }}>
                Indice de transparence
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 14 }}>
                <span className="rf-nombres" style={{ fontSize: 64, fontWeight: 700, lineHeight: 1, letterSpacing: "-0.04em" }}>
                  {transparence.score}
                </span>
                <span style={{ fontSize: 19, color: "var(--rf-sur-marine-attenue)" }}>/100</span>
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, marginTop: 10 }}>
                Basé uniquement sur les données officielles et publiques
              </div>
              <div
                style={{
                  fontSize: 12.5,
                  color: "var(--rf-sur-marine)",
                  lineHeight: 1.55,
                  marginTop: 12,
                  borderTop: "1px solid var(--rf-filet-marine)",
                  paddingTop: 12,
                }}
              >
                Aucune donnée déclarative n’entre dans cet indice. Source : Sirene · RNE/INPI · BODACC.
              </div>
            </div>

            <div className="rf-carte" style={{ padding: "22px 24px" }}>
              <div className="rf-ligne--entre" style={{ display: "flex" }}>
                <div style={{ fontSize: 15.5, fontWeight: 700 }}>Données officielles</div>
                <div style={{ fontSize: 15, color: "var(--rf-texte-3)" }}>
                  <strong style={{ fontSize: 24, color: couleurScore(transparence.score), fontWeight: 700 }}>
                    {transparence.score}
                  </strong>
                  /100
                </div>
              </div>
              <div className="rf-jauge">
                <div className="rf-jauge__valeur" style={{ width: `${transparence.score}%`, background: couleurScore(transparence.score) }} />
              </div>
              <div className="rf-mt-16">
                {transparence.criteres.map((c) => (
                  <div
                    key={c.cle}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      alignItems: "baseline",
                      padding: "8px 0",
                      borderBottom: "1px solid var(--rf-ligne-carte)",
                    }}
                  >
                    <span style={{ fontSize: 13.5, color: "var(--rf-texte-2)" }}>{c.libelle}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: couleurTon(c.ton), whiteSpace: "nowrap" }}>
                      {c.valeur}
                    </span>
                  </div>
                ))}
              </div>
              <p className="rf-micro rf-mt-12" style={{ lineHeight: 1.55 }}>
                Points retenus dans l’indice de transparence. Source : Sirene · RNE/INPI · BODACC.
              </p>
            </div>

            <div className="rf-carte" style={{ padding: "22px 24px" }}>
              {experience.publie ? (
                <>
                  <div className="rf-ligne--entre" style={{ display: "flex" }}>
                    <div style={{ fontSize: 15.5, fontWeight: 700 }}>Expérience des consommateurs</div>
                    <div style={{ fontSize: 15, color: "var(--rf-texte-3)" }}>
                      <strong style={{ fontSize: 24, color: couleurScore(experience.score), fontWeight: 700 }}>
                        {experience.score}
                      </strong>
                      /100
                    </div>
                  </div>
                  <div className="rf-jauge">
                    <div
                      className="rf-jauge__valeur"
                      style={{ width: `${experience.score ?? 0}%`, background: couleurScore(experience.score) }}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="rf-ligne--entre" style={{ display: "flex", flexWrap: "wrap" }}>
                    <div style={{ fontSize: 15.5, fontWeight: 700 }}>Expérience des consommateurs</div>
                    <span className="rf-badge rf-badge--sm rf-badge--non-verifie">Non publié</span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--rf-texte-2)", marginTop: 14, lineHeight: 1.5 }}>
                    Données insuffisantes pour établir un score fiable
                  </div>
                  <p className="rf-texte rf-mt-8" style={{ fontSize: 13 }}>
                    Un score d’expérience des consommateurs est publié uniquement à partir de{" "}
                    {SEUIL_PUBLICATION_EXPERIENCE} signalements vérifiés sur douze mois.
                    {stats.manquantsPourPublication > 0
                      ? ` Il en manque ${stats.manquantsPourPublication} à ce jour.`
                      : ""}
                  </p>
                </>
              )}
              <div className="rf-mt-16" style={{ borderTop: experience.publie ? undefined : "1px solid var(--rf-ligne-carte)" }}>
                {experience.criteres.map((c) => (
                  <div
                    key={c.cle}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      alignItems: "baseline",
                      padding: "8px 0",
                      borderBottom: "1px solid var(--rf-ligne-carte)",
                    }}
                  >
                    <span style={{ fontSize: 13.5, color: experience.publie ? "var(--rf-texte-2)" : "var(--rf-texte-desactive)" }}>
                      {c.libelle}
                    </span>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: experience.publie ? couleurTon(c.ton) : "var(--rf-texte-desactive)",
                      }}
                    >
                      {experience.publie ? c.valeur : "—"}
                    </span>
                  </div>
                ))}
              </div>
              <p className="rf-micro rf-mt-12" style={{ lineHeight: 1.55 }}>
                {experience.publie
                  ? `Calculé sur les ${stats.verifies} signalements vérifiés, à partir de ce que déclarent les consommateurs. Source : déclarations consommateurs.`
                  : "Critères suivis, publiés dès le seuil atteint. Source : déclarations consommateurs sur signalements vérifiés."}
              </p>
            </div>
          </div>

          {/* Pourquoi cette note */}
          <div className="rf-carte rf-mt-16" style={{ padding: 24 }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Pourquoi cette note&nbsp;?</div>
            <div className="rf-grille rf-mt-18" style={{ gap: 28 }}>
              <div>
                <div
                  className="rf-etiquette"
                  style={{ color: "var(--rf-succes-fonce)", letterSpacing: ".06em", marginBottom: 12 }}
                >
                  Points vérifiés
                </div>
                <ul className="rf-pile rf-pile--serree" style={{ gap: 10 }}>
                  {transparence.pointsForts.length ? (
                    transparence.pointsForts.map((p) => (
                      <ItemCoche key={p} variante="succes">
                        <span style={{ fontSize: 14 }}>{p}</span>
                      </ItemCoche>
                    ))
                  ) : (
                    <li className="rf-legende">Aucun point fort particulier relevé dans les registres publics.</li>
                  )}
                </ul>
              </div>
              <div>
                <div className="rf-etiquette" style={{ color: "var(--rf-alerte)", letterSpacing: ".06em", marginBottom: 12 }}>
                  Points de vigilance
                </div>
                <ul className="rf-pile rf-pile--serree" style={{ gap: 10 }}>
                  {transparence.pointsVigilance.length ? (
                    transparence.pointsVigilance.map((p) => (
                      <ItemCoche key={p} variante="alerte">
                        <span style={{ fontSize: 14 }}>{p}</span>
                      </ItemCoche>
                    ))
                  ) : (
                    <li className="rf-legende">Aucun point de vigilance relevé dans les registres publics.</li>
                  )}
                </ul>
              </div>
            </div>
          </div>

          <div className="rf-mt-16">
            <Accordeon
              titre="Notre méthodologie"
              sousTitre="D’où viennent les chiffres, ce qu’est un signalement vérifié, comment une résolution est confirmée"
            >
              <div className="rf-grille rf-grille--280" style={{ gap: "18px 32px" }}>
                {METHODOLOGIE.map((m) => (
                  <div key={m.q} className="rf-min0">
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{m.q}</div>
                    <p className="rf-texte rf-mt-4" style={{ fontSize: 13.5 }}>
                      {m.a}
                    </p>
                  </div>
                ))}
              </div>
              <p className="rf-legende rf-mt-18 rf-separateur-haut">
                Chaque donnée affichée sur cette fiche porte sa source. Les données publiques sont réutilisées
                telles que publiées par les registres ; les données consommateurs sont présentées avec leur
                niveau de vérification.
              </p>
            </Accordeon>
          </div>
        </div>
      </section>

      {/* ── 3. Signalements consommateurs ────────────────────────────────── */}
      <section className="rf-conteneur" style={{ padding: "38px 32px 34px" }}>
        <div className="rf-ligne--entre" style={{ display: "flex", flexWrap: "wrap" }}>
          <div>
            <h2 className="rf-h2">Signalements consommateurs</h2>
            <p className="rf-legende rf-mt-6" style={{ fontSize: 14 }}>
              12 derniers mois — données déclarées par les consommateurs, agrégées et mises à jour en continu
            </p>
          </div>
          {stats.evolution90j !== null && stats.evolution90j !== 0 ? (
            <span className={`rf-badge ${stats.evolution90j > 0 ? "rf-badge--alerte" : "rf-badge--succes"}`}>
              {stats.evolution90j > 0 ? "+" : "−"} {Math.abs(Math.round(stats.evolution90j))} % de nouveaux
              signalements sur les 90 derniers jours
            </span>
          ) : null}
        </div>

        <div className="rf-tuiles rf-mt-22">
          <Tuile
            id="total"
            valeur={formatNombre(stats.total12Mois)}
            libelle="signalements consommateurs"
            base="12 derniers mois, tous niveaux"
            aide="Total des signalements déposés sur les douze derniers mois, vérifiés ou non. Un signalement par consommateur et par litige."
          />
          <Tuile
            id="verifies"
            valeur={formatNombre(stats.verifies)}
            libelle="signalements vérifiés"
            base="justificatif contrôlé par Recours France"
            aide="Signalements pour lesquels Recours France a contrôlé une pièce établissant la relation commerciale : facture, commande, contrat, preuve de paiement ou échange avec le professionnel."
          />
          <Tuile
            id="reponse"
            valeur={stats.tauxReponse === null ? "—" : formatPourcent(stats.tauxReponse)}
            libelle="des utilisateurs indiquent avoir reçu une réponse du professionnel"
            base={`base : ${stats.verifies} signalement${stats.verifies > 1 ? "s" : ""} vérifié${stats.verifies > 1 ? "s" : ""}`}
            aide="Part des signalements vérifiés pour lesquels le consommateur déclare avoir reçu une réponse du professionnel. Recours France ne reçoit pas ces réponses : l’information est déclarative."
          />
          <Tuile
            id="resolution"
            valeur={stats.tauxResolution === null ? "—" : formatPourcent(stats.tauxResolution)}
            libelle="des signalements vérifiés clôturés sont déclarés résolus"
            base={`base : ${stats.clotures} signalement${stats.clotures > 1 ? "s" : ""} clôturé${stats.clotures > 1 ? "s" : ""}`}
            aide="Part des signalements vérifiés et clôturés dont la résolution a été confirmée par le consommateur. Un signalement abandonné ou sans retour n’est jamais compté comme résolu."
          />
          <Tuile
            id="delai"
            valeur={stats.delaiMedian === null ? "—" : `${stats.delaiMedian} j`}
            libelle="de délai médian déclaré"
            base="médiane, résolutions confirmées"
            aide="Délai médian déclaré entre le signalement et la confirmation de résolution par le consommateur, sur les signalements vérifiés résolus. La médiane évite l’effet des cas extrêmes."
          />
        </div>

        <div className="rf-ligne--entre rf-mt-10" style={{ display: "flex", flexWrap: "wrap" }}>
          <span className="rf-legende">
            Un signalement abandonné, ou sans retour du consommateur, n’est jamais comptabilisé comme résolu.
          </span>
          <span className="rf-legende">Source : déclarations consommateurs</span>
        </div>

        <div className="rf-grille rf-grille--320 rf-mt-16">
          <div className="rf-carte rf-carte--douce" style={{ padding: "18px 20px" }}>
            <div className="rf-ligne" style={{ gap: 8 }}>
              <span className="rf-badge rf-badge--sm rf-badge--non-verifie">Signalement non vérifié</span>
            </div>
            <p className="rf-mt-12" style={{ fontSize: 14, lineHeight: 1.6 }}>
              Signalement déposé par un consommateur, sans vérification documentaire.
            </p>
            <p className="rf-texte rf-mt-8" style={{ fontSize: 13 }}>
              {formatNombre(stats.nonVerifies)} signalement{stats.nonVerifies > 1 ? "s" : ""} dans cette
              catégorie. Poids statistique nul dans le score d’expérience des consommateurs.
            </p>
          </div>
          <div className="rf-carte rf-carte--selection" style={{ padding: "17px 19px" }}>
            <div className="rf-ligne" style={{ gap: 8 }}>
              <span className="rf-badge rf-badge--verifie">✓ Signalement vérifié</span>
            </div>
            <p className="rf-mt-12" style={{ fontSize: 14, lineHeight: 1.6 }}>
              Justificatif contrôlé par Recours France : facture, commande, contrat, échange professionnel ou
              preuve de paiement établissant la réalité du signalement.
            </p>
            <p className="rf-texte rf-mt-8" style={{ fontSize: 13 }}>
              {formatNombre(stats.verifies)} signalement{stats.verifies > 1 ? "s" : ""} vérifié
              {stats.verifies > 1 ? "s" : ""}. Seule base de calcul des statistiques publiées.
            </p>
          </div>
        </div>
      </section>

      {/* ── 4. Appel à l'action ──────────────────────────────────────────── */}
      <section className="rf-bande--marine">
        <div
          className="rf-conteneur"
          style={{
            padding: "44px 32px 40px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(330px, 1fr))",
            gap: 44,
            alignItems: "center",
          }}
        >
          <div>
            <h2 className="rf-h2--marine">Vous avez un problème avec {entreprise.denomination}&nbsp;?</h2>
            <p style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.45, marginTop: 16, maxWidth: 660 }}>
              Signalez gratuitement votre litige et obtenez les démarches à effectuer pour tenter de le
              résoudre correctement.
            </p>
            <p style={{ fontSize: 15.5, color: "var(--rf-sur-marine)", lineHeight: 1.65, marginTop: 12, maxWidth: 660 }}>
              Recours France vous aide à structurer votre situation, identifier les justificatifs utiles et
              suivre les principales étapes de recours disponibles.
            </p>
            {stats.total12Mois > 0 ? (
              <div
                className="rf-ligne rf-mt-22"
                style={{ gap: 11, borderTop: "1px solid var(--rf-filet-marine)", paddingTop: 18, maxWidth: 660 }}
              >
                <span style={{ width: 9, height: 9, background: "var(--rf-barre-neutre)", display: "block", flex: "none" }} />
                <span style={{ fontSize: 14, color: "var(--rf-sur-marine)", lineHeight: 1.5 }}>
                  {formatNombre(stats.total12Mois)} consommateur{stats.total12Mois > 1 ? "s ont" : " a"} déjà
                  signalé un litige avec cette entreprise.
                </span>
              </div>
            ) : null}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 380, width: "100%", justifySelf: "end" }}>
            <Link href={`/signaler?siren=${entreprise.siren}`} className="rf-btn rf-btn--sur-marine rf-btn--xl rf-btn--bloc">
              Signaler mon litige gratuitement
            </Link>
            <span className="rf-centre" style={{ fontSize: 13.5, color: "var(--rf-sur-marine-attenue)", lineHeight: 1.5 }}>
              Gratuit · 3 à 5 minutes · Justificatifs facultatifs
            </span>
            <div className="rf-centre" style={{ borderTop: "1px solid var(--rf-filet-marine)", paddingTop: 13, marginTop: 6 }}>
              <Link href={`/entreprises/${entreprise.slug}/avis`} style={{ color: "var(--rf-sur-marine-attenue)", fontSize: 13, fontWeight: 500 }}>
                Laisser seulement un avis
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. Après votre signalement ───────────────────────────────────── */}
      <section className="rf-bande--teinte" style={{ borderTop: 0 }}>
        <div className="rf-conteneur" style={{ padding: "32px 32px 34px" }}>
          <div className="rf-ligne--entre" style={{ display: "flex", flexWrap: "wrap" }}>
            <h2 className="rf-h2 rf-h2--secondaire">
              Après votre signalement, Recours France vous indique gratuitement :
            </h2>
            <span className="rf-legende">Immédiatement, à la fin du signalement</span>
          </div>
          <ul className="rf-grille rf-grille--large rf-mt-22">
            {APRES_SIGNALEMENT.map((item) => (
              <ItemCoche key={item}>
                <span style={{ fontSize: 14.5 }}>{item}</span>
              </ItemCoche>
            ))}
          </ul>
          <p className="rf-encart rf-mt-24">
            Un avis raconte votre problème.{" "}
            <strong>Un signalement Recours France vous aide à l’organiser et à agir.</strong>
          </p>
        </div>
      </section>

      {/* ── 6. Expérience des consommateurs ──────────────────────────────── */}
      <section className="rf-conteneur" style={{ padding: "38px 32px 34px" }}>
        <h2 className="rf-h2">Expérience des consommateurs</h2>
        <p className="rf-texte rf-mt-8" style={{ fontSize: 14.5, maxWidth: 780 }}>
          Ce que déclarent les consommateurs après leur signalement, sur les {stats.verifies} signalement
          {stats.verifies > 1 ? "s" : ""} vérifié{stats.verifies > 1 ? "s" : ""} des douze derniers mois.
          Recours France ne transmet pas encore les réclamations aux professionnels et ne reçoit pas leurs
          réponses : ces données sont déclaratives.
        </p>
        <div className="rf-grille rf-mt-22" style={{ alignItems: "stretch" }}>
          <div className="rf-carte">
            {[
              { label: "Réponse du professionnel déclarée", value: stats.tauxReponse === null ? "—" : formatPourcent(stats.tauxReponse), ton: "alerte" },
              { label: "Résolution confirmée par le consommateur", value: stats.tauxResolution === null ? "—" : formatPourcent(stats.tauxResolution), ton: "alerte" },
              { label: "Délai médian déclaré", value: stats.delaiMedian === null ? "—" : `${stats.delaiMedian} jours`, ton: "succes" },
              { label: "Signalements déclarés non résolus", value: stats.tauxNonResolus === null ? "—" : formatPourcent(stats.tauxNonResolus), ton: "erreur" },
              { label: "Dernier signalement enregistré", value: stats.dernierSignalement ? ilYA(stats.dernierSignalement) : "aucun", ton: "neutre" },
              { label: "Signalements non vérifiés, hors calcul", value: formatNombre(stats.nonVerifies), ton: "neutre" },
            ].map((l) => (
              <div
                key={l.label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 16,
                  padding: "15px 22px",
                  borderBottom: "1px solid var(--rf-ligne-carte)",
                }}
              >
                <span style={{ fontSize: 14.5 }}>{l.label}</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: couleurTon(l.ton as never), whiteSpace: "nowrap" }}>
                  {l.value}
                </span>
              </div>
            ))}
            <p className="rf-carte__pied" style={{ borderTop: 0 }}>
              Une résolution n’est comptabilisée comme telle qu’après confirmation du consommateur.
            </p>
          </div>
          <div className="rf-carte rf-carte--legere" style={{ padding: 24 }}>
            <span className="rf-badge rf-badge--non-verifie" style={{ fontSize: 13 }}>
              Ce que Recours France ne fait pas encore
            </span>
            <p className="rf-mt-16" style={{ fontSize: 15, lineHeight: 1.65 }}>
              La plateforme ne transmet pas votre réclamation au professionnel, ne recueille pas sa réponse et
              ne suit pas la procédure à votre place. Les professionnels ne peuvent pas encore répondre aux
              signalements.
            </p>
            <p className="rf-texte rf-mt-12" style={{ fontSize: 13.5 }}>
              Elle documente votre litige et vous indique les démarches à effectuer, dans le bon ordre. Vous
              restez à l’initiative de chaque étape, et vous déclarez ce que vous obtenez.
            </p>
            <p className="rf-mt-14">
              <Link href="/methodologie" style={{ fontSize: 13.5, fontWeight: 600 }}>
                Comprendre nos données et notre méthodologie
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* ── 7. Motifs et tendances ───────────────────────────────────────── */}
      {stats.total12Mois > 0 ? (
        <section className="rf-bande--legere">
          <div className="rf-conteneur" style={{ padding: "38px 32px" }}>
            <h2 className="rf-h2">Principaux motifs et tendances</h2>
            <div className="rf-grille rf-grille--320 rf-mt-24" style={{ gap: 40 }}>
              <div>
                {stats.motifs.map((m, i) => (
                  <div key={m.cle} style={{ marginBottom: 16 }}>
                    <div className="rf-ligne--entre" style={{ display: "flex", marginBottom: 7 }}>
                      <span style={{ fontSize: 14.5, fontWeight: 500 }}>{m.libelle}</span>
                      <span className="rf-nombres rf-legende" style={{ fontSize: 13, whiteSpace: "nowrap" }}>
                        {m.pourcentage} % · {m.nombre} litige{m.nombre > 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="rf-barre">
                      <div
                        className="rf-barre__valeur"
                        style={{
                          width: `${m.pourcentage}%`,
                          background: i < 3 ? "var(--rf-cobalt)" : i < 5 ? "var(--rf-cobalt-fonce)" : "var(--rf-texte-desactive)",
                        }}
                      />
                    </div>
                  </div>
                ))}
                <p className="rf-legende rf-mt-4">
                  Répartition sur les {stats.total12Mois} signalements des douze derniers mois. Données
                  agrégées, aucun détail nominatif. Source : déclarations consommateurs.
                </p>
              </div>
              <div>
                <div className="rf-etiquette" style={{ fontSize: 13, color: "var(--rf-encre)", letterSpacing: ".06em" }}>
                  Signalements par mois
                </div>
                <div className="rf-histogramme">
                  {stats.tendance.map((t, i) => (
                    <div key={t.mois} className="rf-histogramme__colonne">
                      <span className="rf-nombres" style={{ fontSize: 11, color: "var(--rf-texte-3)" }}>
                        {t.nombre}
                      </span>
                      <div
                        className="rf-histogramme__barre"
                        style={{
                          height: `${Math.round((t.nombre / maxTendance) * 96)}px`,
                          background: i >= 9 ? "var(--rf-alerte)" : "var(--rf-barre-neutre)",
                        }}
                      />
                    </div>
                  ))}
                </div>
                <div className="rf-histogramme__legendes">
                  {stats.tendance.map((t) => (
                    <div key={`l-${t.mois}`}>{t.libelle}</div>
                  ))}
                </div>
                {stats.evolution90j !== null && stats.evolution90j > 10 ? (
                  <div className="rf-encart rf-encart--alerte rf-mt-20">
                    La hausse récente porte principalement sur {stats.motifs[0]?.libelle.toLowerCase() ?? "les litiges déclarés"}.
                    Les trois derniers mois se situent au-dessus de la moyenne des douze derniers mois.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* ── 8. Expériences documentées ───────────────────────────────────── */}
      <section className="rf-conteneur" style={{ padding: "38px 32px 34px" }}>
        <div className="rf-ligne--entre" style={{ display: "flex", flexWrap: "wrap" }}>
          <div>
            <h2 className="rf-h2">Expériences documentées</h2>
            <p className="rf-legende rf-mt-6" style={{ fontSize: 14 }}>
              Signalements structurés : catégorie, montant, date, réponse déclarée, statut déclaré et niveau de
              vérification
            </p>
          </div>
        </div>

        {experiences.length ? (
          <ListeExperiences experiences={experiences} />
        ) : (
          <div className="rf-carte rf-mt-22" style={{ padding: "28px 24px" }}>
            <p style={{ fontSize: 15, fontWeight: 600 }}>Aucun signalement publié pour cette entreprise.</p>
            <p className="rf-texte rf-mt-8">
              Les signalements apparaissent ici sous forme structurée, sans aucun texte libre du consommateur.
              Si vous rencontrez un litige avec cette entreprise, vous pouvez le signaler gratuitement.
            </p>
          </div>
        )}

        <div className="rf-mt-14">
          <Accordeon titre="Comprendre les statuts déclarés" variante="compact">
            <div className="rf-grille rf-grille--260" style={{ gap: "12px 28px" }}>
              {STATUTS_EXPLIQUES.map((s) => (
                <div key={s.libelle} className="rf-item" style={{ gap: 11 }}>
                  <span style={{ width: 8, height: 8, background: s.ton, display: "block", marginTop: 7, flex: "none" }} />
                  <div className="rf-min0">
                    <div style={{ fontSize: 13.5, fontWeight: 700 }}>{s.libelle}</div>
                    <div className="rf-legende" style={{ lineHeight: 1.5, marginTop: 2 }}>
                      {s.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <p className="rf-legende rf-mt-16 rf-separateur-haut">
              Tous les statuts sont déclarés par le consommateur : Recours France ne les vérifie pas auprès du
              professionnel. Une résolution n’est comptabilisée qu’après confirmation du consommateur. Les
              montants sont déclaratifs et facultatifs.
            </p>
          </Accordeon>
        </div>
      </section>

      {/* ── 9. Données publiques et historique ───────────────────────────── */}
      <section className="rf-bande--legere">
        <div className="rf-conteneur" style={{ padding: "38px 32px" }}>
          <div className="rf-ligne--entre" style={{ display: "flex", flexWrap: "wrap" }}>
            <h2 className="rf-h2">Données publiques et historique</h2>
            <span className="rf-legende">Sources : Sirene · INPI/RNE · BODACC · données publiques</span>
          </div>
          <div className="rf-grille rf-grille--320 rf-mt-22" style={{ alignItems: "start" }}>
            <div className="rf-carte">
              <div className="rf-carte__tete rf-carte__tete--simple">
                <span style={{ fontSize: 14, fontWeight: 700 }}>Synthèse administrative</span>
                <span className="rf-micro">Source : Sirene · RNE/INPI</span>
              </div>
              {syntheseAdministrative(entreprise, deposes, evenements).map((s) => (
                <div
                  key={s.texte}
                  className="rf-item"
                  style={{ padding: "13px 22px", borderBottom: "1px solid var(--rf-ligne-carte)", gap: 12 }}
                >
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: s.ton, display: "block", marginTop: 7, flex: "none" }} />
                  <span style={{ fontSize: 14.5, lineHeight: 1.5 }}>{s.texte}</span>
                </div>
              ))}
            </div>

            <div className="rf-carte">
              <div className="rf-carte__tete rf-carte__tete--simple">
                <span style={{ fontSize: 14, fontWeight: 700 }}>Événements enregistrés</span>
                <span className="rf-micro">Source : BODACC · RNE/INPI</span>
              </div>
              {timelineCompacte.length ? (
                <div style={{ padding: "18px 22px 6px" }}>
                  {timelineCompacte.map((e) => (
                    <div key={`${e.annee}-${e.titre}`} className="rf-chrono rf-chrono--annees">
                      <div className="rf-chrono__date rf-chrono__date--annee">{e.annee}</div>
                      <div className="rf-chrono__axe" style={{ paddingBottom: 20 }}>
                        <span className="rf-chrono__pastille" style={{ marginTop: 5 }} />
                      </div>
                      <div className="rf-chrono__contenu" style={{ paddingBottom: 20 }}>
                        <div style={{ fontSize: 14.5, fontWeight: 500 }}>{e.titre}</div>
                        <div className="rf-legende rf-mt-4">{e.source}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rf-carte__pied" style={{ borderTop: 0 }}>
                  Aucun événement légal publié pour cette entreprise dans les sources consultées.
                </p>
              )}

              {evenements.length > 0 ? (
                <Accordeon
                  variante="pied"
                  titre="Historique complet"
                  libelleFerme={`Voir l’historique complet (${evenements.length} événements)`}
                  libelleOuvert="Masquer l’historique complet"
                >
                  {evenements.map((e) => {
                    const couleurs = couleursSource(e.source);
                    return (
                      <div key={e.id} className="rf-chrono">
                        <div className="rf-chrono__date">{formatDateCourte(e.date)}</div>
                        <div className="rf-chrono__axe">
                          <span className="rf-chrono__pastille" style={{ background: couleurs.texte }} />
                        </div>
                        <div className="rf-chrono__contenu">
                          <div className="rf-ligne" style={{ gap: 9 }}>
                            <span style={{ fontSize: 14.5, fontWeight: 700 }}>{e.titre}</span>
                            <span
                              className="rf-badge rf-badge--xs"
                              style={{ color: couleurs.texte, background: couleurs.fond }}
                            >
                              {libelleSourceCourt(e.source)}
                            </span>
                          </div>
                          {e.detail ? (
                            <p className="rf-texte rf-mt-4" style={{ fontSize: 13 }}>
                              {e.detail}
                            </p>
                          ) : null}
                          <div className="rf-ligne rf-mt-6" style={{ gap: 14 }}>
                            {e.reference ? <span className="rf-mono rf-micro">{e.reference}</span> : null}
                            {e.urlSource ? (
                              <a href={e.urlSource} target="_blank" rel="noreferrer noopener" style={{ fontSize: 12.5, fontWeight: 600 }}>
                                Pièce justificative
                              </a>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </Accordeon>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* ── 10. Médiateur et démarches ───────────────────────────────────── */}
      <section className="rf-conteneur" style={{ padding: "38px 32px 34px" }}>
        <h2 className="rf-h2">Médiateur et démarches utiles</h2>
        <div className="rf-grille rf-grille--320 rf-mt-22" style={{ alignItems: "start" }}>
          <div className="rf-carte" style={{ padding: 24 }}>
            {entreprise.mediateur ? (
              <>
                <div className="rf-ligne--entre" style={{ display: "flex", alignItems: "flex-start" }}>
                  <div style={{ fontSize: 19, fontWeight: 700, lineHeight: 1.3 }}>{entreprise.mediateur.nom}</div>
                  <span className={`rf-badge rf-badge--sm ${entreprise.mediateurAdhesionDepuis ? "rf-badge--succes" : "rf-badge--non-verifie"}`}>
                    {entreprise.mediateurAdhesionDepuis ? "Déclaré par l’entreprise" : "Compétence présumée"}
                  </span>
                </div>
                <p className="rf-texte rf-mt-8" style={{ fontSize: 13.5 }}>
                  {entreprise.mediateurAdhesionDepuis
                    ? "Médiateur déclaré par l’entreprise et retrouvé dans la liste publique des médiateurs de la consommation."
                    : "Médiateur référencé pour ce secteur d’activité dans la liste publique des médiateurs de la consommation. Vérifiez le médiateur indiqué dans les conditions générales du professionnel avant toute saisine."}{" "}
                  Recours France n’intervient pas dans la médiation : la démarche reste à l’initiative du
                  consommateur.
                </p>
                <div className="rf-mt-16" style={{ borderTop: "1px solid var(--rf-ligne-carte)" }}>
                  {[
                    { k: "Rattachement", v: entreprise.mediateurAdhesionDepuis ?? "D’après le secteur d’activité" },
                    { k: "Délai d’instruction", v: entreprise.mediateur.delaiInstruction ?? "90 jours" },
                    { k: "Coût pour le consommateur", v: entreprise.mediateur.coutConsommateur ?? "Gratuit" },
                    { k: "Condition préalable", v: entreprise.mediateur.conditionPrealable ?? "Réclamation écrite restée sans réponse" },
                  ].map((row) => (
                    <div key={row.k} className="rf-carte__rangee">
                      <span className="rf-carte__rangee-cle" style={{ fontSize: 13.5 }}>
                        {row.k}
                      </span>
                      <span className="rf-carte__rangee-valeur" style={{ fontSize: 14 }}>
                        {row.v}
                      </span>
                    </div>
                  ))}
                </div>
                {entreprise.mediateur.siteWeb ? (
                  <a
                    href={entreprise.mediateur.siteWeb}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="rf-btn rf-btn--secondaire rf-btn--bloc rf-mt-18"
                  >
                    Consulter le site du médiateur
                  </a>
                ) : null}
                <p className="rf-micro rf-mt-12">
                  Source : {libelleSource("MEDIATEURS")} — vérifié le {formatDate(entreprise.syncMediateurs)}
                </p>
              </>
            ) : (
              <>
                <div style={{ fontSize: 19, fontWeight: 700, lineHeight: 1.3 }}>Médiateur non identifié</div>
                <p className="rf-texte rf-mt-8" style={{ fontSize: 13.5 }}>
                  Aucun médiateur de la consommation n’a pu être rattaché à cette entreprise à partir de la
                  liste publique. Le médiateur compétent doit figurer dans les conditions générales du
                  professionnel et sur son site internet : la loi l’oblige à le communiquer.
                </p>
                <a
                  href="https://www.economie.gouv.fr/mediation-conso"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="rf-btn rf-btn--secondaire rf-btn--bloc rf-mt-18"
                >
                  Consulter la liste officielle des médiateurs
                </a>
              </>
            )}
          </div>

          <div className="rf-carte">
            <Accordeon titre="Les démarches possibles, dans l’ordre" ouvertParDefaut>
              {guide.etapes.map((e) => (
                <div
                  key={e.numero}
                  style={{ display: "grid", gridTemplateColumns: "30px minmax(0,1fr)", gap: 16, alignItems: "flex-start", paddingTop: 18 }}
                >
                  <div style={{ position: "relative", display: "flex", justifyContent: "center", alignSelf: "stretch", paddingBottom: 18 }}>
                    <span className="rf-pastille rf-pastille--claire" style={{ position: "relative", zIndex: 1 }}>
                      {e.numero}
                    </span>
                  </div>
                  <div style={{ paddingBottom: 18, borderBottom: "1px solid var(--rf-ligne-carte)", minWidth: 0 }}>
                    <div className="rf-ligne" style={{ gap: 10 }}>
                      <span style={{ fontSize: 15, fontWeight: 700 }}>{e.titre}</span>
                      <span className="rf-legende">· {e.delai}</span>
                    </div>
                    <p className="rf-texte rf-mt-4" style={{ fontSize: 13.5 }}>
                      {e.description}
                    </p>
                  </div>
                </div>
              ))}
              <p className="rf-legende rf-mt-14">
                Chaque étape conditionne la suivante : la médiation n’est recevable qu’après réclamation écrite
                restée sans réponse. Ces informations sont générales et ne constituent pas une consultation
                juridique.
              </p>
            </Accordeon>
          </div>
        </div>
      </section>

      {/* ── 11. Avis consommateurs ───────────────────────────────────────── */}
      <section className="rf-bande--legere">
        <div className="rf-conteneur" style={{ padding: "38px 32px" }}>
          <div className="rf-ligne--entre" style={{ display: "flex", flexWrap: "wrap" }}>
            <h2 className="rf-h2">Avis consommateurs</h2>
            <span className="rf-legende">Appréciations subjectives, distinctes des expériences documentées</span>
          </div>
          <div className="rf-grille rf-grille--260 rf-mt-24" style={{ gap: 32, alignItems: "start" }}>
            <div>
              <div className="rf-ligne" style={{ gap: 10, alignItems: "baseline" }}>
                <span className="rf-nombres" style={{ fontSize: 52, fontWeight: 700, lineHeight: 1, letterSpacing: "-0.04em" }}>
                  {moyenne === null ? "—" : moyenne.toFixed(1).replace(".", ",")}
                </span>
                <span style={{ fontSize: 16, color: "var(--rf-texte-3)" }}>/ 5</span>
              </div>
              <div className="rf-mt-8" style={{ fontSize: 18 }}>
                <Etoiles note={moyenne ?? 0} />
              </div>
              <p className="rf-texte rf-mt-8" style={{ fontSize: 13.5 }}>
                {avisPublies.length} avis rattaché{avisPublies.length > 1 ? "s" : ""} à un signalement vérifié
                <br />
                {avisNonVerifies.length} avis non vérifié{avisNonVerifies.length > 1 ? "s" : ""}, exclu
                {avisNonVerifies.length > 1 ? "s" : ""} de la moyenne
              </p>
              <div className="rf-mt-18 rf-pile rf-pile--serree" style={{ gap: 8 }}>
                {distribution.map((d) => (
                  <div key={d.etoile} className="rf-ligne" style={{ gap: 10, flexWrap: "nowrap" }}>
                    <span className="rf-nombres rf-legende" style={{ width: 28 }}>
                      {d.etoile} ★
                    </span>
                    <span style={{ flex: 1, height: 8, background: "var(--rf-separateur)" }}>
                      <span style={{ display: "block", height: 8, background: "var(--rf-barre-neutre)", width: `${d.pourcentage}%` }} />
                    </span>
                    <span className="rf-nombres rf-legende rf-droite" style={{ width: 32 }}>
                      {d.pourcentage} %
                    </span>
                  </div>
                ))}
              </div>
              <Link href={`/entreprises/${entreprise.slug}/avis`} className="rf-btn rf-btn--secondaire rf-btn--bloc rf-mt-18">
                Laisser un avis
              </Link>
            </div>

            <div className="rf-pile" style={{ gap: 14 }}>
              {avisPublies.length ? (
                avisPublies.map((a) => (
                  <article key={a.id} className="rf-carte" style={{ padding: "16px 18px" }}>
                    <div className="rf-ligne--entre" style={{ display: "flex", flexWrap: "wrap" }}>
                      <div className="rf-ligne" style={{ gap: 10, alignItems: "baseline" }}>
                        <span style={{ fontSize: 14 }}>
                          <Etoiles note={a.note} />
                        </span>
                        <span style={{ fontSize: 13.5, fontWeight: 700 }}>{a.auteur}</span>
                        <span className="rf-legende">
                          {a.ville ? `${a.ville} · ` : ""}
                          {formatDateLongue(a.publieLe ?? a.creeLe)}
                        </span>
                      </div>
                      <span className="rf-badge rf-badge--xs rf-badge--verifie-doux">
                        ✓ Rattaché à un signalement vérifié
                      </span>
                    </div>
                    <p className="rf-texte rf-mt-8" style={{ fontSize: 13.5, lineHeight: 1.65 }}>
                      {a.texte}
                    </p>
                    {a.signalement ? (
                      <div className="rf-ligne rf-mt-10" style={{ gap: 12 }}>
                        <span className="rf-mono rf-micro">
                          Signalement {a.signalement.reference} — justificatif contrôlé
                        </span>
                        <span className={classeBadgeStatut(a.signalement.statut)}>
                          {LIBELLES_STATUT[a.signalement.statut]}, selon le consommateur
                        </span>
                      </div>
                    ) : null}
                  </article>
                ))
              ) : (
                <div className="rf-carte" style={{ padding: "20px 22px" }}>
                  <p style={{ fontSize: 14.5, fontWeight: 600 }}>Aucun avis vérifié publié pour l’instant.</p>
                  <p className="rf-texte rf-mt-6" style={{ fontSize: 13.5 }}>
                    Seuls les avis rattachés à un signalement vérifié entrent dans la moyenne publiée.
                  </p>
                </div>
              )}

              {avisNonVerifies.length ? (
                <Accordeon
                  variante="compact"
                  titre="Avis non vérifiés"
                  libelleFerme={`Afficher les ${avisNonVerifies.length} avis non vérifiés`}
                  libelleOuvert="Masquer les avis non vérifiés"
                >
                  <p className="rf-legende">
                    Ces avis proviennent d’utilisateurs sans signalement vérifié. Ils n’entrent ni dans la
                    moyenne, ni dans les statistiques publiées.
                  </p>
                  {avisNonVerifies.map((u) => (
                    <div key={u.id} className="rf-mt-14 rf-separateur-haut">
                      <div className="rf-ligne" style={{ gap: 10, alignItems: "baseline" }}>
                        <span style={{ fontSize: 14 }}>
                          <Etoiles note={u.note} gris />
                        </span>
                        <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--rf-texte-2)" }}>{u.auteur}</span>
                        <span className="rf-legende">{formatDateLongue(u.publieLe ?? u.creeLe)}</span>
                        <span className="rf-badge rf-badge--xs rf-badge--non-verifie">Non vérifié</span>
                      </div>
                      <p className="rf-texte rf-mt-6" style={{ fontSize: 13.5 }}>
                        {u.texte}
                      </p>
                    </div>
                  ))}
                </Accordeon>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* ── 12. Informations légales détaillées ──────────────────────────── */}
      <section className="rf-conteneur" style={{ padding: "34px 32px 48px" }}>
        <Accordeon
          titre="Informations légales détaillées"
          sousTitre="Identité complète, établissements, dépôts de comptes, coordonnées déclarées"
        >
          <div className="rf-grille" style={{ gap: 0, marginTop: -20, marginLeft: -24, marginRight: -24 }}>
            {identite.map((row) => (
              <div
                key={row.cle}
                style={{
                  display: "flex",
                  gap: 16,
                  padding: "12px 24px",
                  borderBottom: "1px solid var(--rf-ligne-carte)",
                  alignItems: "baseline",
                }}
              >
                <div style={{ flex: "0 0 40%", minWidth: 0, fontSize: 13, color: "var(--rf-texte-3)" }}>
                  {row.cle}
                  <span className="rf-micro" style={{ display: "block" }}>
                    {libelleSource(row.source)}
                  </span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 500, minWidth: 0 }}>{row.valeur}</div>
              </div>
            ))}
          </div>

          <div className="rf-grille rf-grille--280 rf-mt-20">
            <div className="rf-carte--filet-sarcelle" style={{ padding: "16px 18px" }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Établissements</div>
              <p className="rf-texte rf-mt-6" style={{ fontSize: 13.5 }}>
                {etablissements.length
                  ? `${etablissements.filter((e) => e.estSiege).length} siège social${entreprise.commune ? ` (${entreprise.commune})` : ""} et ${etablissements.filter((e) => !e.estSiege && e.actif).length} établissement(s) actif(s) connus : ${etablissements
                      .filter((e) => !e.estSiege && e.actif)
                      .slice(0, 5)
                      .map((e) => `${e.commune ?? "—"}${e.departement ? ` (${e.departement})` : ""}`)
                      .join(", ") || "aucun autre établissement recensé"}.`
                  : `${entreprise.nombreEtablissementsOuverts} établissement(s) ouvert(s) selon le répertoire Sirene.`}
              </p>
            </div>
            <div className="rf-carte--filet-sarcelle" style={{ padding: "16px 18px" }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Comptes annuels</div>
              <p className="rf-texte rf-mt-6" style={{ fontSize: 13.5 }}>
                {comptes.length
                  ? `Exercices connus : ${comptes.map((c) => c.exercice).join(", ")}.${
                      comptes[0]?.chiffreAffaires
                        ? ` Chiffre d’affaires ${comptes[0].exercice} : ${formatMontant(Number(comptes[0].chiffreAffaires))}.`
                        : ""
                    }${comptes.some((c) => c.confidentiel) ? " Au moins un dépôt est accompagné d’une déclaration de confidentialité." : ""}`
                  : "Aucun dépôt de comptes trouvé dans les annonces BODACC consultées."}
              </p>
            </div>
            <div className="rf-carte--filet-sarcelle" style={{ padding: "16px 18px" }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Coordonnées déclarées</div>
              <p className="rf-texte rf-mt-6" style={{ fontSize: 13.5 }}>
                {entreprise.adresseSiege ?? "Adresse non publiée"}
                {entreprise.emailReclamation ? ` · ${entreprise.emailReclamation}` : ""}
                {entreprise.telephoneReclamation ? ` · ${entreprise.telephoneReclamation}` : ""}
                {!entreprise.emailReclamation && !entreprise.telephoneReclamation
                  ? " · aucune coordonnée de service consommateurs identifiée à ce jour"
                  : ""}
              </p>
              {entreprise.siteWeb ? (
                <p className="rf-micro rf-mt-6">
                  Source : {libelleSource("SITE_OFFICIEL")} — vérifié le {formatDate(entreprise.syncSiteOfficiel)}
                </p>
              ) : null}
            </div>
          </div>

          <div className="rf-ligne rf-mt-20" style={{ gap: 18, fontSize: 13.5 }}>
            <Link href={`/api/entreprises/${entreprise.siren}`} style={{ fontWeight: 600 }}>
              Accéder aux données brutes (API)
            </Link>
            <Link href={`/entreprises/${entreprise.slug}/signaler-une-erreur`} style={{ fontWeight: 600 }}>
              Signaler une erreur sur cette fiche
            </Link>
            <Link href={`/entreprises/${entreprise.slug}/revendiquer`} style={{ fontWeight: 600 }}>
              Revendiquer cette entreprise
            </Link>
          </div>
        </Accordeon>

        <div className="rf-ligne--entre rf-mt-14" style={{ display: "flex", flexWrap: "wrap", fontSize: 12, color: "var(--rf-texte-3)" }}>
          <span>
            Dernière synchronisation des sources publiques : Sirene {formatDate(entreprise.syncSirene)} ·
            INPI/RNE {entreprise.syncRne ? formatDate(entreprise.syncRne) : "non connectée"} · BODACC{" "}
            {formatDate(entreprise.syncBodacc)}
          </span>
          <span className="rf-nombres">Fiche consultée {formatNombre(entreprise.vues)} fois</span>
        </div>
      </section>
    </Page>
  );
}

// ── Aides d'affichage ───────────────────────────────────────────────────────

function intituleCourt(categorie: string): string {
  switch (categorie) {
    case "REMBOURSEMENT":
      return "remboursement non reçu";
    case "LIVRAISON":
      return "problème de livraison";
    case "GARANTIE":
      return "garantie contestée";
    case "SAV":
      return "service après-vente";
    case "RESILIATION":
      return "résiliation contestée";
    default:
      return "pratique contestée";
  }
}

/**
 * Résumé factuel produit par la plateforme à partir des seules données
 * structurées : aucun texte libre du consommateur n'est publié (règle n° 7).
 */
function resumeFactuel(
  categorie: string,
  statut: string,
  reponse: boolean,
  resolu: boolean,
): string {
  const objet =
    categorie === "REMBOURSEMENT"
      ? "Un remboursement déclaré non reçu"
      : categorie === "LIVRAISON"
        ? "Une livraison déclarée non conforme ou en retard"
        : categorie === "GARANTIE"
          ? "Une prise en charge au titre de la garantie déclarée refusée"
          : categorie === "SAV"
            ? "Une intervention de service après-vente déclarée non assurée"
            : categorie === "RESILIATION"
              ? "Une résiliation déclarée refusée ou des prélèvements poursuivis"
              : "Un litige de consommation déclaré";

  const suite = reponse
    ? "Le consommateur déclare avoir reçu une réponse du professionnel."
    : "Le consommateur ne déclare aucune réponse du professionnel à ce jour.";

  const fin = resolu
    ? "La résolution a été confirmée par le consommateur après clôture."
    : statut === "NON_RESOLU"
      ? "Aucune résolution n’a été confirmée : le signalement est déclaré non résolu."
      : "Aucune résolution n’a été confirmée à ce jour.";

  return `${objet}. ${suite} ${fin}`;
}

function compacterParAnnee(
  evenements: { date: Date; titre: string; source: string; detail: string | null }[],
): { annee: number; titre: string; source: string }[] {
  const vues = new Set<number>();
  const resultat: { annee: number; titre: string; source: string }[] = [];
  for (const e of evenements) {
    const annee = e.date.getFullYear();
    if (vues.has(annee)) continue;
    vues.add(annee);
    resultat.push({
      annee,
      titre: e.titre,
      source: `${libelleSourceCourt(e.source)}${e.detail ? ` — ${e.detail.slice(0, 60)}${e.detail.length > 60 ? "…" : ""}` : ""}`,
    });
  }
  return resultat;
}

function syntheseAdministrative(
  entreprise: {
    etatAdministratif: string;
    dateImmatriculation: Date | null;
    commune: string | null;
    nombreEtablissementsOuverts: number;
  },
  comptes: { exercice: number }[],
  evenements: { procedureCollective: boolean; titre: string; date: Date }[],
): { texte: string; ton: string }[] {
  const lignes: { texte: string; ton: string }[] = [];
  const active = entreprise.etatAdministratif === "ACTIVE";

  lignes.push({
    texte: active
      ? "Société active, immatriculée au registre national des entreprises"
      : "Société déclarée cessée dans le répertoire Sirene",
    ton: active ? "var(--rf-succes)" : "var(--rf-erreur)",
  });

  if (entreprise.dateImmatriculation) {
    const ans = Math.floor((Date.now() - entreprise.dateImmatriculation.getTime()) / (365.25 * 86_400_000));
    lignes.push({
      texte: `Créée en ${entreprise.dateImmatriculation.getFullYear()} — ${ans} an${ans > 1 ? "s" : ""} d’activité`,
      ton: ans >= 5 ? "var(--rf-succes)" : "var(--rf-cobalt)",
    });
  }

  lignes.push(
    comptes.length
      ? { texte: `Derniers comptes déposés : exercice ${comptes[0].exercice}`, ton: "var(--rf-succes)" }
      : { texte: "Aucun dépôt de comptes annuels trouvé au BODACC", ton: "var(--rf-alerte)" },
  );

  if (entreprise.nombreEtablissementsOuverts > 1) {
    lignes.push({
      texte: `${entreprise.nombreEtablissementsOuverts} établissements ouverts selon le répertoire Sirene`,
      ton: "var(--rf-cobalt)",
    });
  }

  const procedure = evenements.find((e) => e.procedureCollective);
  lignes.push(
    procedure
      ? {
          texte: `Procédure collective publiée le ${formatDate(procedure.date)} : ${procedure.titre}`,
          ton: "var(--rf-erreur)",
        }
      : {
          texte: "Aucun événement collectif détecté (sauvegarde, redressement, liquidation)",
          ton: "var(--rf-succes)",
        },
  );

  return lignes;
}
