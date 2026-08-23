import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Page } from "@/components/chrome";
import { prisma } from "@/lib/db";
import { adressePostale, formatDateLongue, formatNombre, formatSiren } from "@/lib/format";
import { construireGuide } from "@/lib/demarches";
import { DonneesStructurees, faqJsonLd, filAlianeJsonLd, organisationJsonLd } from "@/components/donnees-structurees";
import { boutiqueIndexable } from "@/lib/indexation";
import { BENEFICES, MOTIFS_FICHE } from "@/lib/refonte";
import { declarationPublique } from "@/lib/observatoire";
import { LIBELLES_DEMANDE, LIBELLES_ETAT_PRO } from "@/lib/format";
import {
  Alerte, Bulle, Carte, Chevron, Colis, Document, Fleche, Horloge,
  Info, Oeil, Question, Remboursement,
} from "@/components/refonte/icones";

/**
 * Fiche boutique — même charte que la fiche entreprise.
 *
 * Une boutique n'est pas une personne morale : c'est un site marchand, parfois
 * rattaché à une société, souvent pas. L'ordre des sections suit celui de la
 * fiche entreprise — le problème du visiteur d'abord, l'exploitant ensuite —
 * mais deux blocs lui sont propres.
 *
 * Le premier est l'identité de l'exploitant, qui est ici la question centrale :
 * quelqu'un qui cherche « avis maboutique.fr » veut savoir à qui il a affaire
 * avant de payer. Le second est l'absence de cette identité, qui n'est pas un
 * trou dans nos données mais un renseignement : tout site marchand doit publier
 * son éditeur, et n'en publier aucun se remarque.
 */
export const dynamic = "force-dynamic";

const ICONES = { remboursement: Remboursement, colis: Colis, bulle: Bulle, alerte: Alerte, carte: Carte, question: Question };
const ICONES_BENEFICE = { oeil: Oeil, document: Document, horloge: Horloge };

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

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const boutique = await prisma.boutique.findUnique({
    where: { slug },
    include: { entreprise: { select: { denomination: true } } },
  });
  if (!boutique) return { title: "Boutique en ligne" };

  const exploitant = boutique.entreprise ? ` — ${boutique.entreprise.denomination}` : "";
  return {
    ...(boutiqueIndexable(boutique) ? {} : { robots: { index: false, follow: true } }),
    title: `${boutique.domaine}${exploitant} : avis, litige et recours`,
    description: boutique.entreprise
      ? `Vous cherchez des avis sur ${boutique.domaine} ? Le site est exploité par ${boutique.entreprise.denomination} : identité de la société, signalements de consommateurs et démarches en cas de litige.`
      : `Vous cherchez des avis sur ${boutique.domaine} ? Ce que l’on sait de cette boutique en ligne, les signalements de consommateurs et les démarches à suivre en cas de litige.`,
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
          naf: true, dateImmatriculation: true, etatAdministratif: true,
        },
      },
      signalements: { where: { moderation: "PUBLIE" }, orderBy: { creeLe: "desc" }, take: 40 },
    },
  });
  if (!boutique) notFound();

  await prisma.boutique.update({ where: { id: boutique.id }, data: { vues: { increment: 1 } } });

  /**
   * Boutiques voisines, pour que la page ne soit pas un cul-de-sac.
   *
   * Le critère est l'exploitant quand il est connu, sinon l'extension du
   * domaine. Ce n'est ni un classement ni un rapprochement par la qualité :
   * c'est un chemin d'exploration, et c'est ainsi qu'un annuaire de cette
   * taille se fait parcourir.
   */
  const extension = boutique.domaine.slice(boutique.domaine.lastIndexOf("."));
  const voisines = await prisma.boutique.findMany({
    where: {
      id: { not: boutique.id },
      ...(boutique.entrepriseId
        ? { entrepriseId: boutique.entrepriseId }
        : { domaine: { endsWith: extension }, derniereActivite: { not: null } }),
    },
    select: { slug: true, domaine: true },
    orderBy: boutique.entrepriseId ? { domaine: "asc" } : { derniereActivite: "desc" },
    take: 18,
  });

  const total = boutique.signalements.length;
  const resolus = boutique.signalements.filter((s) => s.resolutionConfirmee).length;
  const tunnel = `/signaler?site=${encodeURIComponent(boutique.domaine)}`;

  // Quelqu'un qui cherche « litige maboutique.fr » veut savoir quoi faire, pas
  // combien d'autres se sont plaints. La page répond à ça même sans déclaration.
  const guide = construireGuide({
    categorie: "AUTRE",
    contactPrealable: "AUCUN",
    dateSignalement: new Date(),
    reference: "—",
    verifie: false,
    mediateur: null,
  });
  const etapes = guide.etapes.filter((e) => !e.titre.includes("Recours France"));

  const eteinte =
    boutique.derniereActivite !== null &&
    boutique.derniereActivite < new Date(new Date().setFullYear(new Date().getFullYear() - INACTIVITE_MAX_ANNEES));

  const questions = [
    {
      q: `Peut-on lire des avis sur ${boutique.domaine} ?`,
      r: "Recours France ne publie pas d’avis notés — aucune étoile, aucune moyenne. Ce que vous lisez ici sont des signalements : des expériences déclarées par des consommateurs, datées, avec la solution demandée et l’état du litige.",
    },
    {
      q: "Qui exploite ce site ?",
      r: boutique.entreprise
        ? `${boutique.entreprise.denomination}, selon un rapprochement établi à partir de ${SOURCES[boutique.rattachementSource ?? ""] ?? "nos données"}. Son identité complète figure sur cette page.`
        : "La société qui exploite ce site n’a pas été identifiée avec certitude. Tout site marchand est pourtant tenu de publier l’identité de son éditeur : c’est une information à chercher avant de commander.",
    },
    {
      q: "Que faire en cas de litige avec une boutique en ligne ?",
      r: "Une réclamation écrite d’abord, puis une mise en demeure, puis le médiateur de la consommation. Chaque étape conditionne la suivante : une médiation saisie sans réclamation préalable est déclarée irrecevable.",
    },
  ];

  const sommaire = [
    { href: "#probleme", libelle: "Mon problème" },
    { href: "#signalements", libelle: "Signalements" },
    { href: "#exploitant", libelle: "Qui exploite ce site" },
    { href: "#demarches", libelle: "Démarches" },
    ...(voisines.length ? [{ href: "#voisines", libelle: "Boutiques proches" }] : []),
    { href: "#faq", libelle: "Questions fréquentes" },
  ];

  const fil = [{ libelle: "Boutiques en ligne", href: "/boutiques" }, { libelle: boutique.domaine }];

  return (
    <Page entete={{ baseline: "Observatoire des problèmes consommateurs", navActive: "boutiques" }} fil={fil}>
      <DonneesStructurees donnees={filAlianeJsonLd(fil)} />
      {boutique.entreprise ? (
        <DonneesStructurees
          donnees={organisationJsonLd({
            nom: boutique.entreprise.denomination,
            siren: boutique.entreprise.siren,
            url: `/boutiques/${slug}`,
            siteWeb: `https://${boutique.domaine}`,
            adresse: boutique.entreprise.adresseSiege,
            codePostal: boutique.entreprise.codePostal,
            commune: boutique.entreprise.commune,
          })}
        />
      ) : null}
      <DonneesStructurees donnees={faqJsonLd(questions.map((q) => ({ q: q.q, a: q.r })))} />

      <div className="rfn">
        {/* ── Hero ───────────────────────────────────────────────────────── */}
        <section className="rfn-hero">
          <div className="rfn-conteneur rfn-hero__grille">
            <div className="rfn-hero__gauche">
              <div className="rfn-chips">
                <span className="rfn-chip rfn-chip--bleu">Boutique en ligne</span>
                <span className="rfn-chip">{extension.replace(".", "").toUpperCase()}</span>
                <span className="rfn-chip">
                  {boutique.entreprise ? "Exploitant identifié" : "Exploitant non établi"}
                </span>
              </div>

              <h1 className="rfn-h1" style={{ marginTop: 18 }}>
                Un problème avec {boutique.domaine} ? Rendez-le visible pour inciter la boutique à réagir.
              </h1>

              <p className="rfn-intro" style={{ marginTop: 16 }}>
                Publiez votre situation sur la fiche de {boutique.domaine}, préparez votre réclamation écrite
                et suivez les démarches adaptées à un litige avec un site marchand.
              </p>

              <div className="rfn-btns" style={{ marginTop: 22 }}>
                <Link href={tunnel} className="rfn-btn">
                  Rendre mon litige visible
                  <Fleche taille={18} />
                </Link>
                <Link href={total > 0 ? "#signalements" : "#exploitant"} className="rfn-btn rfn-btn--2">
                  {total === 0
                    ? "Qui exploite ce site ?"
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
                {BENEFICES(boutique.domaine).map((b) => {
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

        {/* ── Quel problème ? ────────────────────────────────────────────── */}
        <section id="probleme" className="rfn-section">
          <div className="rfn-conteneur">
            <h2 className="rfn-h2">Quel problème rencontrez-vous ?</h2>
            <p className="rfn-texte" style={{ marginTop: 10, maxWidth: "60ch" }}>
              Choisissez la situation la plus proche de la vôtre. Les démarches et la réclamation sont
              adaptées à votre choix.
            </p>

            <div className="rfn-grille" style={{ marginTop: 22 }}>
              {MOTIFS_FICHE.map((m) => {
                const Icone = ICONES[m.icone];
                return (
                  <Link key={m.cle} href={`${tunnel}&motif=${m.cle}`} className="rfn-carte rfn-probleme">
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
                Vous ne savez pas par où commencer ? Nous vous indiquons la prochaine étape selon votre
                situation.
              </span>
            </div>
          </div>
        </section>

        {/* ── Signalements ───────────────────────────────────────────────── */}
        <section id="signalements" className="rfn-section rfn-section--gris">
          <div className="rfn-conteneur">
            <h2 className="rfn-h2">Signalements publics concernant {boutique.domaine}</h2>

            {total === 0 ? (
              <div
                className="rfn-carte"
                style={{
                  marginTop: 20, display: "flex", flexWrap: "wrap", gap: 20,
                  alignItems: "center", justifyContent: "space-between", padding: 22,
                }}
              >
                <div style={{ flex: "1 1 340px", minWidth: 0 }}>
                  <div className="rfn-h3">
                    Aucun signalement public concernant {boutique.domaine} pour le moment.
                  </div>
                  <p className="rfn-second" style={{ marginTop: 8 }}>
                    Vous avez rencontré un problème ? Votre publication permettra de rendre cette situation
                    visible.
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
                  {boutique.signalements.map((s) => (
                    <article key={s.id} className="rfn-carte">
                      <div
                        style={{
                          display: "flex", flexWrap: "wrap", gap: 8,
                          alignItems: "center", justifyContent: "space-between",
                        }}
                      >
                        <div className="rfn-chips">
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
              Chaque signalement reprend la déclaration de son auteur. Recours France ne vérifie pas le récit
              des faits, n’intervient pas dans le règlement du litige et ne génère aucun contenu artificiel
              pour étoffer cette page.
            </p>
          </div>
        </section>

        {/* ── Qui exploite ce site ───────────────────────────────────────── */}
        <section id="exploitant" className="rfn-section">
          <div className="rfn-conteneur">
            <h2 className="rfn-h2">Qui exploite {boutique.domaine} ?</h2>

            {eteinte ? (
              <div className="rfn-beige" style={{ marginTop: 18 }}>
                <Alerte taille={18} />
                <span>
                  Aucune activité constatée sur ce domaine depuis{" "}
                  {formatDateLongue(boutique.derniereActivite!)}. Le site est peut-être abandonné.
                </span>
              </div>
            ) : null}

            {boutique.entreprise ? (
              <>
                <div className="rfn-carte" style={{ marginTop: 20 }}>
                  <div className="rfn-eyebrow">Société exploitante</div>
                  <p className="rfn-texte" style={{ marginTop: 10, fontSize: 17, fontWeight: 700 }}>
                    <Link href={`/entreprises/${boutique.entreprise.slug}`}>
                      {boutique.entreprise.denomination}
                    </Link>
                  </p>
                  <div className="rfn-defs" style={{ marginTop: 14 }}>
                    <div className="rfn-def">
                      <span className="rfn-def__k">SIREN</span>
                      <span className="rfn-def__v">{formatSiren(boutique.entreprise.siren)}</span>
                    </div>
                    {boutique.entreprise.formeJuridique ? (
                      <div className="rfn-def">
                        <span className="rfn-def__k">Forme juridique</span>
                        <span className="rfn-def__v">{boutique.entreprise.formeJuridique}</span>
                      </div>
                    ) : null}
                    {adressePostale(boutique.entreprise) ? (
                      <div className="rfn-def">
                        <span className="rfn-def__k">Siège social</span>
                        <span className="rfn-def__v">{adressePostale(boutique.entreprise)}</span>
                      </div>
                    ) : null}
                    {boutique.entreprise.dateImmatriculation ? (
                      <div className="rfn-def">
                        <span className="rfn-def__k">Immatriculation</span>
                        <span className="rfn-def__v">
                          {formatDateLongue(boutique.entreprise.dateImmatriculation)}
                        </span>
                      </div>
                    ) : null}
                    <div className="rfn-def">
                      <span className="rfn-def__k">État administratif</span>
                      <span
                        className="rfn-def__v"
                        style={
                          boutique.entreprise.etatAdministratif === "ACTIVE"
                            ? undefined
                            : { color: "var(--rf-erreur)" }
                        }
                      >
                        {boutique.entreprise.etatAdministratif === "ACTIVE" ? "En activité" : "Cessée"}
                      </span>
                    </div>
                    {boutique.derniereActivite ? (
                      <div className="rfn-def">
                        <span className="rfn-def__k">Dernière activité du site</span>
                        <span className="rfn-def__v">{formatDateLongue(boutique.derniereActivite)}</span>
                      </div>
                    ) : null}
                  </div>
                  <p className="rfn-mention" style={{ marginTop: 14 }}>
                    Rattachement établi
                    {boutique.rattachementLe ? ` le ${formatDateLongue(boutique.rattachementLe)}` : ""} · source :{" "}
                    {SOURCES[boutique.rattachementSource ?? ""] ?? boutique.rattachementSource ?? "nos données"}.
                    {boutique.rattachementSource === "wikidata" || boutique.rattachementSource === "osm"
                      ? " Cette source est contributive : le rattachement n’a pas été reconfirmé auprès du site."
                      : null}
                  </p>
                </div>

                {boutique.entreprise.etatAdministratif !== "ACTIVE" ? (
                  <div className="rfn-beige" style={{ marginTop: 16 }}>
                    <Alerte taille={18} />
                    <span>
                      La société qui exploitait ce site n’est plus en activité. Une commande passée
                      aujourd’hui n’aurait aucun interlocuteur, et un litige en cours relève d’un mandataire
                      judiciaire.
                    </span>
                  </div>
                ) : null}
              </>
            ) : (
              <>
                <div className="rfn-carte" style={{ marginTop: 20 }}>
                  <div className="rfn-eyebrow">Société exploitante</div>
                  <p className="rfn-texte" style={{ marginTop: 10 }}>
                    <strong>Non établie.</strong> La société qui exploite ce site n’a pas été identifiée avec
                    certitude. Aucune personne morale n’est mise en cause : les déclarations portent sur la
                    boutique, telle que les consommateurs l’ont connue.
                  </p>
                  {boutique.derniereActivite ? (
                    <div className="rfn-defs" style={{ marginTop: 14 }}>
                      <div className="rfn-def">
                        <span className="rfn-def__k">Dernière activité constatée</span>
                        <span className="rfn-def__v">{formatDateLongue(boutique.derniereActivite)}</span>
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* L'absence n'est pas un trou dans nos données : c'est un
                    renseignement, et le plus utile de la page. */}
                <div className="rfn-beige" style={{ marginTop: 16 }}>
                  <Info taille={18} />
                  <span>
                    Tout site marchand est tenu de publier l’identité de son éditeur — dénomination, adresse
                    et numéro d’immatriculation — au titre de l’article 6 III de la loi pour la confiance dans
                    l’économie numérique. Une boutique qui n’en publie aucune est un signal à prendre au
                    sérieux avant de commander.
                  </span>
                </div>
              </>
            )}
          </div>
        </section>

        {/* ── Démarches ──────────────────────────────────────────────────── */}
        <section id="demarches" className="rfn-section rfn-section--gris">
          <div className="rfn-conteneur">
            <h2 className="rfn-h2">Un litige avec {boutique.domaine} : les démarches</h2>
            <p className="rfn-texte" style={{ marginTop: 10, maxWidth: "62ch" }}>
              Ces démarches sont gratuites et s’effectuent dans cet ordre. Chacune conditionne la suivante :
              une médiation saisie sans réclamation écrite préalable est déclarée irrecevable.
            </p>

            <div style={{ marginTop: 22 }}>
              {etapes.map((e, i) => (
                <div key={e.numero} className="rfn-etape">
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
                            {e.delai}
                          </span>
                        </span>
                        <span className="rfn-accordeon__marque">
                          Détails
                          <Chevron taille={16} className="rfn-accordeon__chevron" />
                        </span>
                      </summary>
                      <div className="rfn-accordeon__panneau">
                        <p className="rfn-second">{e.description}</p>
                      </div>
                    </details>
                  </div>
                </div>
              ))}
            </div>

            <h3 className="rfn-h3" style={{ marginTop: 30 }}>
              Les délais qui comptent
            </h3>
            <div className="rfn-defs" style={{ marginTop: 14 }}>
              {guide.delaisUtiles.map((d) => (
                <div key={d.libelle} className="rfn-def">
                  <span className="rfn-def__k">{d.libelle}</span>
                  <span className="rfn-def__v">{d.valeur}</span>
                </div>
              ))}
            </div>

            <h3 className="rfn-h3" style={{ marginTop: 30 }}>
              Les preuves à conserver
            </h3>
            <ul style={{ margin: "14px 0 0", paddingLeft: 18, listStyle: "disc", maxWidth: "70ch" }}>
              {guide.preuves.slice(0, 5).map((p) => (
                <li key={p.intitule} className="rfn-second" style={{ marginBottom: 7 }}>
                  <strong>{p.intitule}</strong> — {p.utilite}
                </li>
              ))}
            </ul>

            <p className="rfn-mention" style={{ marginTop: 18 }}>
              Informations générales de droit de la consommation. Elles ne constituent pas un conseil
              juridique personnalisé.
            </p>
          </div>
        </section>

        {/* ── Boutiques proches : le maillage ────────────────────────────── */}
        {voisines.length > 0 ? (
          <section id="voisines" className="rfn-section">
            <div className="rfn-conteneur">
              <h2 className="rfn-h2">
                {boutique.entreprise
                  ? `Autres sites exploités par ${boutique.entreprise.denomination}`
                  : `Autres boutiques en ${extension}`}
              </h2>
              <p className="rfn-texte" style={{ marginTop: 10, maxWidth: "62ch" }}>
                {boutique.entreprise
                  ? "Ces sites sont rattachés à la même société dans nos données. Le rapprochement vient des registres publics, il ne constitue ni un classement ni une comparaison."
                  : "Rapprochement par extension de domaine uniquement. Ce n’est ni un classement, ni un jugement sur ces boutiques."}
              </p>
              <div className="rfn-comparables">
                {voisines.map((v) => (
                  <Link key={v.slug} href={`/boutiques/${v.slug}`} className="rfn-comparable">
                    <span className="rfn-comparable__nom">{v.domaine}</span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {/* ── Questions fréquentes ───────────────────────────────────────── */}
        <section id="faq" className="rfn-section rfn-section--gris">
          <div className="rfn-conteneur">
            <h2 className="rfn-h2">Questions fréquentes</h2>
            <div style={{ display: "grid", gap: 10, marginTop: 20, maxWidth: "76ch" }}>
              {questions.map((q) => (
                <details key={q.q} className="rfn-accordeon">
                  <summary className="rfn-accordeon__bouton">
                    <span className="rfn-accordeon__titre">{q.q}</span>
                    <span className="rfn-accordeon__marque">
                      <Chevron taille={16} className="rfn-accordeon__chevron" />
                    </span>
                  </summary>
                  <div className="rfn-accordeon__panneau">
                    <p className="rfn-second">{q.r}</p>
                  </div>
                </details>
              ))}
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
