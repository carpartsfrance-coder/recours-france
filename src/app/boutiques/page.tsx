import Link from "next/link";
import type { Metadata } from "next";
import { Page } from "@/components/chrome";
import { prisma } from "@/lib/db";
import { normaliserDomaine, nomDepuisDomaine } from "@/lib/boutiques";
import { formatNombre } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Boutiques en ligne : signaler un litige avec un site marchand",
  description:
    "Cherchez une boutique en ligne par son adresse et consultez les déclarations de consommateurs. Signalez gratuitement un litige avec un site marchand, même si la société qui l’exploite n’est pas identifiée.",
};

const PAR_PAGE = 40;

export default async function Boutiques({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const requete = (q ?? "").trim();
  // La saisie est traitée comme un domaine dès qu'elle en a la forme : c'est
  // ainsi que les gens désignent une boutique — « bergamotte.com », pas une
  // raison sociale qu'ils n'ont jamais vue.
  const domaine = requete ? normaliserDomaine(requete) : null;

  const boutiques = await prisma.boutique.findMany({
    where: requete
      ? { OR: [{ domaine: { contains: domaine ?? requete, mode: "insensitive" } }, { nom: { contains: requete, mode: "insensitive" } }] }
      : undefined,
    orderBy: [{ majLe: "desc" }],
    take: PAR_PAGE,
    include: {
      entreprise: { select: { denomination: true } },
      _count: { select: { signalements: true } },
    },
  });

  const exacte = domaine ? boutiques.find((b) => b.domaine === domaine) : undefined;

  return (
    <Page fil={[{ libelle: "Boutiques en ligne" }]} entete={{ navActive: "boutiques" }}>
      <div className="rf-conteneur" style={{ padding: "36px 32px 56px" }}>
        <h1 className="rf-h1 rf-h1--moyen">Boutiques en ligne</h1>
        <p className="rf-texte rf-texte--fort rf-mt-12" style={{ maxWidth: 720 }}>
          Cherchez un site marchand par son adresse. Vous pouvez signaler un litige avec une boutique{" "}
          <strong>même si la société qui l’exploite n’est pas identifiée</strong> — c’est le site que vous
          connaissez, pas son numéro d’immatriculation.
        </p>

        <form action="/boutiques" className="rf-ligne rf-mt-20" style={{ gap: 8, maxWidth: 620 }}>
          <label className="rf-vh" htmlFor="q">
            Adresse du site
          </label>
          <input
            id="q"
            name="q"
            className="rf-input"
            defaultValue={requete}
            placeholder="ex. bergamotte.com"
            autoComplete="off"
          />
          <button type="submit" className="rf-btn rf-btn--primaire">
            Chercher
          </button>
        </form>

        {/* Domaine valide mais inconnu : on propose de le déclarer plutôt que
            de renvoyer une page vide. */}
        {domaine && !exacte ? (
          <div className="rf-carte rf-mt-24" style={{ padding: "20px 24px", maxWidth: 720 }}>
            <div style={{ fontSize: 16.5, fontWeight: 700 }}>
              Aucune déclaration enregistrée pour {domaine}
            </div>
            <p className="rf-texte rf-mt-8" style={{ fontSize: 14 }}>
              Cette boutique n’a encore fait l’objet d’aucun signalement. Si vous rencontrez un litige avec{" "}
              {nomDepuisDomaine(domaine)}, vous pouvez le déclarer : la fiche sera créée à cette occasion.
            </p>
            <Link
              href={`/signaler?site=${encodeURIComponent(domaine)}`}
              className="rf-btn rf-btn--primaire rf-mt-16"
            >
              Signaler un litige avec {domaine}
            </Link>
          </div>
        ) : null}

        <h2 className="rf-h2 rf-mt-32">
          {requete ? `Résultats pour « ${requete} »` : "Boutiques signalées récemment"}
        </h2>

        {boutiques.length === 0 ? (
          <p className="rf-texte rf-mt-12">
            {requete
              ? "Aucune boutique ne correspond à cette recherche."
              : "Aucune boutique n’a encore été signalée. Les fiches sont créées à la première déclaration."}
          </p>
        ) : (
          <div className="rf-pile rf-mt-16" style={{ gap: 10 }}>
            {boutiques.map((b) => (
              <Link
                key={b.id}
                href={`/boutiques/${b.slug}`}
                className="rf-carte"
                style={{ padding: "16px 20px", textDecoration: "none", color: "inherit", display: "block" }}
              >
                <div style={{ fontSize: 15.5, fontWeight: 700 }}>{b.domaine}</div>
                <div className="rf-micro rf-mt-6">
                  {b.entreprise
                    ? `Exploité par ${b.entreprise.denomination}`
                    : "Société exploitante non établie"}
                  {" · "}
                  {formatNombre(b._count.signalements)} déclaration
                  {b._count.signalements > 1 ? "s" : ""}
                </div>
              </Link>
            ))}
          </div>
        )}

        <p className="rf-legende rf-mt-28" style={{ maxWidth: 720 }}>
          Les déclarations sont faites par les utilisateurs. L’existence d’une fiche ne constitue pas une
          constatation de faute. Toute entreprise peut contester une déclaration la concernant.
        </p>
      </div>
    </Page>
  );
}
