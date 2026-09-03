import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Page } from "@/components/chrome";
import { prisma } from "@/lib/db";
import { formatNombre } from "@/lib/format";
import {
  cheminCommune,
  listerAvecSignalDAbord,
  cheminDepartement,
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


type Params = Promise<{ secteur: string; departement: string; commune: string }>;

async function resoudre(params: Params) {
  const { secteur, departement, commune } = await params;
  const code = departementDepuisSlug(departement);
  if (!secteurExiste(secteur) || !code) return null;

  // Le nom affiché vient de la base, pas de l'URL : « fos-sur-mer » doit
  // s'afficher « FOS-SUR-MER » tel que le répertoire l'écrit.
  const echantillon = await prisma.entreprise.findFirst({
    where: { secteur, departement: code, communeSlug: commune },
    select: { commune: true },
  });
  if (!echantillon?.commune) return null;

  return {
    secteur,
    code,
    slugCommune: commune,
    fragmentDept: departement,
    nomCommune: echantillon.commune,
    nomDept: nomDepartement(code)!,
    libelle: libelleSecteur(secteur),
  };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const r = await resoudre(params);
  if (!r) return {};
  return {
    title: `${r.libelle} à ${r.nomCommune} : entreprises et litiges`,
    description: `Entreprises du secteur « ${r.libelle} » à ${r.nomCommune} (${r.code}). Consultez les litiges déclarés par des consommateurs et signalez le vôtre gratuitement.`,
    alternates: { canonical: `/annuaire/${r.secteur}/${r.fragmentDept}/${r.slugCommune}` },
  };
}

export default async function Commune({ params }: { params: Params }) {
  const r = await resoudre(params);
  if (!r) notFound();

  const base = {
    secteur: r.secteur,
    departement: r.code,
    communeSlug: r.slugCommune,
    etatAdministratif: "ACTIVE" as const,
  };

  const [entreprises, total, voisines] = await Promise.all([
    listerAvecSignalDAbord(base, 120),
    prisma.entreprise.count({ where: base }),
    prisma.entreprise.groupBy({
      by: ["commune", "communeSlug"],
      _count: { _all: true },
      where: {
        secteur: r.secteur,
        departement: r.code,
        etatAdministratif: "ACTIVE",
        communeSlug: { not: r.slugCommune },
      },
      orderBy: { _count: { commune: "desc" } },
      take: 12,
    }),
  ]);

  return (
    <Page
      fil={[
        { libelle: "Annuaire", href: "/annuaire" },
        { libelle: r.libelle, href: cheminSecteur(r.secteur) },
        { libelle: r.nomDept, href: cheminDepartement(r.secteur, r.code) ?? undefined },
        { libelle: r.nomCommune },
      ]}
      entete={{ navActive: "annuaire" }}
    >
      <div className="rf-conteneur" style={{ padding: "36px 32px 56px" }}>
        <h1 className="rf-h1 rf-h1--moyen">
          {r.libelle} à {r.nomCommune}
        </h1>
        <p className="rf-texte rf-texte--fort rf-mt-12" style={{ maxWidth: 720 }}>
          {formatNombre(total)} entreprise{total > 1 ? "s" : ""} de ce secteur {total > 1 ? "sont" : "est"}{" "}
          immatriculée{total > 1 ? "s" : ""} à {r.nomCommune} ({r.nomDept}). Un litige avec l’une d’elles
          peut être déclaré gratuitement, sans passer par un avocat.
        </p>

        <div className="rf-pile rf-mt-24" style={{ gap: 8 }}>
          {entreprises.map((e) => (
            <Link key={e.slug} href={`/entreprises/${e.slug}`} className="rf-carte" style={CARTE}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>
                {e.denomination}
                {e.enseigne && e.enseigne !== e.denomination ? (
                  <span style={{ fontWeight: 500 }}> — {e.enseigne}</span>
                ) : null}
              </div>
              <div className="rf-micro rf-mt-6">
                {[e.adresseSiege, e.nafLibelle].filter(Boolean).join(" · ") || "Adresse non précisée"}
                {e._count.signalements > 0
                  ? ` · ${formatNombre(e._count.signalements)} litige${e._count.signalements > 1 ? "s" : ""} déclaré${e._count.signalements > 1 ? "s" : ""}`
                  : ""}
              </div>
            </Link>
          ))}
        </div>

        {total > entreprises.length ? (
          <p className="rf-micro rf-mt-16">
            {formatNombre(total - entreprises.length)} autres entreprises de ce secteur à {r.nomCommune}{" "}
            ne sont pas listées ici. Utilisez la{" "}
            <Link href={`/entreprises?secteur=${r.secteur}&departement=${r.code}`}>recherche</Link> pour
            les retrouver.
          </p>
        ) : null}

        {voisines.length > 0 ? (
          <>
            <h2 className="rf-h2 rf-mt-32">Ailleurs dans {r.nomDept}</h2>
            <div className="rf-ligne rf-mt-12" style={{ gap: 8, flexWrap: "wrap" }}>
              {voisines.map((v) => {
                const href = v.communeSlug ? cheminCommune(r.secteur, r.code, v.commune!) : null;
                return href ? (
                  <Link key={v.communeSlug} href={href} className="rf-puce">
                    {v.commune} ({formatNombre(v._count._all)})
                  </Link>
                ) : null;
              })}
            </div>
          </>
        ) : null}

        <div className="rf-carte rf-mt-32" style={{ padding: "20px 24px", maxWidth: 720 }}>
          <div style={{ fontSize: 16.5, fontWeight: 700 }}>Un litige avec l’une de ces entreprises ?</div>
          <p className="rf-texte rf-mt-8" style={{ fontSize: 14 }}>
            La déclaration est gratuite et prend quelques minutes. Elle constitue une trace datée de votre
            réclamation, utile si vous saisissez ensuite un médiateur de la consommation ou le tribunal.
          </p>
          <Link href="/signaler" className="rf-btn rf-btn--primaire rf-mt-16">
            Signaler un litige
          </Link>
        </div>

        <p className="rf-legende rf-mt-28" style={{ maxWidth: 720 }}>
          Fiches établies à partir du répertoire Sirene. La présence d’une entreprise dans cette liste ne
          constitue ni un signalement ni une constatation de faute.
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
