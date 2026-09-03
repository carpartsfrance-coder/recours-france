import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Page } from "@/components/chrome";
import { prisma } from "@/lib/db";
import { formatNombre } from "@/lib/format";
import {
  cheminCommune,
  listerAvecSignalDAbord,
  cheminSecteur,
  departementDepuisSlug,
  libelleSecteur,
  nomDepartement,
  secteurExiste,
} from "@/lib/maillage";

export const revalidate = 86400;

/**
 * Sans cette fonction, le `revalidate` ci-dessus est ignoré : un segment
 * dynamique dépourvu de `generateStaticParams` est rendu à chaque requête. La
 * liste est vide à dessein — la page est générée à la première demande, puis
 * servie du cache.
 */
export async function generateStaticParams() {
  return [];
}


async function resoudre(params: Promise<{ secteur: string; departement: string }>) {
  const { secteur, departement } = await params;
  const code = departementDepuisSlug(departement);
  if (!secteurExiste(secteur) || !code) return null;
  return { secteur, code, nom: nomDepartement(code)!, libelle: libelleSecteur(secteur), fragment: departement };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ secteur: string; departement: string }>;
}): Promise<Metadata> {
  const r = await resoudre(params);
  if (!r) return {};
  return {
    title: `${r.libelle} — ${r.nom} (${r.code})`,
    description: `Entreprises du secteur « ${r.libelle} » dans le département ${r.nom}. Litiges déclarés par les consommateurs, commune par commune.`,
    alternates: { canonical: `/annuaire/${r.secteur}/${r.fragment}` },
  };
}

export default async function Departement({
  params,
}: {
  params: Promise<{ secteur: string; departement: string }>;
}) {
  const r = await resoudre(params);
  if (!r) notFound();

  const base = { secteur: r.secteur, departement: r.code, etatAdministratif: "ACTIVE" as const };

  const [communes, entreprises, total] = await Promise.all([
    prisma.entreprise.groupBy({
      by: ["commune"],
      _count: { _all: true },
      where: { ...base, commune: { not: null } },
      orderBy: { _count: { commune: "desc" } },
      take: 200,
    }),
    listerAvecSignalDAbord(base, 80),
    prisma.entreprise.count({ where: base }),
  ]);

  // Une page de département sans une seule entreprise n'apporte rien et dilue
  // le budget d'exploration : elle n'existe pas.
  if (total === 0) notFound();

  return (
    <Page
      fil={[
        { libelle: "Annuaire", href: "/annuaire" },
        { libelle: r.libelle, href: cheminSecteur(r.secteur) },
        { libelle: r.nom },
      ]}
      entete={{ navActive: "annuaire" }}
    >
      <div className="rf-conteneur" style={{ padding: "36px 32px 56px" }}>
        <h1 className="rf-h1 rf-h1--moyen">
          {r.libelle} — {r.nom}
        </h1>
        <p className="rf-texte rf-texte--fort rf-mt-12" style={{ maxWidth: 720 }}>
          {formatNombre(total)} entreprises actives dans le département {r.nom} ({r.code}).
        </p>

        {communes.length > 0 ? (
          <>
            <h2 className="rf-h2 rf-mt-32">Par commune</h2>
            <div
              className="rf-mt-16"
              style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))" }}
            >
              {communes.map((c) => {
                const nom = c.commune!;
                const href = cheminCommune(r.secteur, r.code, nom);
                return href ? (
                  <Link key={nom} href={href} className="rf-carte" style={CARTE}>
                    <span style={{ fontWeight: 650 }}>{nom}</span>
                    <span className="rf-micro"> · {formatNombre(c._count._all)}</span>
                  </Link>
                ) : null;
              })}
            </div>
          </>
        ) : null}

        <h2 className="rf-h2 rf-mt-32">Entreprises du département</h2>
        <div className="rf-pile rf-mt-16" style={{ gap: 8 }}>
          {entreprises.map((e) => (
            <Link key={e.slug} href={`/entreprises/${e.slug}`} className="rf-carte" style={CARTE}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{e.denomination}</div>
              <div className="rf-micro rf-mt-6">
                {[e.commune, e.nafLibelle].filter(Boolean).join(" · ") || "Activité non précisée"}
                {e._count.signalements > 0
                  ? ` · ${formatNombre(e._count.signalements)} litige${e._count.signalements > 1 ? "s" : ""} déclaré${e._count.signalements > 1 ? "s" : ""}`
                  : ""}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </Page>
  );
}

const CARTE = {
  padding: "14px 18px",
  textDecoration: "none",
  color: "inherit",
  display: "block",
} as const;
