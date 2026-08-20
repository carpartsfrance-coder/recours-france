import Link from "next/link";
import type { Metadata } from "next";
import { Page } from "@/components/chrome";
import { prisma } from "@/lib/db";
import { normaliserDomaine } from "@/lib/boutiques";
import { libelleSecteur } from "@/lib/maillage";
import { formatNombre, formatSiren } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Signaler un problème avec une entreprise",
  description:
    "Rendez votre problème visible publiquement sur la fiche de l’entreprise. Gratuit, sans compte, en une minute environ. Vous recevez également un courrier de réclamation et les démarches à suivre.",
  alternates: { canonical: "/signaler" },
};

/**
 * Entrée générique du tunnel : désigner l'entreprise concernée.
 *
 * Le signalement porte toujours sur quelqu'un. Tant que ce quelqu'un n'est pas
 * désigné, il n'y a rien à décrire — d'où cet écran avant les trois étapes,
 * quand on arrive par l'en-tête plutôt que depuis une fiche.
 *
 * La recherche accepte ce que la personne connaît : un nom, un numéro, ou une
 * adresse de site. C'est souvent le site qu'elle a sous les yeux, et rarement
 * la raison sociale.
 */
export default async function Signaler({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const requete = (q ?? "").trim();

  const chiffres = requete.replace(/\D/g, "");
  const domaine = requete.includes(".") ? normaliserDomaine(requete) : null;

  const resultats = requete
    ? await prisma.entreprise.findMany({
        where: {
          OR: [
            { denomination: { contains: requete, mode: "insensitive" } },
            { enseigne: { contains: requete, mode: "insensitive" } },
            ...(chiffres.length >= 9 ? [{ siren: chiffres.slice(0, 9) }] : []),
            ...(domaine ? [{ siteWeb: { contains: domaine, mode: "insensitive" as const } }] : []),
          ],
        },
        select: {
          slug: true,
          siren: true,
          denomination: true,
          commune: true,
          secteur: true,
          _count: { select: { signalements: true } },
        },
        // Aucun tri en base : trier une recherche par fragment fait renoncer
        // le planificateur aux index trigrammes et balayer les treize millions
        // de lignes — vingt-cinq secondes au lieu de vingt millisecondes. Douze
        // résultats se rangent en mémoire.
        take: 12,
      })
    : [];

  resultats.sort((a, b) => a.denomination.localeCompare(b.denomination, "fr"));

  return (
    <Page
      entete={{ baseline: "Observatoire des problèmes consommateurs", sansCta: true }}
      fil={[{ libelle: "Signaler un problème" }]}
    >
      <div className="rfx">
        <div className="rfx-tunnel" style={{ padding: "36px 20px 56px" }}>
          <h1 className="rfx-h2">Avec quelle entreprise avez-vous un problème ?</h1>
          <p className="rfx-texte" style={{ marginTop: 10 }}>
            Cherchez-la par son nom, son numéro SIREN, ou l’adresse du site sur lequel vous avez
            acheté.
          </p>

          <form action="/signaler" style={{ display: "flex", gap: 8, marginTop: 22 }}>
            <label className="rfx-vh" htmlFor="q" style={{ position: "absolute", left: -9999 }}>
              Nom, SIREN ou adresse du site
            </label>
            <input
              id="q"
              name="q"
              className="rfx-input"
              defaultValue={requete}
              placeholder="ex. Cdiscount, bergamotte.com, 424059822"
              autoComplete="off"
            />
            <button type="submit" className="rfx-btn" style={{ flex: "none" }}>
              Chercher
            </button>
          </form>

          {requete ? (
            <>
              <h2 className="rfx-h2 rfx-h2--secondaire" style={{ marginTop: 32, fontSize: 18 }}>
                {resultats.length > 0
                  ? `Résultats pour « ${requete} »`
                  : `Aucun résultat pour « ${requete} »`}
              </h2>

              {resultats.length > 0 ? (
                <ul className="rfx-liste" style={{ marginTop: 14 }}>
                  {resultats.map((e) => (
                    <li key={e.slug}>
                      <Link href={`/signaler/${e.slug}`}>
                        <span style={{ minWidth: 0 }}>
                          <span style={{ display: "block", fontWeight: 600 }}>{e.denomination}</span>
                          <span className="rfx-mention">
                            {[libelleSecteur(e.secteur ?? "autre"), e.commune, formatSiren(e.siren)]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        </span>
                        <span className="rfx-liste__compteur">
                          {e._count.signalements > 0
                            ? `${formatNombre(e._count.signalements)} signalement${e._count.signalements > 1 ? "s" : ""}`
                            : "→"}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          ) : null}

          {/* La sortie est toujours offerte, résultats ou non : c'est souvent
              la boutique introuvable qui pose le plus de problèmes. */}
          <div className="rfx-bloc" style={{ marginTop: 28 }}>
            <div className="rfx-h4">Vous ne trouvez pas l’entreprise ?</div>
            <p className="rfx-petit" style={{ marginTop: 8 }}>
              C’est fréquent pour une boutique en ligne, une société étrangère ou une enseigne
              récente. Vous pouvez signaler votre problème en indiquant simplement le nom ou
              l’adresse du site.
            </p>
            <Link
              href={requete ? `/signaler/autre?q=${encodeURIComponent(requete)}` : "/signaler/autre"}
              className="rfx-btn rfx-btn--secondaire"
              style={{ marginTop: 14 }}
            >
              Signaler une entreprise non répertoriée
            </Link>
          </div>

          <p className="rfx-mention" style={{ marginTop: 24 }}>
            Gratuit · sans compte · environ une minute
          </p>
        </div>
      </div>
    </Page>
  );
}
