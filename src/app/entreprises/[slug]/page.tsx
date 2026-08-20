import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { Page } from "@/components/chrome";
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
import {
  AVERTISSEMENT_DECLARATION,
  FONCTIONNEMENT,
  GUIDES,
  MOTIFS,
  ORDRE_DEMARCHES,
  PORTEE_EVOLUTION,
  PORTEE_STATISTIQUES,
  declarationPublique,
  demarches,
  faq,
  titreSignalement,
} from "@/lib/observatoire";
import { situationPourMotif } from "@/lib/tunnel";
import { delaiCourtPourMotif } from "@/lib/droits";
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
  formatDateLongue,
  formatMontant,
  formatNombre,
  formatSiren,
  formatSiret,
  libelleEffectif,
} from "@/lib/format";

/**
 * Fiche entreprise — « observatoire des problèmes consommateurs ».
 *
 * L'ordre des sections est celui du handoff, et il n'est pas négociable :
 * problèmes, signalements, statistiques, démarches, informations d'entreprise.
 * Jamais l'inverse. Une page qui ouvrirait sur le SIREN, les dirigeants et le
 * chiffre d'affaires serait un annuaire d'entreprises de plus — il en existe
 * d'excellents, vieux de vingt-cinq ans, et cette page ne cherche pas à les
 * concurrencer. Elle répond à une autre question : « j'ai un problème avec
 * cette entreprise, que puis-je faire ? »
 *
 * Mise en cache une journée : rien ici ne dépend du visiteur.
 */
export const revalidate = 86400;

const CATEGORIES_LIBELLE: Record<string, string> = Object.fromEntries(
  MOTIFS.map((m) => [m.cle, m.libelle]),
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const base = await chargerEntreprise(slug);
  if (!base) return {};

  const total = await prisma.signalement.count({
    where: { entrepriseId: base.id, moderation: "PUBLIE" },
  });
  const nom = base.denomination;

  return {
    title: `${nom} : avis, problèmes, remboursements et litiges`,
    description:
      total > 0
        ? `${formatNombre(total)} signalement${total > 1 ? "s" : ""} publié${total > 1 ? "s" : ""} concernant ${nom}. Consultez les problèmes rencontrés par des consommateurs et les démarches possibles en cas de remboursement, de livraison ou de SAV.`
        : `Problèmes rencontrés avec ${nom} : démarches de réclamation, remboursement, livraison, SAV et médiation. Signalez gratuitement votre situation.`,
    alternates: { canonical: `/entreprises/${base.slug}` },
  };
}

export default async function FicheEntreprise({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const base = await chargerEntreprise(slug);
  if (!base) notFound();
  if (base.slug !== slug) redirect(`/entreprises/${base.slug}`);

  const { entreprise, etablissements, evenements, comptes } = await detailEntreprise(base.id);
  if (!entreprise) notFound();

  const nom = entreprise.denomination;

  const [signalements, total, parMotifBrut, resolus] = await Promise.all([
    prisma.signalement.findMany({
      where: { entrepriseId: entreprise.id, moderation: "PUBLIE" },
      orderBy: { creeLe: "desc" },
      take: 10,
    }),
    prisma.signalement.count({ where: { entrepriseId: entreprise.id, moderation: "PUBLIE" } }),
    prisma.signalement.groupBy({
      by: ["categorie"],
      _count: { _all: true },
      where: { entrepriseId: entreprise.id, moderation: "PUBLIE" },
    }),
    prisma.signalement.count({
      where: { entrepriseId: entreprise.id, moderation: "PUBLIE", resolutionConfirmee: true },
    }),
  ]);

  const parMotif = new Map(parMotifBrut.map((g) => [g.categorie as string, g._count._all]));
  /** État A du handoff : la fiche porte des signalements publiés. */
  const aDesSignalements = total > 0;
  /**
   * Seuil en deçà duquel l'appareil statistique ne dit rien — et nuit.
   *
   * À un signalement, la répartition affiche une barre unique à 100 %,
   * l'histogramme onze colonnes plates et une douzième à pleine hauteur, et la
   * page donne à lire un effondrement brutal là où il n'y a qu'une personne
   * mécontente. C'est faux pour le lecteur, et injuste pour l'entreprise.
   *
   * Le signalement lui-même reste affiché : c'est le commentaire chiffré qui
   * attend d'avoir de quoi commenter.
   */
  const statistiquesUtiles = total >= 5;

  const mediateurDeclare = mediateurPublie(entreprise);
  const [boutique, proches] = await Promise.all([
    prisma.boutique.findFirst({
      where: { entrepriseId: entreprise.id },
      select: { slug: true, domaine: true },
    }),
    voisines(entreprise),
  ]);

  const secteur = entreprise.secteur ?? "autre";
  const blocs = demarches(nom, secteur);
  const questions = faq(nom, mediateurDeclare?.nom ?? null);

  /** Douze derniers mois, du plus ancien au plus récent. */
  const serie = (() => {
    const mois: { cle: string; libelle: string; valeur: number }[] = [];
    const maintenant = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(maintenant.getFullYear(), maintenant.getMonth() - i, 1);
      mois.push({
        cle: `${d.getFullYear()}-${d.getMonth()}`,
        libelle: d.toLocaleDateString("fr-FR", { month: "short" }),
        valeur: 0,
      });
    }
    const index = new Map(mois.map((m, i) => [m.cle, i]));
    for (const s of signalements) {
      const i = index.get(`${s.creeLe.getFullYear()}-${s.creeLe.getMonth()}`);
      if (i !== undefined) mois[i].valeur++;
    }
    return mois;
  })();
  const maxSerie = Math.max(1, ...serie.map((m) => m.valeur));

  const motifsClasses = [...parMotif.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([cle, n]) => ({
      cle,
      libelle: CATEGORIES_LIBELLE[cle] ?? cle,
      n,
      pct: Math.round((n / Math.max(1, total)) * 100),
    }));

  const lignesLegales: { k: string; v: string }[] = [
    { k: "Raison sociale", v: nom },
    { k: "SIREN", v: formatSiren(entreprise.siren) },
    entreprise.siretSiege ? { k: "SIRET du siège", v: formatSiret(entreprise.siretSiege) } : null,
    entreprise.formeJuridique ? { k: "Forme juridique", v: entreprise.formeJuridique } : null,
    { k: "Adresse du siège", v: adressePostale(entreprise) ?? "Non publiée" },
    entreprise.dateImmatriculation
      ? { k: "Immatriculation", v: formatDateLongue(entreprise.dateImmatriculation) }
      : null,
    entreprise.naf ? { k: "Code d’activité", v: `${entreprise.naf} — ${entreprise.nafLibelle ?? ""}`.trim() } : null,
    entreprise.trancheEffectif ? { k: "Effectif", v: libelleEffectif(entreprise.trancheEffectif) } : null,
    entreprise.siteWeb ? { k: "Site officiel", v: entreprise.siteWeb } : null,
    {
      k: "État administratif",
      v: entreprise.etatAdministratif === "ACTIVE" ? "En activité" : "Cessée",
    },
  ].filter((l): l is { k: string; v: string } => l !== null);

  const finances = comptes.slice(0, 4).map((c) => ({
    k: `Exercice ${c.exercice}`,
    v: c.confidentiel
      ? "Comptes déposés avec déclaration de confidentialité"
      : [
          c.chiffreAffaires ? `CA ${formatMontant(Number(c.chiffreAffaires))}` : null,
          c.resultatNet ? `résultat ${formatMontant(Number(c.resultatNet))}` : null,
        ]
          .filter(Boolean)
          .join(" · ") || "Déposés, détail non publié",
  }));

  const sommaire = [
    { href: "#problemes", libelle: "Problèmes signalés" },
    { href: "#signalements", libelle: "Signalements" },
    { href: "#demarches", libelle: "Que faire ?" },
    { href: "#contact", libelle: `Contacter ${nom}` },
    ...(statistiquesUtiles ? [{ href: "#evolution", libelle: "Évolution" }] : []),
    { href: "#informations", libelle: "Informations légales" },
    { href: "#faq", libelle: "Questions fréquentes" },
  ];

  const fil = [
        { libelle: "Annuaire", href: "/annuaire" },
        { libelle: libelleSecteur(secteur), href: cheminSecteur(secteur) },
        ...(entreprise.departement && nomDepartement(entreprise.departement)
          ? [
              {
                libelle: nomDepartement(entreprise.departement)!,
                href: cheminDepartement(secteur, entreprise.departement) ?? undefined,
              },
            ]
          : []),
        ...(entreprise.departement && entreprise.commune
          ? [
              {
                libelle: entreprise.commune,
                href: cheminCommune(secteur, entreprise.departement, entreprise.commune) ?? undefined,
              },
            ]
          : []),
    { libelle: nom },
  ];

  return (
    <Page
      entete={{ baseline: "Observatoire des problèmes consommateurs", navActive: "annuaire" }}
      fil={fil}
    >
      <CompteurVue siren={entreprise.siren} />
      {/* Uniquement ce que la page affiche réellement : fil d'Ariane,
          éditeur, et questions fréquentes dépliées. Ni Review ni
          AggregateRating — ce ne sont pas des avis notés. */}
      <DonneesStructurees donnees={filAlianeJsonLd(fil)} />
      <DonneesStructurees
        donnees={organisationJsonLd({
          nom,
          siren: entreprise.siren,
          url: `/entreprises/${entreprise.slug}`,
          siteWeb: entreprise.siteWeb,
          adresse: entreprise.adresseSiege,
          codePostal: entreprise.codePostal,
          commune: entreprise.commune,
          telephone: entreprise.telephoneReclamation,
          email: entreprise.emailReclamation,
        })}
      />
      <DonneesStructurees donnees={faqJsonLd(questions)} />

      <div className="rfx">
        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <div className="rfx-conteneur" style={{ padding: "40px 32px 44px" }}>
          <div className="rfx-hero">
            <div>
              <div className="rfx-mention" style={{ marginBottom: 10 }}>
                {[libelleSecteur(secteur), entreprise.commune].filter(Boolean).join(" · ")}
                {" · "}
                <span className="rfx-badge rfx-badge--neutre">Fiche non revendiquée</span>
              </div>
              <h1 className="rfx-h1">{nom} : problèmes et signalements de consommateurs</h1>
              <p className="rfx-prose" style={{ marginTop: 18 }}>
                Un remboursement qui n’arrive pas, une commande jamais livrée, un service
                après-vente qui se dérobe : le professionnel est tenu par des délais précis. Consultez
                les problèmes signalés concernant {nom}, et préparez gratuitement la réclamation écrite
                qui fait courir ces délais.
              </p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 24 }}>
                <Link href={`/signaler/${entreprise.slug}`} className="rfx-btn">
                  Signaler un problème avec {nom}
                </Link>
                <a href="#signalements" className="rfx-btn rfx-btn--secondaire">
                  Voir les signalements
                </a>
              </div>
              <p className="rfx-mention" style={{ marginTop: 12 }}>
                Publication gratuite · quelques minutes
              </p>
            </div>

            <aside>
              {aDesSignalements ? (
                <>
                  <div className="rfx-compteur">
                    <div className="rfx-compteur__nombre">{formatNombre(total)}</div>
                    <div style={{ fontSize: 14, marginTop: 6 }}>
                      signalement{total > 1 ? "s" : ""} publié{total > 1 ? "s" : ""}
                    </div>
                    <div style={{ fontSize: 12.5, color: "var(--x-sur-bleu-attenue)", marginTop: 8 }}>
                      12 derniers mois
                      {resolus > 0
                        ? ` · dont ${formatNombre(resolus)} signalé${resolus > 1 ? "s" : ""} résolu${resolus > 1 ? "s" : ""}`
                        : ""}
                    </div>
                  </div>
                  {statistiquesUtiles ? (
                    <>
                      <div className="rfx-motifs">
                        {motifsClasses.slice(0, 4).map((m) => (
                          <a key={m.cle} href="#signalements">
                            <span>{m.libelle}</span>
                            <span className="rfx-chiffre">{formatNombre(m.n)}</span>
                          </a>
                        ))}
                      </div>
                      <p className="rfx-source" style={{ marginTop: 12 }}>
                        {PORTEE_STATISTIQUES}
                      </p>
                    </>
                  ) : (
                    /* Une répartition à un seul motif n'apprend rien. Les délais
                       opposables, eux, valent pour toutes les fiches. */
                    <div className="rfx-bloc" style={{ borderTop: 0 }}>
                      <div className="rfx-h4">Ce qu’un professionnel doit tenir</div>
                      <div className="rfx-lignes" style={{ marginTop: 10 }}>
                        {[
                          { k: "14 jours", v: "pour rembourser après rétractation" },
                          { k: "30 jours", v: "pour livrer, à défaut de date convenue" },
                          { k: "2 ans", v: "de garantie légale, due par le vendeur" },
                        ].map((d) => (
                          <div key={d.k} className="rfx-ligne">
                            <span className="rfx-ligne__cle rfx-chiffre" style={{ color: "var(--x-bleu)", fontWeight: 700 }}>
                              {d.k}
                            </span>
                            <span className="rfx-ligne__valeur">{d.v}</span>
                          </div>
                        ))}
                      </div>
                      <p className="rfx-source" style={{ marginTop: 10 }}>
                        Le délai applicable à votre cas vous sera indiqué avec le texte qui le fonde.
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="rfx-bloc">
                  <h2 className="rfx-h2 rfx-h2--secondaire">Aucun signalement publié pour le moment</h2>
                  <p className="rfx-petit" style={{ marginTop: 12 }}>
                    Aucun consommateur n’a encore publié de signalement concernant {nom} sur Recours
                    France.
                  </p>
                  <Link
                    href={`/signaler/${entreprise.slug}`}
                    className="rfx-btn"
                    style={{ marginTop: 16, width: "100%" }}
                  >
                    Signaler le premier problème
                  </Link>
                  <p className="rfx-source" style={{ marginTop: 12 }}>
                    Les informations pratiques de cette page restent disponibles : démarches, médiateur
                    compétent et informations légales.
                  </p>
                </div>
              )}
            </aside>
          </div>
        </div>

        {/* ── Sommaire ancré ────────────────────────────────────────────── */}
        <nav className="rfx-sommaire" aria-label="Sections de la fiche">
          <div className="rfx-conteneur">
            <div className="rfx-sommaire__liste">
              {sommaire.map((s) => (
                <a key={s.href} href={s.href}>
                  {s.libelle}
                </a>
              ))}
              <Link href={`/signaler/${entreprise.slug}`} style={{ marginLeft: "auto", fontWeight: 600 }}>
                Signaler mon problème →
              </Link>
            </div>
          </div>
        </nav>

        {/* ── Motifs ────────────────────────────────────────────────────── */}
        <section id="problemes" className="rfx-conteneur" style={{ padding: "8px 32px 0" }}>
          <div className="rfx-section">
            <h2 className="rfx-h2">Quel problème rencontrez-vous avec {nom} ?</h2>
            <p className="rfx-texte" style={{ marginTop: 10, maxWidth: 820 }}>
              Choisissez la situation la plus proche de la vôtre pour consulter les démarches
              correspondantes.
            </p>
            <ul className="rfx-liste rfx-deux" style={{ marginTop: 20 }}>
              {MOTIFS.map((m) => (
                <li key={m.cle}>
                  <Link href={`/signaler/${entreprise.slug}/situation?s=${situationPourMotif(m.cle)}`}>
                    <span>{m.libelle}</span>
                    {/* Le délai plutôt qu'un chevron : le visiteur voit sa
                        situation et son levier d'un seul coup d'œil, avant même
                        de cliquer. Le nombre de signalements le complète quand
                        il y en a. */}
                    <span className="rfx-liste__compteur">
                      {delaiCourtPourMotif(m.cle) ? (
                        <span style={{ color: "var(--x-bleu)", fontWeight: 700 }}>
                          {delaiCourtPourMotif(m.cle)}
                        </span>
                      ) : null}
                      {aDesSignalements && parMotif.get(m.cle)
                        ? `${delaiCourtPourMotif(m.cle) ? " · " : ""}${formatNombre(parMotif.get(m.cle)!)} signalement${parMotif.get(m.cle)! > 1 ? "s" : ""}`
                        : ""}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Problèmes les plus signalés (au-delà du seuil) ────────────── */}
        {statistiquesUtiles ? (
          <section className="rfx-conteneur" style={{ padding: "0 32px" }}>
            <div className="rfx-section rfx-editorial">
              <div>
                <h2 className="rfx-h2">Problèmes les plus signalés avec {nom}</h2>
                <div style={{ marginTop: 22 }}>
                  {motifsClasses.slice(0, 5).map((m) => (
                    <div key={m.cle} className="rfx-barre">
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, fontSize: 14.5 }}>
                        <span>{m.libelle}</span>
                        <span className="rfx-chiffre" style={{ color: "var(--x-encre-3)", fontSize: 13.5 }}>
                          {formatNombre(m.n)} signalement{m.n > 1 ? "s" : ""} — {m.pct} %
                        </span>
                      </div>
                      <div className="rfx-barre__piste">
                        <div className="rfx-barre__part" style={{ width: `${Math.max(2, m.pct)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="rfx-source" style={{ marginTop: 14 }}>
                  {PORTEE_STATISTIQUES}
                </p>
              </div>
              <aside className="rfx-bloc rfx-bloc--alt">
                <h3 className="rfx-h3" style={{ fontSize: 17 }}>
                  Ce que signalent les consommateurs
                </h3>
                <div style={{ marginTop: 16 }}>
                  {motifsClasses.slice(0, 3).map((m) => (
                    <div key={m.cle} style={{ marginBottom: 14 }}>
                      <div className="rfx-chiffre" style={{ fontSize: 25, color: "var(--x-bleu)" }}>
                        {m.pct} %
                      </div>
                      <div className="rfx-mention">{m.libelle}</div>
                    </div>
                  ))}
                </div>
                {resolus > 0 ? (
                  <p className="rfx-petit" style={{ borderTop: "1px solid var(--x-filet)", paddingTop: 12 }}>
                    <strong className="rfx-chiffre">
                      {formatNombre(resolus)} signalement{resolus > 1 ? "s" : ""}
                    </strong>{" "}
                    {resolus > 1 ? "ont été mis à jour par leurs auteurs" : "a été mis à jour par son auteur"}{" "}
                    comme résolu{resolus > 1 ? "s" : ""}.
                  </p>
                ) : null}
                <p className="rfx-source">Basé uniquement sur les signalements publiés sur Recours France.</p>
              </aside>
            </div>
          </section>
        ) : null}

        {/* ── Signalements ──────────────────────────────────────────────── */}
        <section id="signalements" className="rfx-conteneur" style={{ padding: "0 32px" }}>
          <div className="rfx-section">
            <h2 className="rfx-h2">Signalements concernant {nom}</h2>
            <p className="rfx-texte" style={{ marginTop: 10, maxWidth: 820 }}>
              Chaque signalement reprend la déclaration de son auteur. Recours France ne vérifie pas le
              récit des faits et n’intervient pas dans le règlement du litige.
            </p>

            {aDesSignalements ? (
              <>
                <div className="rfx-bloc" style={{ marginTop: 22, padding: "4px 24px" }}>
                  {signalements.map((s) => {
                    const titre = titreSignalement(nom, {
                      categorie: s.categorie,
                      demande: s.demande,
                      etatProfessionnel: s.etatProfessionnel,
                      resolutionConfirmee: s.resolutionConfirmee,
                      dateFaits: s.dateFaits,
                    });
                    return (
                      <article key={s.id} className="rfx-signalement">
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                          <span className="rfx-badge rfx-badge--categorie">
                            {CATEGORIES_LIBELLE[s.categorie] ?? s.categorie}
                          </span>
                          <span
                            className={`rfx-badge ${s.resolutionConfirmee ? "rfx-badge--resolu" : "rfx-badge--encours"}`}
                          >
                            {s.resolutionConfirmee ? "Résolu selon le consommateur" : "Problème en cours"}
                          </span>
                        </div>
                        <h3 className="rfx-h3">{titre}</h3>
                        <div className="rfx-mention" style={{ marginTop: 8 }}>
                          {[
                            s.montant ? formatMontant(Number(s.montant)) : null,
                            `Faits : ${formatDateLongue(s.dateFaits)}`,
                            `Publié : ${formatDateLongue(s.creeLe)}`,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </div>
                        <div className="rfx-declaration" style={{ marginTop: 14 }}>
                          {declarationPublique(
                            s,
                            (c) => LIBELLES_DEMANDE[c] ?? c,
                            (c) => LIBELLES_ETAT_PRO[c] ?? c,
                          )}
                        </div>
                        <p className="rfx-source" style={{ marginTop: 8, paddingLeft: 19 }}>
                          Déclaration du consommateur, publiée le {formatDateLongue(s.creeLe)}. Non
                          vérifiée par Recours France.
                        </p>
                        {s.resolutionConfirmee && s.resolutionConfirmeeLe ? (
                          <div className="rfx-resolution" style={{ marginTop: 14 }}>
                            Résolution déclarée par l’auteur le{" "}
                            {formatDateLongue(s.resolutionConfirmeeLe)}. Recours France n’est pas
                            intervenu dans ce dossier.
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
                <p className="rfx-source" style={{ marginTop: 14 }}>
                  Les signalements sont publiés après modération.
                </p>
              </>
            ) : (
              <p className="rfx-texte" style={{ marginTop: 18 }}>
                Aucun signalement n’a encore été publié concernant {nom}. Aucun contenu n’est généré
                artificiellement pour étoffer cette page.
              </p>
            )}
          </div>
        </section>

        {/* ── Appel intermédiaire ───────────────────────────────────────── */}
        <div className="rfx-conteneur" style={{ padding: "0 32px 8px" }}>
          <div className="rfx-bloc rfx-bloc--accent">
            <h2 className="rfx-h2 rfx-h2--secondaire">Vous rencontrez une situation similaire ?</h2>
            <p className="rfx-petit" style={{ marginTop: 8, maxWidth: 700 }}>
              Publiez votre expérience pour qu’elle soit comptabilisée parmi les problèmes signalés
              concernant {nom}.
            </p>
            <Link href={`/signaler/${entreprise.slug}`} className="rfx-btn" style={{ marginTop: 16 }}>
              Signaler mon problème
            </Link>
            <p className="rfx-mention" style={{ marginTop: 10 }}>
              Publication gratuite · justificatifs facultatifs
            </p>
          </div>
        </div>

        {/* ── Démarches ─────────────────────────────────────────────────── */}
        <section id="demarches" className="rfx-conteneur" style={{ padding: "0 32px" }}>
          <div className="rfx-section rfx-editorial">
            <div>
              <h2 className="rfx-h2">Que faire en cas de problème avec {nom} ?</h2>
              <p className="rfx-texte" style={{ marginTop: 10 }}>
                Les démarches ci-dessous suivent l’ordre habituellement recommandé en droit de la
                consommation. Elles sont générales et ne constituent pas un conseil juridique
                personnalisé.
              </p>

              {blocs.map((b) => (
                <div key={b.id} id={b.id} style={{ marginTop: 30 }}>
                  <h3 className="rfx-h3">{b.titre}</h3>
                  <div className="rfx-prose" style={{ marginTop: 10 }}>
                    {b.paragraphes.map((p, i) => (
                      <p key={i}>{p}</p>
                    ))}
                  </div>
                  {b.puces ? (
                    <ul style={{ margin: "6px 0 0", paddingLeft: 20 }} className="rfx-texte">
                      {b.puces.map((p) => (
                        <li key={p} style={{ marginBottom: 4 }}>
                          {p}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {b.id === "mediateur" ? (
                    <div className="rfx-bloc rfx-bloc--alt" style={{ marginTop: 14 }}>
                      {mediateurDeclare ? (
                        <>
                          <div className="rfx-h4">{mediateurDeclare.nom}</div>
                          <div className="rfx-lignes" style={{ marginTop: 10 }}>
                            <div className="rfx-ligne">
                              <span className="rfx-ligne__cle">Adhésion</span>
                              <span className="rfx-ligne__valeur">Déclarée par l’entreprise</span>
                            </div>
                            <div className="rfx-ligne">
                              <span className="rfx-ligne__cle">Coût</span>
                              <span className="rfx-ligne__valeur">Gratuit pour le consommateur</span>
                            </div>
                            <div className="rfx-ligne">
                              <span className="rfx-ligne__cle">Condition préalable</span>
                              <span className="rfx-ligne__valeur">
                                Réclamation écrite restée sans réponse satisfaisante
                              </span>
                            </div>
                            {mediateurDeclare.siteWeb ? (
                              <div className="rfx-ligne">
                                <span className="rfx-ligne__cle">Saisine</span>
                                <span className="rfx-ligne__valeur">
                                  <a href={mediateurDeclare.siteWeb} rel="nofollow noopener" target="_blank">
                                    {mediateurDeclare.siteWeb}
                                  </a>
                                </span>
                              </div>
                            ) : null}
                          </div>
                          <p className="rfx-source" style={{ marginTop: 10 }}>
                            Information issue de la liste publique des médiateurs de la consommation.
                          </p>
                        </>
                      ) : (
                        <p className="rfx-petit">
                          Aucune adhésion à un médiateur n’est déclarée par {nom} à ce jour. Tout
                          professionnel est pourtant tenu de proposer un dispositif de médiation :
                          demandez-lui par écrit de quel médiateur il relève.
                        </p>
                      )}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>

            <aside>
              <div className="rfx-bloc">
                <h3 className="rfx-h3" style={{ fontSize: 17 }}>
                  L’ordre des démarches
                </h3>
                <ol style={{ listStyle: "none", margin: "16px 0 0", padding: 0 }}>
                  {ORDRE_DEMARCHES.map((e) => (
                    <li key={e.n} style={{ display: "flex", gap: 12, marginBottom: 14 }}>
                      <span
                        className="rfx-chiffre"
                        style={{
                          flex: "none",
                          width: 26,
                          height: 26,
                          background: "var(--x-bleu-clair)",
                          color: "var(--x-bleu)",
                          display: "grid",
                          placeItems: "center",
                          fontSize: 13,
                        }}
                      >
                        {e.n}
                      </span>
                      <span>
                        <span style={{ fontSize: 14.5, fontWeight: 700 }}>{e.titre}</span>
                        <span className="rfx-mention" style={{ display: "block", marginTop: 2 }}>
                          {e.desc}
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
                <p className="rfx-source" style={{ borderTop: "1px solid var(--x-filet)", paddingTop: 10 }}>
                  Informations générales. Elles ne constituent pas un conseil juridique personnalisé.
                </p>
              </div>

              <div id="contact" className="rfx-bloc" style={{ marginTop: 16 }}>
                <h3 className="rfx-h3" style={{ fontSize: 17 }}>
                  Contacter {nom}
                </h3>
                <div className="rfx-lignes" style={{ marginTop: 12 }}>
                  {[
                    entreprise.siteWeb ? { k: "Site", v: entreprise.siteWeb, lien: true } : null,
                    entreprise.emailReclamation
                      ? { k: "Réclamation", v: entreprise.emailReclamation, lien: false }
                      : null,
                    entreprise.telephoneReclamation
                      ? { k: "Téléphone", v: entreprise.telephoneReclamation, lien: false }
                      : null,
                    { k: "Courrier", v: adressePostale(entreprise) ?? "Adresse non publiée", lien: false },
                  ]
                    .filter((l): l is { k: string; v: string; lien: boolean } => l !== null)
                    .map((l) => (
                      <div key={l.k} className="rfx-ligne">
                        <span className="rfx-ligne__cle">{l.k}</span>
                        <span className="rfx-ligne__valeur">
                          {l.lien ? (
                            <a href={l.v} rel="nofollow noopener" target="_blank">
                              {l.v}
                            </a>
                          ) : (
                            l.v
                          )}
                        </span>
                      </div>
                    ))}
                </div>
                <p className="rfx-source" style={{ marginTop: 10 }}>
                  Coordonnées issues de sources publiques ou du site de l’entreprise.
                  {entreprise.siteWebVerifieLe
                    ? ` Vérifiées le ${formatDateLongue(entreprise.siteWebVerifieLe)}.`
                    : ""}
                </p>
              </div>

              <div className="rfx-bloc" style={{ marginTop: 16 }}>
                <h3 className="rfx-h3" style={{ fontSize: 17 }}>
                  Sources et vérification
                </h3>
                <div className="rfx-lignes" style={{ marginTop: 12 }}>
                  {[
                    { k: "Identité", v: "Répertoire Sirene (Insee)" },
                    { k: "Registre", v: "RNE (INPI)" },
                    { k: "Annonces", v: "BODACC" },
                    { k: "Médiation", v: "Liste publique des médiateurs" },
                  ].map((s) => (
                    <div key={s.k} className="rfx-ligne">
                      <span className="rfx-ligne__cle">{s.k}</span>
                      <span className="rfx-ligne__valeur">{s.v}</span>
                    </div>
                  ))}
                </div>
                <p style={{ marginTop: 10 }}>
                  <Link href="/methodologie" style={{ fontSize: 13.5 }}>
                    Voir notre méthodologie
                  </Link>
                </p>
              </div>
            </aside>
          </div>
        </section>

        {/* ── Évolution (au-delà du seuil) ──────────────────────────────── */}
        {statistiquesUtiles ? (
          <section id="evolution" className="rfx-conteneur" style={{ padding: "0 32px" }}>
            <div className="rfx-section">
              <h2 className="rfx-h2">Évolution des signalements concernant {nom}</h2>
              <p className="rfx-texte" style={{ marginTop: 10 }}>
                Nombre de signalements publiés par mois sur les douze derniers mois.
              </p>
              <div className="rfx-histo" style={{ marginTop: 24 }}>
                {serie.map((m, i) => (
                  <div
                    key={m.cle}
                    className={`rfx-histo__col${i >= 9 ? " rfx-histo__col--recent" : ""}`}
                    style={{ height: `${(m.valeur / maxSerie) * 100}%` }}
                    title={`${m.libelle} : ${m.valeur}`}
                  />
                ))}
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                {serie.map((m) => (
                  <div key={m.cle} className="rfx-source" style={{ flex: 1, textAlign: "center" }}>
                    {m.libelle}
                  </div>
                ))}
              </div>
              <p className="rfx-source" style={{ marginTop: 14 }}>
                {PORTEE_EVOLUTION}
              </p>
            </div>
          </section>
        ) : null}

        {/* ── Maillage et guides ────────────────────────────────────────── */}
        <section className="rfx-conteneur" style={{ padding: "0 32px" }}>
          <div className="rfx-section rfx-editorial">
            <div>
              <h2 className="rfx-h2 rfx-h2--secondaire">Entreprises comparables</h2>
              <p className="rfx-texte" style={{ marginTop: 8 }}>
                Même activité, même territoire. Ce rapprochement ne constitue ni un classement ni une
                comparaison de qualité.
              </p>
              <ul className="rfx-liste" style={{ marginTop: 14 }}>
                {[...proches.memeVille, ...proches.memeDepartement, ...proches.memeSecteur]
                  .slice(0, 10)
                  .map((v) => (
                    <li key={v.slug}>
                      <Link href={`/entreprises/${v.slug}`}>
                        <span>{v.denomination}</span>
                        <span className="rfx-liste__compteur">
                          {v.signalements > 0
                            ? `${formatNombre(v.signalements)} signalement${v.signalements > 1 ? "s" : ""}`
                            : (v.commune ?? "")}
                        </span>
                      </Link>
                    </li>
                  ))}
              </ul>
              {boutique ? (
                <p className="rfx-petit" style={{ marginTop: 14 }}>
                  Cette société exploite la boutique{" "}
                  <Link href={`/boutiques/${boutique.slug}`}>{boutique.domaine}</Link>.
                </p>
              ) : null}
            </div>
            <aside>
              <h2 className="rfx-h2 rfx-h2--secondaire">Guides pouvant vous aider</h2>
              <p className="rfx-texte" style={{ marginTop: 8 }}>
                Démarches expliquées pas à pas, applicables à tout professionnel.
              </p>
              <ul className="rfx-liste" style={{ marginTop: 14 }}>
                {GUIDES.map((g) => (
                  <li key={g.libelle}>
                    <Link href={g.href}>
                      <span>{g.libelle}</span>
                      <span className="rfx-liste__compteur" aria-hidden="true">
                        →
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        </section>

        {/* ── Informations légales ──────────────────────────────────────── */}
        <section id="informations" className="rfx-section rfx-section--alt" style={{ marginTop: 8 }}>
          <div className="rfx-conteneur">
            <h2 className="rfx-h2 rfx-h2--secondaire">Informations sur {nom}</h2>
            <p className="rfx-texte" style={{ marginTop: 8 }}>
              Données issues de sources publiques : répertoire Sirene (Insee), registre national des
              entreprises (INPI), BODACC.
            </p>

            <div className="rfx-deux" style={{ marginTop: 20 }}>
              <div className="rfx-lignes">
                {lignesLegales.slice(0, 5).map((l) => (
                  <div key={l.k} className="rfx-ligne">
                    <span className="rfx-ligne__cle">{l.k}</span>
                    <span className="rfx-ligne__valeur">{l.v}</span>
                  </div>
                ))}
              </div>
              <div className="rfx-lignes">
                {lignesLegales.slice(5).map((l) => (
                  <div key={l.k} className="rfx-ligne">
                    <span className="rfx-ligne__cle">{l.k}</span>
                    <span className="rfx-ligne__valeur">{l.v}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rfx-deux" style={{ marginTop: 30 }}>
              {finances.length > 0 ? (
                <div>
                  <h3 className="rfx-h3" style={{ fontSize: 17 }}>
                    Informations financières
                  </h3>
                  <div className="rfx-lignes" style={{ marginTop: 12 }}>
                    {finances.map((f) => (
                      <div key={f.k} className="rfx-ligne">
                        <span className="rfx-ligne__cle">{f.k}</span>
                        <span className="rfx-ligne__valeur">{f.v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {evenements.length > 0 ? (
                <div>
                  <h3 className="rfx-h3" style={{ fontSize: 17 }}>
                    Événements récents
                  </h3>
                  <div className="rfx-lignes" style={{ marginTop: 12 }}>
                    {evenements.slice(0, 4).map((e) => (
                      <div key={e.id} className="rfx-ligne">
                        <span className="rfx-ligne__cle">{formatDateLongue(e.date)}</span>
                        <span className="rfx-ligne__valeur">
                          {e.titre}
                          <span className="rfx-source" style={{ display: "block" }}>
                            {e.source}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            {etablissements.length > 1 ? (
              <p className="rfx-petit" style={{ marginTop: 20 }}>
                {formatNombre(etablissements.length)} établissements sont rattachés à cette société.
              </p>
            ) : null}
          </div>
        </section>

        {/* ── Revendication et fonctionnement ───────────────────────────── */}
        <section className="rfx-conteneur" style={{ padding: "0 32px" }}>
          <div className="rfx-section rfx-editorial">
            <div>
              <h2 className="rfx-h2 rfx-h2--secondaire">Vous représentez {nom} ?</h2>
              <p className="rfx-prose" style={{ marginTop: 10 }}>
                Une entreprise peut contester une déclaration la concernant. La contestation est examinée
                sur pièces, et le signalement est retiré s’il se révèle infondé ou contraire à la
                politique de modération.
              </p>
              <p className="rfx-prose">
                La démarche est gratuite et n’ouvre aucun droit de suppression automatique. Seuls les
                contenus contraires à la politique de modération sont retirés, sur examen et quelle que
                soit la partie qui le demande.
              </p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
                <Link href={`/entreprises/${slug}/contester`} className="rfx-btn rfx-btn--secondaire">
                  Contester une déclaration
                </Link>
                <Link href={`/entreprises/${slug}/revendiquer`} className="rfx-btn rfx-btn--secondaire">
                  Revendiquer cette fiche
                </Link>
              </div>
            </div>
            <aside>
              <h2 className="rfx-h2 rfx-h2--secondaire">Comment fonctionne Recours France ?</h2>
              <ol style={{ listStyle: "none", margin: "16px 0 0", padding: 0 }}>
                {FONCTIONNEMENT.map((e) => (
                  <li key={e.n} style={{ display: "flex", gap: 12, marginBottom: 14 }}>
                    <span
                      className="rfx-chiffre"
                      style={{
                        flex: "none",
                        width: 26,
                        height: 26,
                        background: "var(--x-bleu-clair)",
                        color: "var(--x-bleu)",
                        display: "grid",
                        placeItems: "center",
                        fontSize: 13,
                      }}
                    >
                      {e.n}
                    </span>
                    <span>
                      <span style={{ fontSize: 14.5, fontWeight: 700 }}>{e.titre}</span>
                      <span className="rfx-mention" style={{ display: "block", marginTop: 2 }}>
                        {e.desc}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
              <p style={{ marginTop: 10 }}>
                <Link href="/charte-de-moderation" style={{ fontSize: 13.5 }}>
                  Consulter notre politique de modération
                </Link>
              </p>
            </aside>
          </div>
        </section>

        {/* ── Avertissement ─────────────────────────────────────────────── */}
        <div className="rfx-conteneur" style={{ padding: "0 32px 8px" }}>
          <div className="rfx-bloc rfx-bloc--avertissement">
            <h2 className="rfx-h2 rfx-h2--secondaire" style={{ fontSize: 19 }}>
              Recours France est une plateforme indépendante
            </h2>
            <p className="rfx-petit" style={{ marginTop: 10 }}>
              Recours France n’est ni un service de l’État, ni un tribunal, ni un cabinet d’avocats, ni
              un médiateur de la consommation. La plateforme ne transmet pas les réclamations aux
              professionnels et n’intervient pas dans le règlement des litiges.
            </p>
            <p className="rfx-petit" style={{ marginTop: 8 }}>
              Les signalements publiés représentent les déclarations de leurs auteurs.{" "}
              {AVERTISSEMENT_DECLARATION}
            </p>
          </div>
        </div>

        {/* ── FAQ ───────────────────────────────────────────────────────── */}
        <section id="faq" className="rfx-conteneur" style={{ padding: "0 32px" }}>
          <div className="rfx-section">
            <h2 className="rfx-h2">Questions fréquentes concernant {nom}</h2>
            <div className="rfx-deux" style={{ marginTop: 22, gap: "0 48px" }}>
              {questions.map((f) => (
                <div key={f.q} style={{ marginBottom: 26 }}>
                  <h3 className="rfx-h3" style={{ fontSize: 17 }}>
                    {f.q}
                  </h3>
                  <p className="rfx-texte" style={{ marginTop: 8 }}>
                    {f.a}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Appel final ───────────────────────────────────────────────── */}
        <div className="rfx-final">
          <div className="rfx-conteneur">
            <h2 className="rfx-h2">Vous avez rencontré un problème avec {nom} ?</h2>
            <p style={{ marginTop: 12, fontSize: 15.5, lineHeight: 1.7, maxWidth: 700 }}>
              Partagez votre situation et contribuez à rendre visibles les problèmes rencontrés par les
              consommateurs. Votre signalement est publié après modération et vous pourrez indiquer plus
              tard s’il a été résolu.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 22 }}>
              <Link href={`/signaler/${entreprise.slug}`} className="rfx-btn rfx-btn--blanc">
                Signaler mon problème
              </Link>
              <a href="#signalements" style={{ color: "#fff", alignSelf: "center" }}>
                Consulter les signalements
              </a>
            </div>
            <p style={{ marginTop: 14, fontSize: 12.5, color: "var(--x-sur-bleu-attenue)" }}>
              Publication gratuite
            </p>
          </div>
        </div>
      </div>
    </Page>
  );
}
