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
import { BENEFICES, MOTIFS_FICHE, etapesPlan, faqRefonte } from "@/lib/refonte";
import { OuEnEtesVous } from "@/components/refonte/ou-en-etes-vous";
import {
  Alerte,
  Bulle,
  Carte,
  Chevron,
  Colis,
  Document,
  Fleche,
  Horloge,
  Info,
  Oeil,
  Question,
  Remboursement,
} from "@/components/refonte/icones";
import { declarationPublique } from "@/lib/observatoire";
import {
  cheminCommune,
  cheminDepartement,
  cheminSecteur,
  libelleSecteur,
  nomDepartement,
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
 * Fiche entreprise — refonte d'août 2026.
 *
 * L'ordre des sections vient du handoff et n'est pas négociable : le problème
 * du visiteur d'abord, l'entreprise ensuite. Une page qui ouvrirait sur le
 * SIREN, la forme juridique et le chiffre d'affaires serait un annuaire de
 * plus — il en existe d'excellents, vieux de vingt-cinq ans. Celle-ci répond à
 * une autre question : « j'ai un problème avec cette entreprise, que puis-je
 * faire ? »
 *
 * Un seul état vide sur toute la page, dans la section des signalements. Les
 * autres sections disent ce qu'elles savent ou se taisent : rien n'est
 * inventé pour étoffer la page, et six fiches sur treize millions portent
 * aujourd'hui un signalement.
 *
 * Mise en cache une journée : rien ici ne dépend du visiteur.
 */
export const revalidate = 86400;

const ICONES = { remboursement: Remboursement, colis: Colis, bulle: Bulle, alerte: Alerte, carte: Carte, question: Question };
const ICONES_BENEFICE = { oeil: Oeil, document: Document, horloge: Horloge };

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

  const { entreprise, evenements, comptes } = await detailEntreprise(base.id);
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

  const mediateurDeclare = mediateurPublie(entreprise);
  const secteur = entreprise.secteur ?? "autre";
  const etapes = etapesPlan(nom, mediateurDeclare?.nom ?? null);
  const questions = faqRefonte(nom);
  const tunnel = `/signaler/${slug}`;

  const lignesLegales = [
    { k: "Raison sociale", v: nom },
    { k: "SIREN", v: formatSiren(entreprise.siren) },
    entreprise.siretSiege ? { k: "SIRET du siège", v: formatSiret(entreprise.siretSiege) } : null,
    entreprise.formeJuridique ? { k: "Forme juridique", v: entreprise.formeJuridique } : null,
    entreprise.dateImmatriculation
      ? { k: "Immatriculation", v: formatDateLongue(entreprise.dateImmatriculation) }
      : null,
    entreprise.naf ? { k: "Code d’activité", v: entreprise.naf } : null,
    entreprise.trancheEffectif
      ? { k: "Effectif", v: libelleEffectif(entreprise.trancheEffectif) }
      : { k: "Effectif", v: "Non renseigné (Insee)" },
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
          .join(" · ") || "Comptes déposés, détail non publié",
  }));

  const sommaire = [
    { href: "#probleme", libelle: "Mon problème" },
    { href: "#signalements", libelle: "Signalements" },
    { href: "#demarches", libelle: "Démarches" },
    { href: "#contact", libelle: "Contact et médiateur" },
    { href: "#informations", libelle: "Informations" },
    { href: "#faq", libelle: "Méthodologie et FAQ" },
  ];

  const commune = entreprise.commune ?? null;
  const adresse = adressePostale(entreprise);

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
    ...(entreprise.departement && commune
      ? [{ libelle: commune, href: cheminCommune(secteur, entreprise.departement, commune) ?? undefined }]
      : []),
    { libelle: nom },
  ];

  return (
    <Page
      entete={{ baseline: "Observatoire des problèmes consommateurs", navActive: "annuaire" }}
      fil={fil}
    >
      <CompteurVue siren={entreprise.siren} />
      {/* Uniquement ce que la page affiche réellement : fil d'Ariane, éditeur,
          questions fréquentes. Ni Review ni AggregateRating — ce ne sont pas
          des avis notés, et l'étoile serait un mensonge de plus. */}
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
      <DonneesStructurees donnees={faqJsonLd(questions.map((q) => ({ q: q.q, a: q.r.join(" ") })))} />

      <div className="rfn">
        {/* ── Hero ───────────────────────────────────────────────────────── */}
        <section className="rfn-hero">
          <div className="rfn-conteneur rfn-hero__grille">
            <div className="rfn-hero__gauche">
              <div className="rfn-chips">
                {entreprise.secteur ? (
                  <span className="rfn-chip rfn-chip--bleu">{libelleSecteur(entreprise.secteur)}</span>
                ) : null}
                {commune ? <span className="rfn-chip">{commune}</span> : null}
                <span className="rfn-chip">Fiche non revendiquée</span>
              </div>

              <h1 className="rfn-h1" style={{ marginTop: 18 }}>
                Un problème avec {nom} ? Rendez-le visible pour inciter l’entreprise à réagir.
              </h1>

              <p className="rfn-intro" style={{ marginTop: 16 }}>
                Publiez votre situation sur la fiche de {nom}, préparez votre réclamation écrite et
                suivez les prochaines démarches adaptées à votre litige.
              </p>

              <div className="rfn-btns" style={{ marginTop: 22 }}>
                <Link href={tunnel} className="rfn-btn">
                  Rendre mon litige visible
                  <Fleche taille={18} />
                </Link>
                <Link href={total > 0 ? "#signalements" : "#probleme"} className="rfn-btn rfn-btn--2">
                  {total === 0
                    ? "Trouver la démarche adaptée"
                    : total === 1
                      ? "Voir le signalement"
                      : `Voir les ${formatNombre(total)} signalements`}
                </Link>
              </div>

              <p className="rfn-mention" style={{ marginTop: 14 }}>
                Gratuit · vous relisez tout avant publication · justificatifs facultatifs
              </p>
            </div>

            <div className="rfn-hero__droite">
              <div className="rfn-obtenu">
                <div className="rfn-obtenu__tete">Ce que vous obtenez</div>
                {BENEFICES(nom).map((b) => {
                  const Icone = ICONES_BENEFICE[b.icone];
                  return (
                    <div key={b.titre} className="rfn-obtenu__item">
                      <Icone taille={22} />
                      <div>
                        <div className="rfn-obtenu__titre">{b.titre}</div>
                        <div className="rfn-obtenu__desc">{b.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ── Nav de sections, collante ──────────────────────────────────── */}
        <nav className="rfn-nav" aria-label="Sections de la fiche">
          <div className="rfn-conteneur rfn-nav__piste">
            {sommaire.map((s) => (
              <a key={s.href} href={s.href} className="rfn-nav__lien">
                {s.libelle}
              </a>
            ))}
            <div className="rfn-nav__cta">
              <Link href={tunnel} className="rfn-btn" style={{ minHeight: 38, fontSize: 14.5, padding: "0 16px" }}>
                Rendre mon litige visible
              </Link>
            </div>
          </div>
        </nav>

        {/* ── Quel problème rencontrez-vous ? ────────────────────────────── */}
        <section id="probleme" className="rfn-section">
          <div className="rfn-conteneur">
            <h2 className="rfn-h2">Quel problème rencontrez-vous ?</h2>
            <p className="rfn-texte" style={{ marginTop: 10, maxWidth: "60ch" }}>
              Choisissez la situation la plus proche de la vôtre. Les démarches et la réclamation
              sont adaptées à votre choix.
            </p>

            <div className="rfn-grille" style={{ marginTop: 22 }}>
              {MOTIFS_FICHE.map((m) => {
                const Icone = ICONES[m.icone];
                return (
                  <Link
                    key={m.cle}
                    href={`${tunnel}?motif=${m.cle}`}
                    className="rfn-carte rfn-probleme"
                  >
                    <span className="rfn-probleme__icone">
                      <Icone taille={20} />
                    </span>
                    <span className="rfn-probleme__titre">{m.libelle}</span>
                    <span className="rfn-probleme__desc">{m.desc}</span>
                    <span className="rfn-probleme__pied">
                      <Fleche taille={18} />
                    </span>
                  </Link>
                );
              })}
            </div>

            <div className="rfn-beige" style={{ marginTop: 18 }}>
              <Info taille={18} />
              <span>
                Vous ne savez pas par où commencer ? Nous vous indiquons la prochaine étape selon
                votre situation.
              </span>
            </div>
          </div>
        </section>

        {/* ── Signalements publics ───────────────────────────────────────── */}
        <section id="signalements" className="rfn-section rfn-section--gris">
          <div className="rfn-conteneur">
            <h2 className="rfn-h2">Signalements publics concernant {nom}</h2>

            {total === 0 ? (
              <div
                className="rfn-carte"
                style={{
                  marginTop: 20,
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 20,
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: 22,
                }}
              >
                <div style={{ flex: "1 1 340px", minWidth: 0 }}>
                  <div className="rfn-h3">Aucun signalement public concernant {nom} pour le moment.</div>
                  <p className="rfn-second" style={{ marginTop: 8 }}>
                    Vous avez rencontré un problème ? Votre publication permettra de rendre cette
                    situation visible.
                  </p>
                </div>
                <Link href={tunnel} className="rfn-btn">
                  Publier le premier signalement
                  <Fleche taille={18} />
                </Link>
              </div>
            ) : (
              <>
                <div className="rfn-compteurs" style={{ marginTop: 20 }}>
                  <div>
                    <div className="rfn-compteur__n" style={{ color: "var(--rf-cobalt-fonce)" }}>
                      {formatNombre(total)}
                    </div>
                    <div className="rfn-compteur__l">
                      signalement{total > 1 ? "s" : ""} publié{total > 1 ? "s" : ""}
                    </div>
                  </div>
                  <div>
                    <div className="rfn-compteur__n" style={{ color: "var(--rf-succes)" }}>
                      {formatNombre(resolus)}
                    </div>
                    <div className="rfn-compteur__l">résolu{resolus > 1 ? "s" : ""} selon l’auteur</div>
                  </div>
                  <div>
                    <div className="rfn-compteur__n" style={{ color: "var(--rf-erreur)" }}>
                      {formatNombre(total - resolus)}
                    </div>
                    <div className="rfn-compteur__l">sans résolution déclarée</div>
                  </div>
                </div>

                <div style={{ display: "grid", gap: 12, marginTop: 22 }}>
                  {signalements.map((s) => (
                    <article key={s.id} className="rfn-carte">
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 8,
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <div className="rfn-chips">
                          {/* La catégorie précise d'abord : c'est le libellé que
                              l'auteur a choisi. L'énumération ne sert qu'à
                              agréger, et publier « Garantie » là où il a coché
                              « Refus de reprendre ou corriger le travail » lui
                              ferait dire autre chose. */}
                          <span className="rfn-chip rfn-chip--bleu">
                            {s.sousCategorie ??
                              MOTIFS_FICHE.find((m) => m.cle === s.categorie)?.libelle ??
                              s.categorie}
                          </span>
                          <span className="rfn-chip">
                            {s.resolutionConfirmee ? "Résolu selon l’auteur" : "Déclaré"}
                          </span>
                        </div>
                        <span className="rfn-mention">{formatDateLongue(s.creeLe)}</span>
                      </div>
                      <div style={{ marginTop: 12 }}>
                        {s.solutionLibelle ? (
                          <div className="rfn-def">
                            <span className="rfn-def__k">Solution demandée</span>
                            <span className="rfn-def__v">{s.solutionLibelle}</span>
                          </div>
                        ) : null}
                        <div className="rfn-def">
                          <span className="rfn-def__k">Statut</span>
                          <span className="rfn-def__v">
                            {s.resolutionConfirmee ? "Résolu selon l’auteur" : "En attente de solution"}
                          </span>
                        </div>
                        {!s.solutionLibelle ? (
                          <p className="rfn-second" style={{ marginTop: 10 }}>
                            {declarationPublique(
                              s,
                              (c) => LIBELLES_DEMANDE[c] ?? c,
                              (c) => LIBELLES_ETAT_PRO[c] ?? c,
                            )}
                          </p>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              </>
            )}

            <p className="rfn-mention" style={{ marginTop: 18, maxWidth: "78ch" }}>
              Chaque signalement reprend la déclaration de son auteur. Recours France ne vérifie pas
              le récit des faits, n’intervient pas dans le règlement du litige et ne génère aucun
              contenu artificiel pour étoffer cette page.
            </p>
          </div>
        </section>

        {/* ── Votre plan d'action ────────────────────────────────────────── */}
        <section id="demarches" className="rfn-section">
          <div className="rfn-conteneur">
            <h2 className="rfn-h2">Votre plan d’action</h2>
            <p className="rfn-texte" style={{ marginTop: 10, maxWidth: "60ch" }}>
              Les étapes suivent l’ordre habituellement recommandé en droit de la consommation.
              Dépliez une étape pour le détail.
            </p>

            <div style={{ marginTop: 22 }}>
              {etapes.map((e, i) => (
                <div key={e.cle} className="rfn-etape">
                  <div className="rfn-etape__rail">
                    <span className="rfn-etape__pastille">{i + 1}</span>
                    {i < etapes.length - 1 ? <span className="rfn-etape__filet" /> : null}
                  </div>
                  <div className="rfn-etape__corps">
                    <details className="rfn-accordeon">
                      <summary className="rfn-accordeon__bouton">
                        <span style={{ minWidth: 0 }}>
                          <span className="rfn-accordeon__titre">{e.titre}</span>
                          <span className="rfn-accordeon__sous" style={{ display: "block" }}>
                            {e.sous}
                          </span>
                        </span>
                        <span className="rfn-accordeon__marque">
                          Détails
                          <Chevron taille={16} className="rfn-accordeon__chevron" />
                        </span>
                      </summary>
                      <div className="rfn-accordeon__panneau">
                        {e.paragraphes.map((t) => (
                          <p key={t} className="rfn-second" style={{ marginBottom: 10 }}>
                            {t}
                          </p>
                        ))}
                        {e.points ? (
                          <ul style={{ margin: "4px 0 0", paddingLeft: 18, listStyle: "disc" }}>
                            {e.points.map((p) => (
                              <li key={p} className="rfn-second" style={{ marginBottom: 5 }}>
                                {p}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    </details>
                  </div>
                </div>
              ))}
            </div>

            <OuEnEtesVous nom={nom} href={tunnel} />

            <p className="rfn-mention" style={{ marginTop: 18 }}>
              Informations générales de droit de la consommation. Elles ne constituent pas un conseil
              juridique personnalisé.
            </p>
          </div>
        </section>

        {/* ── Coordonnées et médiateur ───────────────────────────────────── */}
        <section id="contact" className="rfn-section rfn-section--gris">
          <div className="rfn-conteneur">
            <h2 className="rfn-h2">Coordonnées et médiateur</h2>
            <div className="rfn-grille rfn-grille--2" style={{ marginTop: 20 }}>
              <div className="rfn-carte">
                <div className="rfn-eyebrow">Adresse du siège</div>
                <p className="rfn-texte" style={{ marginTop: 10 }}>
                  {adresse ?? "Adresse non publiée dans les registres."}
                </p>
                <p className="rfn-mention" style={{ marginTop: 12 }}>
                  Coordonnées issues de sources publiques. Aucun courriel ni téléphone n’est déclaré
                  publiquement à ce jour.
                </p>
              </div>
              <div className="rfn-carte">
                <div className="rfn-eyebrow">Médiateur de la consommation</div>
                <p className="rfn-texte" style={{ marginTop: 10 }}>
                  {mediateurDeclare
                    ? mediateurDeclare.nom
                    : `Aucune adhésion déclarée par ${nom} à ce jour.`}
                </p>
                <p className="rfn-mention" style={{ marginTop: 12 }}>
                  Tout professionnel est tenu de proposer un dispositif de médiation. Demandez-lui par
                  écrit de quel médiateur il relève.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Informations légales et financières ────────────────────────── */}
        <section id="informations" className="rfn-section">
          <div className="rfn-conteneur">
            <h2 className="rfn-h2">Informations légales et financières</h2>
            <p className="rfn-texte" style={{ marginTop: 10, maxWidth: "60ch" }}>
              Données issues du répertoire Sirene (Insee), du registre national des entreprises
              (INPI) et du BODACC.
            </p>

            <div className="rfn-defs" style={{ marginTop: 20 }}>
              {lignesLegales.map((l) => (
                <div key={l.k} className="rfn-def">
                  <span className="rfn-def__k">{l.k}</span>
                  <span className="rfn-def__v">{l.v}</span>
                </div>
              ))}
            </div>

            {finances.length > 0 ? (
              <details className="rfn-accordeon" style={{ marginTop: 20 }}>
                <summary className="rfn-accordeon__bouton">
                  <span className="rfn-accordeon__titre">
                    Informations financières ({finances.length} exercice{finances.length > 1 ? "s" : ""})
                  </span>
                  <span className="rfn-accordeon__marque">
                    <Chevron taille={16} className="rfn-accordeon__chevron" />
                  </span>
                </summary>
                <div className="rfn-accordeon__panneau">
                  {finances.map((f) => (
                    <div key={f.k} className="rfn-def">
                      <span className="rfn-def__k">{f.k}</span>
                      <span className="rfn-def__v">{f.v}</span>
                    </div>
                  ))}
                </div>
              </details>
            ) : null}

            {evenements.length > 0 ? (
              <details className="rfn-accordeon" style={{ marginTop: 12 }}>
                <summary className="rfn-accordeon__bouton">
                  <span className="rfn-accordeon__titre">Événements récents et sources</span>
                  <span className="rfn-accordeon__marque">
                    <Chevron taille={16} className="rfn-accordeon__chevron" />
                  </span>
                </summary>
                <div className="rfn-accordeon__panneau">
                  {evenements.slice(0, 8).map((e) => (
                    <div key={e.id} className="rfn-def">
                      <span className="rfn-def__k">{formatDateLongue(e.date)}</span>
                      <span className="rfn-def__v">{e.titre}</span>
                    </div>
                  ))}
                </div>
              </details>
            ) : null}
          </div>
        </section>

        {/* ── Vous représentez cette entreprise ? ────────────────────────── */}
        <section id="entreprise" className="rfn-section rfn-section--gris" style={{ paddingBlock: 30 }}>
          <div className="rfn-conteneur">
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 16,
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div className="rfn-h3">Vous représentez {nom} ?</div>
                <p className="rfn-second" style={{ marginTop: 6 }}>
                  Contestez une déclaration vous concernant ou prenez la main sur cette fiche.
                </p>
              </div>
              <div className="rfn-btns">
                <Link href={`/entreprises/${slug}/contester`} className="rfn-btn rfn-btn--2">
                  Contester une déclaration
                </Link>
                <Link href={`/entreprises/${slug}/revendiquer`} className="rfn-btn rfn-btn--2">
                  Revendiquer cette fiche
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── Méthodologie, indépendance et FAQ ──────────────────────────── */}
        <section id="faq" className="rfn-section">
          <div className="rfn-conteneur">
            <h2 className="rfn-h2">Méthodologie, indépendance et questions fréquentes</h2>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "clamp(20px, 3cqw, 40px)",
                marginTop: 20,
                alignItems: "flex-start",
              }}
            >
              <div style={{ flex: "1 1 440px", minWidth: 0, display: "grid", gap: 10 }}>
                {questions.map((q) => (
                  <details key={q.cle} className="rfn-accordeon">
                    <summary className="rfn-accordeon__bouton">
                      <span className="rfn-accordeon__titre">{q.q}</span>
                      <span className="rfn-accordeon__marque">
                        <Chevron taille={16} className="rfn-accordeon__chevron" />
                      </span>
                    </summary>
                    <div className="rfn-accordeon__panneau">
                      {q.r.map((t) => (
                        <p key={t} className="rfn-second">
                          {t}
                        </p>
                      ))}
                    </div>
                  </details>
                ))}
              </div>

              <aside style={{ flex: "1 1 280px", minWidth: 0 }}>
                <div className="rfn-beige" style={{ display: "block" }}>
                  <div className="rfn-h3" style={{ color: "var(--rf-beige-texte)" }}>
                    Recours France est une plateforme indépendante
                  </div>
                  <p style={{ marginTop: 10, fontSize: 14, lineHeight: 1.5 }}>
                    Recours France n’est ni un service de l’État, ni un tribunal, ni un cabinet
                    d’avocats, ni un médiateur de la consommation.
                  </p>
                  <p style={{ marginTop: 10, fontSize: 14, lineHeight: 1.5 }}>
                    La plateforme ne transmet pas les réclamations aux professionnels et n’intervient
                    pas dans le règlement des litiges. Un signalement représente la déclaration de son
                    auteur : il ne signifie pas qu’un manquement a été juridiquement établi.
                  </p>
                  <div
                    style={{
                      marginTop: 14,
                      paddingTop: 14,
                      borderTop: "1px solid var(--rf-beige-bordure)",
                      display: "grid",
                      gap: 8,
                      fontSize: 14,
                    }}
                  >
                    <Link href="/methodologie">Notre méthodologie →</Link>
                    <Link href="/charte-de-moderation">Charte de modération →</Link>
                    <Link href="/methodologie#sources">Origine des données →</Link>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </section>

        {/* ── Bandeau final, écrans larges ───────────────────────────────── */}
        <section className="rfn-final">
          <div className="rfn-conteneur rfn-final__grille">
            <div style={{ minWidth: 0 }}>
              <h2>Rendez votre litige visible et lancez vos démarches</h2>
              <p>Gratuit · vous relisez tout avant publication · justificatifs facultatifs</p>
            </div>
            <Link href={tunnel} className="rfn-btn">
              Rendre mon litige visible
              <Fleche taille={18} />
            </Link>
          </div>
        </section>

        {/* ── Barre d'action, écrans étroits ─────────────────────────────── */}
        <div className="rfn-barre">
          <Link href={tunnel} className="rfn-btn">
            Rendre mon litige visible
          </Link>
        </div>
      </div>
    </Page>
  );
}
