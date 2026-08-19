import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Page } from "@/components/chrome";
import { Dossiers } from "@/components/fiche/dossiers";
import { prisma } from "@/lib/db";
import { versDossier } from "@/lib/dossiers";
import { statistiquesEntreprise } from "@/lib/stats";
import { formatNombre, formatSiren } from "@/lib/format";

export const dynamic = "force-dynamic";

const PAR_PAGE = 25;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const entreprise = await prisma.entreprise.findUnique({ where: { slug } });
  return {
    title: entreprise ? `Dossiers enregistrés — ${entreprise.denomination}` : "Dossiers enregistrés",
    description: entreprise
      ? `Tous les dossiers de consommateurs enregistrés sur Recours France concernant ${entreprise.denomination}, avec leur niveau de vérification et leur statut déclaré.`
      : undefined,
  };
}

export default async function TousLesDossiers({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const page = Math.max(1, Number(query.page ?? 1) || 1);

  const entreprise = await prisma.entreprise.findUnique({ where: { slug } });
  if (!entreprise) notFound();

  const [signalements, total, stats] = await Promise.all([
    prisma.signalement.findMany({
      where: { entrepriseId: entreprise.id, moderation: "PUBLIE" },
      orderBy: { creeLe: "desc" },
      skip: (page - 1) * PAR_PAGE,
      take: PAR_PAGE,
    }),
    prisma.signalement.count({ where: { entrepriseId: entreprise.id, moderation: "PUBLIE" } }),
    statistiquesEntreprise(entreprise.id),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAR_PAGE));
  const lien = (n: number) => `/entreprises/${slug}/dossiers${n > 1 ? `?page=${n}` : ""}`;

  return (
    <Page
      habillage="institutionnel"
      entete={{ baseline: "Signalement des litiges de consommation" }}
      fil={[
        { libelle: "Annuaire des entreprises", href: "/entreprises" },
        { libelle: entreprise.denomination, href: `/entreprises/${slug}` },
        { libelle: "Dossiers enregistrés" },
      ]}
    >
      <div className="rfi-conteneur" style={{ padding: "32px 32px 26px" }}>
        <h1 className="rfi-h1">Dossiers enregistrés</h1>
        <p className="rfi-chapo" style={{ maxWidth: 780 }}>
          {entreprise.denomination} — SIREN {formatSiren(entreprise.siren)}. {formatNombre(total)} dossier
          {total > 1 ? "s" : ""} déposé{total > 1 ? "s" : ""} par des consommateurs, dont{" "}
          {formatNombre(stats.verifies)} vérifié{stats.verifies > 1 ? "s" : ""} sur les douze derniers mois.
          Seuls les dossiers avec justificatif entrent dans les taux publiés.
        </p>
      </div>

      <section className="rfi-section--dominante">
        <div className="rfi-conteneur">
          {total === 0 ? (
            <div style={{ padding: "26px 0" }}>
              <p style={{ fontSize: 16, fontWeight: 600 }}>Aucun dossier enregistré sur cette entreprise.</p>
              <p className="rfi-chapo" style={{ maxWidth: 720 }}>
                Si vous rencontrez un litige avec {entreprise.denomination}, vous pouvez le signaler
                gratuitement : le signalement prend trois à cinq minutes et ne demande aucun compte.
              </p>
              <p style={{ marginTop: 18 }}>
                <Link href={`/signaler?siren=${entreprise.siren}`} className="rfi-bouton" style={{ display: "inline-block" }}>
                  Signaler un litige
                </Link>
              </p>
            </div>
          ) : (
            <>
              <Dossiers
                slug={slug}
                dossiers={signalements.map(versDossier)}
                total={total}
                titre={`Dossiers ${page > 1 ? `— page ${page} sur ${pages}` : "les plus récents"}`}
              />

              {pages > 1 ? (
                <nav
                  aria-label="Pagination des dossiers"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 16,
                    flexWrap: "wrap",
                    alignItems: "center",
                    borderTop: "1px solid var(--rfi-filet)",
                    marginTop: 18,
                    paddingTop: 16,
                  }}
                >
                  <span className="rfi-source">
                    Page {page} sur {pages}
                  </span>
                  <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                    {page > 1 ? (
                      <Link href={lien(page - 1)} style={{ fontSize: 13.5 }}>
                        Page précédente
                      </Link>
                    ) : null}
                    {page < pages ? (
                      <Link href={lien(page + 1)} style={{ fontSize: 13.5 }}>
                        Page suivante
                      </Link>
                    ) : null}
                  </div>
                </nav>
              ) : null}
            </>
          )}

          <p className="rfi-legende" style={{ marginTop: 20, maxWidth: 820 }}>
            Chaque statut affiché est déclaré par le consommateur : Recours France ne transmet pas les
            réclamations aux professionnels et ne recueille pas leurs réponses. Une résolution n’est
            comptabilisée qu’après confirmation explicite du consommateur.
          </p>
          <p style={{ marginTop: 14 }}>
            <Link href={`/entreprises/${slug}`} style={{ fontSize: 13.5 }}>
              Revenir à la fiche {entreprise.denomination}
            </Link>
          </p>
        </div>
      </section>
    </Page>
  );
}
