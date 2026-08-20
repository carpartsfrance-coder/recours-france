import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Page } from "@/components/chrome";
import { prisma } from "@/lib/db";
import { resoudreCible } from "@/lib/cible";
import { libelleSecteur } from "@/lib/maillage";
import { formatNombre } from "@/lib/format";
import { LEVIERS } from "@/lib/droits";
import { MOTIFS } from "@/lib/observatoire";

/**
 * Accueil du tunnel de signalement.
 *
 * La promesse a changé, et le chiffre l'imposait : sur treize millions de
 * fiches, six portent un signalement. Annoncer « rendez votre problème
 * visible » à côté d'un compteur à zéro, puis avertir dix lignes plus bas que
 * la plateforme ne transmet rien et ne garantit aucune réponse, revient à
 * démentir sa propre promesse au moment où le visiteur hésite.
 *
 * Ce qui reste vrai quel que soit le volume, c'est le droit. Un délai de
 * quatorze jours opposable au vendeur, une garantie de deux ans due par lui et
 * non par le fabricant : ces leviers-là existent dès la première visite. La
 * page mène donc avec eux, et la visibilité redevient ce qu'elle est
 * aujourd'hui — un bénéfice réel, mais second.
 *
 * Elle reprendra la tête le jour où les fiches auront du volume : le bloc de
 * droite bascule tout seul au-delà de trois signalements.
 */
export const revalidate = 3600;

/** En deçà, le compteur dessert la page plus qu'il ne la sert. */
const SEUIL_PREUVE = 3;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const cible = await resoudreCible(slug);
  if (!cible) return {};
  return {
    title: `Réclamation ${cible.nom} : vos droits et votre courrier`,
    description: `Un problème avec ${cible.nom} ? Obtenez gratuitement votre lettre de réclamation, le délai que le professionnel doit tenir et les recours possibles. Une minute, sans compte.`,
    alternates: { canonical: `/signaler/${cible.slug}` },
    robots: { index: false, follow: true },
  };
}

export default async function AccueilTunnel({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cible = await resoudreCible(slug);
  if (!cible) notFound();

  const [total, parMotifBrut] = cible.entrepriseId
    ? await Promise.all([
        prisma.signalement.count({
          where: { entrepriseId: cible.entrepriseId, moderation: "PUBLIE" },
        }),
        prisma.signalement.groupBy({
          by: ["categorie"],
          _count: { _all: true },
          where: { entrepriseId: cible.entrepriseId, moderation: "PUBLIE" },
        }),
      ])
    : [0, []];

  const nom = cible.nom;
  const libelles = Object.fromEntries(MOTIFS.map((m) => [m.cle, m.libelle]));
  const repartition = parMotifBrut
    .map((g) => ({ libelle: libelles[g.categorie] ?? g.categorie, n: g._count._all }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 3);

  /** Le compteur ne s'affiche qu'à partir du moment où il plaide en notre faveur. */
  const preuveUtile = total >= SEUIL_PREUVE;

  return (
    <Page
      entete={{ baseline: "Observatoire des problèmes consommateurs", navActive: "annuaire" }}
      fil={[
        { libelle: "Annuaire", href: "/annuaire" },
        ...(cible.slugFiche ? [{ libelle: nom, href: `/entreprises/${cible.slugFiche}` }] : []),
        { libelle: "Réclamation" },
      ]}
    >
      <div className="rfx">
        <div className="rfx-large rfx-avec-barre" style={{ padding: "36px 24px 56px" }}>
          <div className="rfx-hero">
            {/* ── Colonne gauche : ce que vous pouvez exiger ───────────── */}
            <div>
              <div className="rfx-mention" style={{ marginBottom: 12 }}>
                {[cible.secteur ? libelleSecteur(cible.secteur) : null, cible.commune]
                  .filter(Boolean)
                  .join(" · ") || "Entreprise non répertoriée"}
              </div>

              <h1 className="rfx-h1">Un problème avec {nom} ?</h1>
              <p
                style={{
                  fontSize: 29,
                  fontWeight: 700,
                  letterSpacing: "-0.026em",
                  lineHeight: 1.2,
                  color: "var(--x-bleu)",
                  marginTop: 14,
                }}
              >
                Faites valoir ce que la loi vous permet d’exiger
              </p>
              <p className="rfx-prose" style={{ marginTop: 14 }}>
                Un remboursement qui n’arrive pas, une commande jamais livrée, un service après-vente
                qui se dérobe : dans la plupart de ces situations, le professionnel est tenu par un
                délai précis. Encore faut-il le lui rappeler par écrit — c’est ce que nous préparons
                pour vous.
              </p>

              {/* Le levier réel passe en premier, et occupe la place. */}
              <div className="rfx-levier" style={{ marginTop: 24 }}>
                <div className="rfx-levier__titre">Votre lettre de réclamation, prête en une minute</div>
                <p className="rfx-petit" style={{ marginTop: 8 }}>
                  Rédigée à partir de votre situation, adressée à {nom}, citant le texte applicable et
                  le délai qu’il doit tenir. C’est la pièce écrite sans laquelle aucun recours ne
                  s’ouvre : ni la médiation, ni la suite.
                </p>
                <div className="rfx-lignes" style={{ marginTop: 14 }}>
                  {[
                    { k: "Objet", v: "Votre demande, formulée en termes opposables" },
                    { k: "Fondement", v: "L’article qui s’applique à votre cas" },
                    { k: "Délai", v: "Celui que le professionnel doit respecter" },
                    { k: "Suite", v: "Ce que vous ferez s’il ne répond pas" },
                  ].map((l) => (
                    <div key={l.k} className="rfx-ligne">
                      <span className="rfx-ligne__cle">{l.k}</span>
                      <span className="rfx-ligne__valeur">{l.v}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 26, maxWidth: 440 }}>
                <Link href={`/signaler/${cible.slug}/situation`} className="rfx-btn rfx-btn--large">
                  Préparer ma réclamation
                </Link>
                <p className="rfx-mention" style={{ marginTop: 10, textAlign: "center" }}>
                  Environ 1 minute · Gratuit · Sans compte ni mot de passe
                </p>
              </div>

              {/* Le troisième levier seulement : le deuxième — les délais —
                  fait déjà l'objet du bloc de droite, et le répéter à deux
                  colonnes d'écart donne l'impression d'une page qui se remplit. */}
              <div style={{ marginTop: 30, maxWidth: 620 }}>
                {LEVIERS.slice(2).map((l) => (
                  <div key={l.titre} style={{ marginBottom: 18 }}>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{l.titre}</div>
                    <p className="rfx-petit" style={{ marginTop: 6 }}>
                      {l.desc}
                    </p>
                  </div>
                ))}
              </div>

              {/* La visibilité : réelle, annoncée, mais plus en tête. */}
              {cible.entrepriseId ? (
                <div className="rfx-bloc rfx-bloc--alt" style={{ marginTop: 12, padding: "16px 18px" }}>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>
                    Et votre problème devient public
                  </div>
                  <p className="rfx-petit" style={{ marginTop: 6 }}>
                    Votre situation apparaît sur la fiche {nom}, consultable par toute personne qui se
                    renseigne sur cette entreprise. Recours France ne lui transmet pas votre
                    réclamation et ne garantit aucune réponse : c’est vous qui envoyez le courrier,
                    et c’est lui qui a un effet.
                  </p>
                </div>
              ) : null}
            </div>

            {/* ── Colonne droite : les délais, ou la preuve ─────────────── */}
            <aside>
              {preuveUtile ? (
                <div className="rfx-bloc">
                  <h2 className="rfx-h2 rfx-h2--secondaire" style={{ fontSize: 17 }}>
                    {formatNombre(total)} problèmes déjà signalés
                  </h2>
                  <div className="rfx-lignes" style={{ marginTop: 12 }}>
                    {repartition.map((r) => (
                      <div key={r.libelle} className="rfx-ligne">
                        <span className="rfx-ligne__cle">{r.libelle}</span>
                        <span className="rfx-ligne__valeur rfx-chiffre">{formatNombre(r.n)}</span>
                      </div>
                    ))}
                  </div>
                  {cible.slugFiche ? (
                    <p style={{ marginTop: 10 }}>
                      <Link href={`/entreprises/${cible.slugFiche}#signalements`} style={{ fontSize: 13.5 }}>
                        Voir les signalements publiés
                      </Link>
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="rfx-bloc">
                  <h2 className="rfx-h2 rfx-h2--secondaire" style={{ fontSize: 17 }}>
                    Les délais qu’un professionnel doit tenir
                  </h2>
                  <p className="rfx-source" style={{ marginTop: 6 }}>
                    Applicables à la plupart des achats auprès d’un professionnel en France.
                  </p>
                  <div style={{ marginTop: 16 }}>
                    {[
                      { d: "14 jours", q: "pour vous rembourser après une rétractation" },
                      { d: "30 jours", q: "pour livrer, à défaut de date convenue" },
                      { d: "2 ans", q: "de garantie légale, due par le vendeur" },
                      { d: "Gratuit", q: "la saisine du médiateur de la consommation" },
                    ].map((e) => (
                      <div key={e.d} style={{ marginBottom: 14 }}>
                        <div className="rfx-chiffre" style={{ fontSize: 22, color: "var(--x-bleu)" }}>
                          {e.d}
                        </div>
                        <div className="rfx-mention">{e.q}</div>
                      </div>
                    ))}
                  </div>
                  <p className="rfx-source" style={{ borderTop: "1px solid var(--x-filet)", paddingTop: 10 }}>
                    Le délai exact dépend de votre situation ; il vous sera indiqué à l’étape suivante,
                    avec le texte sur lequel il repose.
                  </p>
                </div>
              )}

              <div className="rfx-bloc" style={{ marginTop: 16 }}>
                <h2 className="rfx-h2 rfx-h2--secondaire" style={{ fontSize: 17 }}>
                  Ce que Recours France ne fait pas
                </h2>
                <ul className="rfx-petit" style={{ margin: "10px 0 0", paddingLeft: 18 }}>
                  <li style={{ marginBottom: 4 }}>Nous ne contactons pas l’entreprise à votre place.</li>
                  <li style={{ marginBottom: 4 }}>Nous ne négocions pas et ne représentons personne.</li>
                  <li>Nous ne sommes ni un avocat, ni un médiateur, ni un service de l’État.</li>
                </ul>
                <p className="rfx-source" style={{ marginTop: 10 }}>
                  Ce que nous faisons : vous donner l’écrit, le délai et l’ordre des démarches — ce
                  qui suffit, dans la plupart des cas, à débloquer un dossier.
                </p>
              </div>
            </aside>
          </div>
        </div>

        {/* Sur écran étroit, le bouton sort du champ dès le premier
            défilement : il reste ici sous le pouce. */}
        <div className="rfx-barre-fixe">
          <Link href={`/signaler/${cible.slug}/situation`} className="rfx-btn rfx-btn--large">
            Préparer ma réclamation
          </Link>
          <p className="rfx-mention">Environ 1 minute · Gratuit · Sans compte</p>
        </div>
      </div>
    </Page>
  );
}
