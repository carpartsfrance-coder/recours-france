import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Page } from "@/components/chrome";
import { Dossiers } from "@/components/fiche/dossiers";
import { prisma } from "@/lib/db";
import { versDossier } from "@/lib/dossiers";
import { formatNombre, formatSiren, formatDateLongue } from "@/lib/format";
import { litigesPubliables, SEUIL_PUBLICATION_LITIGES } from "@/lib/scoring";
import { construireGuide } from "@/lib/demarches";
import { DonneesStructurees, organisationJsonLd } from "@/components/donnees-structurees";
import { boutiqueIndexable } from "@/lib/indexation";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const boutique = await prisma.boutique.findUnique({
    where: { slug },
    include: { _count: { select: { signalements: true } } },
  });
  if (!boutique) return { title: "Boutique en ligne" };
  return {
    // Tant qu'aucune déclaration ne s'y rattache, la page compte dix mots
    // propres sur six cent soixante-dix-sept : elle n'apprend rien à personne
    // et abîmerait la moyenne du domaine. Le `follow` reste, pour que le
    // maillage la traverse, et l'ouverture est automatique dès le premier
    // signalement.
    ...(boutiqueIndexable(boutique) ? {} : { robots: { index: false, follow: true } }),
    title: `${boutique.domaine} : avis, litige, qui est derrière ce site`,
    description: `Un problème avec ${boutique.domaine} ? Identité de la société qui exploite le site, coordonnées du service client, médiateur compétent et démarches à suivre en cas de litige.`,
    alternates: { canonical: `/boutiques/${slug}` },
  };
}

/** Libellé de la source du rattachement, sans la faire passer pour une vérification. */
const SOURCES: Record<string, string> = {
  wikidata: "Wikidata (base contributive)",
  osm: "OpenStreetMap (base contributive)",
  "mentions-legales": "mentions légales du site",
  facture: "facture fournie par un consommateur",
  manuel: "saisie manuelle",
};

export default async function FicheBoutique({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const boutique = await prisma.boutique.findUnique({
    where: { slug },
    include: {
      entreprise: { select: { slug: true, denomination: true, siren: true } },
      signalements: { where: { moderation: "PUBLIE" }, orderBy: { creeLe: "desc" }, take: 40 },
    },
  });
  if (!boutique) notFound();

  await prisma.boutique.update({ where: { id: boutique.id }, data: { vues: { increment: 1 } } });

  const total = boutique.signalements.length;
  // Quelqu'un qui cherche « litige bergamotte.com » veut savoir quoi faire,
  // pas combien d'autres se sont plaints. La page doit répondre à ça même
  // lorsqu'aucune déclaration n'a encore été déposée.
  const guide = construireGuide({
    categorie: "AUTRE",
    contactPrealable: "AUCUN",
    dateSignalement: new Date(),
    reference: "—",
    verifie: false,
    mediateur: null,
  });
  const publier = litigesPubliables(total);
  const dossiers = boutique.signalements.map(versDossier);

  return (
    <Page fil={[{ libelle: "Boutiques en ligne" }, { libelle: boutique.domaine }]}>
      <div className="rf-conteneur" style={{ padding: "36px 32px 56px" }}>
        {boutique.entreprise ? (
          <DonneesStructurees
            donnees={organisationJsonLd({
              nom: boutique.entreprise.denomination,
              siren: boutique.entreprise.siren,
              url: `/boutiques/${slug}`,
              siteWeb: `https://${boutique.domaine}`,
            })}
          />
        ) : null}
        <h1 className="rf-h1 rf-h1--moyen">
          {boutique.nom} — litige, réclamation et recours
        </h1>
        <p className="rf-texte rf-texte--fort rf-mt-8">
          Boutique en ligne <strong>{boutique.domaine}</strong>
        </p>

        {/* ── Exploitant, quand il est établi ─────────────────────────────── */}
        <div className="rf-carte rf-mt-20" style={{ padding: "18px 22px", maxWidth: 720 }}>
          <div className="rf-etiquette">Exploitant du site</div>
          {boutique.entreprise ? (
            <>
              <p className="rf-texte rf-mt-8" style={{ fontSize: 15 }}>
                <Link href={`/entreprises/${boutique.entreprise.slug}`}>{boutique.entreprise.denomination}</Link> —
                SIREN {formatSiren(boutique.entreprise.siren)}
              </p>
              <p className="rf-legende rf-mt-8">
                Rattachement établi le {formatDateLongue(boutique.rattachementLe)} · source :{" "}
                {SOURCES[boutique.rattachementSource ?? ""] ?? boutique.rattachementSource}.{" "}
                {boutique.rattachementSource === "wikidata" || boutique.rattachementSource === "osm"
                  ? "Cette source est contributive : le rattachement n’a pas été reconfirmé auprès du site."
                  : null}
              </p>
            </>
          ) : (
            <p className="rf-texte rf-mt-8" style={{ fontSize: 15 }}>
              <strong>Non établi.</strong> La société qui exploite ce site n’a pas été identifiée avec
              certitude. Aucune personne morale n’est mise en cause : les déclarations ci-dessous portent sur
              la boutique, telle que les consommateurs l’ont connue.
            </p>
          )}
        </div>

        {/* ── Déclarations ────────────────────────────────────────────────── */}
        <h2 className="rf-h2 rf-mt-32">Déclarations enregistrées</h2>
        <p className="rf-texte rf-mt-10" style={{ fontSize: 13.5, maxWidth: 760 }}>
          Les informations relatives aux litiges sont <strong>déclarées par les utilisateurs</strong>. Recours
          France distingue les déclarations sans pièce, celles comportant une pièce justificative et celles
          dont la nature de la pièce a été contrôlée.{" "}
          <strong>L’existence d’une déclaration ne constitue pas une constatation de faute.</strong> Toute
          entreprise peut contester une déclaration.
        </p>

        {!publier ? (
          <div className="rf-carte rf-mt-18" style={{ padding: "20px 24px", maxWidth: 760 }}>
            <p className="rf-texte" style={{ fontSize: 15, fontWeight: 600 }}>
              {total === 0
                ? "Aucune déclaration enregistrée sur cette boutique."
                : "Trop peu de déclarations pour publication."}
            </p>
            <p className="rf-texte rf-mt-8" style={{ fontSize: 13.5 }}>
              {total === 0
                ? "Si vous rencontrez un litige avec cette boutique, vous pouvez le signaler gratuitement."
                : `Aucune déclaration n’est publiée en dessous de ${SEUIL_PUBLICATION_LITIGES} sur douze mois. Celles déjà déposées sont enregistrées et suivies par leurs auteurs.`}
            </p>
          </div>
        ) : (
          <div className="rf-mt-18">
            <p className="rf-legende">{formatNombre(total)} déclaration{total > 1 ? "s" : ""}</p>
            <Dossiers dossiers={dossiers} total={total} titre="Déclarations récentes" />
          </div>
        )}

        {/* ── Que faire en cas de litige ──────────────────────────────────── */}
        <h2 className="rf-h2 rf-mt-32">Un litige avec {boutique.domaine} : les démarches</h2>
        <p className="rf-texte rf-mt-10" style={{ fontSize: 14, maxWidth: 760 }}>
          Ces démarches sont gratuites et s’effectuent dans cet ordre. Chacune conditionne la suivante : une
          médiation saisie sans réclamation écrite préalable est déclarée irrecevable.
        </p>

        <ol className="rf-mt-16" style={{ margin: 0, paddingLeft: 20, maxWidth: 760 }}>
          {/* L'étape « Signalement sur Recours France » s'adresse à quelqu'un
              qui a déjà déclaré : elle n'a pas de sens pour un visiteur qui
              découvre la page. */}
          {guide.etapes
            .filter((e) => !e.titre.includes("Recours France"))
            .map((e) => (
            <li key={e.numero} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>
                {e.titre} <span className="rf-legende">— {e.delai}</span>
              </div>
              <p className="rf-texte rf-mt-6" style={{ fontSize: 13.5 }}>
                {e.description}
              </p>
              </li>
            ))}
        </ol>

        <h3 className="rf-h3 rf-mt-28">Les délais qui comptent</h3>
        <div className="rf-carte rf-mt-12" style={{ padding: "16px 20px", maxWidth: 760 }}>
          {guide.delaisUtiles.map((d) => (
            <div key={d.libelle} className="rf-carte__rangee" style={{ padding: "8px 0" }}>
              <span className="rf-carte__rangee-cle">{d.libelle}</span>
              <span className="rf-carte__rangee-valeur">{d.valeur}</span>
            </div>
          ))}
        </div>

        <h3 className="rf-h3 rf-mt-28">Les preuves à conserver</h3>
        <ul className="rf-mt-12" style={{ margin: 0, paddingLeft: 20, maxWidth: 760 }}>
          {guide.preuves.slice(0, 5).map((p) => (
            <li key={p.intitule} className="rf-texte" style={{ fontSize: 13.5, marginBottom: 8 }}>
              <strong>{p.intitule}</strong> — {p.utilite}
            </li>
          ))}
        </ul>

        <div className="rf-carte rf-mt-28" style={{ padding: "20px 24px", maxWidth: 760 }}>
          <Link
            href={`/signaler?site=${encodeURIComponent(boutique.domaine)}`}
            className="rf-btn rf-btn--primaire"
          >
            Signaler un litige avec {boutique.domaine}
          </Link>
          <p className="rf-legende rf-mt-12">
            Gratuit, sans création de compte. Vous recevez les démarches dans le bon ordre, avec les dates
            calculées pour votre dossier.
          </p>
        </div>
      </div>
    </Page>
  );
}
