import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Page } from "@/components/chrome";
import { prisma } from "@/lib/db";
import { formatDate, formatNombre, formatSiren } from "@/lib/format";

export const dynamic = "force-dynamic";

const PAR_PAGE = 20;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const entreprise = await prisma.entreprise.findUnique({ where: { slug } });
  return {
    title: entreprise ? `Avis des consommateurs — ${entreprise.denomination}` : "Avis des consommateurs",
    description: entreprise
      ? `Avis publiés sur ${entreprise.denomination}. Seuls les avis rattachés à un dossier vérifié entrent dans la moyenne.`
      : undefined,
  };
}

export default async function TousLesAvis({
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

  const [verifies, totalVerifies, nonVerifies, notes] = await Promise.all([
    prisma.avis.findMany({
      where: { entrepriseId: entreprise.id, moderation: "PUBLIE", verifie: true },
      orderBy: { publieLe: "desc" },
      skip: (page - 1) * PAR_PAGE,
      take: PAR_PAGE,
      include: { signalement: { select: { reference: true, resolutionConfirmee: true } } },
    }),
    prisma.avis.count({ where: { entrepriseId: entreprise.id, moderation: "PUBLIE", verifie: true } }),
    prisma.avis.findMany({
      where: { entrepriseId: entreprise.id, moderation: "PUBLIE", verifie: false },
      orderBy: { publieLe: "desc" },
      take: 30,
    }),
    prisma.avis.findMany({
      where: { entrepriseId: entreprise.id, moderation: "PUBLIE", verifie: true },
      select: { note: true },
    }),
  ]);

  const moyenne = notes.length ? notes.reduce((t, a) => t + a.note, 0) / notes.length : null;
  const distribution = [5, 4, 3, 2, 1].map((etoile) => ({
    etoile,
    nombre: notes.filter((n) => n.note === etoile).length,
    pourcentage: notes.length ? Math.round((notes.filter((n) => n.note === etoile).length / notes.length) * 100) : 0,
  }));
  const pages = Math.max(1, Math.ceil(totalVerifies / PAR_PAGE));
  const lien = (n: number) => `/entreprises/${slug}/tous-les-avis${n > 1 ? `?page=${n}` : ""}`;

  return (
    <Page
      habillage="institutionnel"
      entete={{ baseline: "Signalement des litiges de consommation" }}
      fil={[
        { libelle: "Annuaire des entreprises", href: "/entreprises" },
        { libelle: entreprise.denomination, href: `/entreprises/${slug}` },
        { libelle: "Avis des consommateurs" },
      ]}
    >
      <div className="rfi-conteneur" style={{ padding: "32px 32px 26px" }}>
        <h1 className="rfi-h1">Avis des consommateurs</h1>
        <p className="rfi-chapo" style={{ maxWidth: 780 }}>
          {entreprise.denomination} — SIREN {formatSiren(entreprise.siren)}. Appréciations subjectives,
          distinctes des dossiers documentés. Seuls les avis rattachés à un dossier vérifié entrent dans la
          moyenne publiée.
        </p>
      </div>

      <section className="rfi-section--dominante">
        <div className="rfi-conteneur">
          <div className="rfi-deux-colonnes">
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 18,
                  flexWrap: "wrap",
                  alignItems: "baseline",
                  borderBottom: "1px solid var(--rfi-marine)",
                  paddingBottom: 11,
                }}
              >
                <h2 className="rfi-h3">
                  Avis rattachés à un dossier vérifié
                  {pages > 1 ? ` — page ${page} sur ${pages}` : ""}
                </h2>
                <span className="rfi-source">{formatNombre(totalVerifies)} avis</span>
              </div>

              {verifies.length === 0 ? (
                <p className="rfi-legende" style={{ padding: "20px 0" }}>
                  Aucun avis rattaché à un dossier vérifié n’a encore été publié pour cette entreprise.
                </p>
              ) : (
                verifies.map((a) => (
                  <article key={a.id} style={{ padding: "16px 0", borderBottom: "1px solid var(--rfi-filet)" }}>
                    <div
                      style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap", alignItems: "center" }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 13.5, color: "var(--rf-texte-2)", letterSpacing: 2 }} aria-hidden="true">
                          {"★".repeat(a.note)}
                          {"☆".repeat(5 - a.note)}
                        </span>
                        <span className="rf-vh">{a.note} sur 5</span>
                        <span style={{ fontSize: 13.5, fontWeight: 600 }}>{a.auteur}</span>
                        {a.ville ? <span className="rfi-source">{a.ville}</span> : null}
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

              {pages > 1 ? (
                <nav
                  aria-label="Pagination des avis"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 16,
                    flexWrap: "wrap",
                    alignItems: "center",
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

              {nonVerifies.length ? (
                <div style={{ marginTop: 34 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 18,
                      flexWrap: "wrap",
                      alignItems: "baseline",
                      borderBottom: "1px solid var(--rfi-filet)",
                      paddingBottom: 11,
                    }}
                  >
                    <h2 className="rfi-h3">Avis non vérifiés</h2>
                    <span className="rfi-source">Exclus de la moyenne et de toutes les statistiques</span>
                  </div>
                  {nonVerifies.map((a) => (
                    <article key={a.id} style={{ padding: "16px 0", borderBottom: "1px solid var(--rfi-filet-ligne)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 13.5, color: "var(--rf-texte-desactive)", letterSpacing: 2 }} aria-hidden="true">
                          {"★".repeat(a.note)}
                          {"☆".repeat(5 - a.note)}
                        </span>
                        <span className="rf-vh">{a.note} sur 5</span>
                        <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--rf-texte-2)" }}>{a.auteur}</span>
                        <span className="rfi-badge rfi-badge--neutre">Non vérifié</span>
                        <span className="rfi-source" style={{ fontSize: 11.5 }}>
                          {formatDate(a.publieLe ?? a.creeLe)}
                        </span>
                      </div>
                      <p style={{ fontSize: 13.5, lineHeight: 1.65, marginTop: 10, color: "var(--rf-texte-2)" }}>
                        {a.texte}
                      </p>
                    </article>
                  ))}
                </div>
              ) : null}
            </div>

            <div style={{ minWidth: 0 }}>
              <div className="rfi-ouverture" style={{ paddingTop: 14 }}>
                <h2 className="rfi-h3 rfi-h3--petit">Note moyenne</h2>
                <div className="rf-nombres" style={{ fontSize: 34, fontWeight: 700, lineHeight: 1, marginTop: 10 }}>
                  {moyenne === null ? "—" : moyenne.toFixed(1).replace(".", ",")}
                  <span style={{ fontSize: 16, color: "var(--rf-texte-3)", fontWeight: 400 }}>/5</span>
                </div>
                <div className="rfi-source" style={{ marginTop: 6 }}>
                  Sur {formatNombre(totalVerifies)} avis rattachés à un dossier vérifié
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
                  {distribution.map((d) => (
                    <div key={d.etoile}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
                        <span className="rf-nombres" style={{ fontSize: 13 }}>
                          {d.etoile} ★
                        </span>
                        <span className="rf-nombres" style={{ fontSize: 13, color: "var(--rf-texte-2)" }}>
                          {d.pourcentage} %
                        </span>
                      </div>
                      <div className="rfi-barre">
                        <span style={{ width: `${d.pourcentage}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rfi-ouverture--legere" style={{ marginTop: 26, paddingTop: 16 }}>
                <h2 className="rfi-h3 rfi-h3--petit">Publier un avis</h2>
                <p style={{ fontSize: 12.5, color: "var(--rf-texte-2)", lineHeight: 1.6, marginTop: 8 }}>
                  Un avis rattaché à un dossier vérifié, déposé avec la même adresse email, est distingué et
                  entre dans la moyenne. Les avis sont modérés avant publication.
                </p>
                <p style={{ marginTop: 12 }}>
                  <Link href={`/entreprises/${slug}/avis`} style={{ fontSize: 13.5 }}>
                    Laisser un avis
                  </Link>
                </p>
                <p style={{ marginTop: 8 }}>
                  <Link href="/charte-de-moderation" style={{ fontSize: 13.5 }}>
                    Charte de modération
                  </Link>
                </p>
              </div>

              <div className="rfi-ouverture--legere" style={{ marginTop: 26, paddingTop: 16 }}>
                <p style={{ marginTop: 0 }}>
                  <Link href={`/entreprises/${slug}`} style={{ fontSize: 13.5 }}>
                    Revenir à la fiche {entreprise.denomination}
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Page>
  );
}
