import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Page } from "@/components/chrome";
import { prisma } from "@/lib/db";
import { formatNombre } from "@/lib/format";
import {
  DEPARTEMENTS,
  listerAvecSignalDAbord,
  SECTEURS,
  cheminDepartement,
  libelleSecteur,
  secteurExiste,
} from "@/lib/maillage";

export const revalidate = 86400;

/** Les seize secteurs sont connus d'avance : autant les rendre à la compilation. */
export function generateStaticParams() {
  return SECTEURS.map((s) => ({ secteur: s.code }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ secteur: string }>;
}): Promise<Metadata> {
  const { secteur } = await params;
  if (!secteurExiste(secteur)) return {};
  const libelle = libelleSecteur(secteur);
  return {
    title: `${libelle} : entreprises et litiges déclarés`,
    description: `Annuaire des entreprises du secteur « ${libelle} » en France, par département. Litiges déclarés par les consommateurs, médiateur compétent et démarches possibles.`,
    alternates: { canonical: `/annuaire/${secteur}` },
  };
}

export default async function Secteur({ params }: { params: Promise<{ secteur: string }> }) {
  const { secteur } = await params;
  if (!secteurExiste(secteur)) notFound();
  const libelle = libelleSecteur(secteur);

  const [parDepartement, notables, total] = await Promise.all([
    prisma.entreprise.groupBy({
      by: ["departement"],
      _count: { _all: true },
      where: { secteur, etatAdministratif: "ACTIVE", departement: { not: null } },
    }),
    listerAvecSignalDAbord({ secteur, etatAdministratif: "ACTIVE" }, 60),
    prisma.entreprise.count({ where: { secteur, etatAdministratif: "ACTIVE" } }),
  ]);

  const compte = new Map(parDepartement.map((d) => [d.departement ?? "", d._count._all]));
  const departements = DEPARTEMENTS.filter((d) => (compte.get(d.code) ?? 0) > 0);

  return (
    <Page
      fil={[{ libelle: "Annuaire", href: "/annuaire" }, { libelle }]}
      entete={{ navActive: "annuaire" }}
    >
      <div className="rf-conteneur" style={{ padding: "36px 32px 56px" }}>
        <h1 className="rf-h1 rf-h1--moyen">{libelle}</h1>
        <p className="rf-texte rf-texte--fort rf-mt-12" style={{ maxWidth: 720 }}>
          {formatNombre(total)} entreprises actives dans ce secteur. Un litige avec l’une d’elles peut
          être déclaré gratuitement, que la société ait ou non un site internet.
        </p>

        {departements.length > 0 ? (
          <>
            <h2 className="rf-h2 rf-mt-32">Par département</h2>
            <div
              className="rf-mt-16"
              style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}
            >
              {departements.map((d) => {
                const href = cheminDepartement(secteur, d.code);
                return href ? (
                  <Link key={d.code} href={href} className="rf-carte" style={CARTE}>
                    <span style={{ fontWeight: 650 }}>
                      {d.nom} ({d.code})
                    </span>
                    <span className="rf-micro"> · {formatNombre(compte.get(d.code) ?? 0)}</span>
                  </Link>
                ) : null;
              })}
            </div>
          </>
        ) : null}

        <h2 className="rf-h2 rf-mt-32">Entreprises du secteur</h2>
        {notables.length === 0 ? (
          <p className="rf-texte rf-mt-12">Aucune entreprise active répertoriée dans ce secteur.</p>
        ) : (
          <div className="rf-pile rf-mt-16" style={{ gap: 8 }}>
            {notables.map((e) => (
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
        )}

        <p className="rf-legende rf-mt-28" style={{ maxWidth: 720 }}>
          Le classement met en tête les entreprises ayant fait l’objet de déclarations. Une déclaration
          est le récit d’un consommateur : elle n’établit aucune faute.
        </p>
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
