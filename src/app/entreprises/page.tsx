import Link from "next/link";
import type { Metadata } from "next";
import { Page } from "@/components/chrome";
import { prisma } from "@/lib/db";
import { compteursAnnuaire } from "@/lib/stats";
import { rechercherEntreprises } from "@/lib/sources";
import { versEntreprise } from "@/lib/sources/recherche-entreprises";
import { couleurScore } from "@/lib/scoring";
import { DEPARTEMENTS, SECTEURS, libelleSecteur, sectionsPourSecteur } from "@/lib/referentiels/naf";
import {
  formatNombre,
  formatPourcent,
  formatSiren,
  libelleAnciennete,
  slugEntreprise,
  formatDate,
} from "@/lib/format";

export const dynamic = "force-dynamic";

/**
 * Conditions de recherche sur une saisie libre.
 *
 * Le rapprochement par SIREN ne s'applique qu'à une saisie qui EST un numéro.
 * Retirer les non-chiffres d'un nom quelconque produit un fragment absurde :
 * « 7night » devenait « 7 », et la recherche renvoyait toutes les entreprises
 * dont le SIREN contient un 7 — la moitié du catalogue, dans laquelle le
 * résultat cherché se noyait.
 */
function clausesRecherche(requete: string) {
  const chiffres = requete.replace(/\D/g, "");
  const clauses: Record<string, unknown>[] = [
    { denomination: { contains: requete, mode: "insensitive" } },
    { enseigne: { contains: requete, mode: "insensitive" } },
  ];
  // Un SIREN compte neuf chiffres, un SIRET quatorze. En deçà, la saisie est
  // un nom qui contient des chiffres, pas un identifiant.
  if (chiffres.length >= 9) clauses.push({ siren: chiffres.slice(0, 9) });
  return clauses;
}

export const metadata: Metadata = {
  title: "Annuaire des entreprises",
  description:
    "Fiches d’entreprises constituées à partir des registres publics (Sirene, RNE/INPI, BODACC), croisées avec les signalements de consommateurs.",
};

type Ligne = {
  slug: string;
  siren: string;
  denomination: string;
  meta: string;
  naf: string | null;
  anciennete: string | null;
  active: boolean;
  indice: number | null;
  signalements: number;
  verifies: number;
  tauxReponse: number | null;
  connue: boolean;
};

const TRIS = [
  { cle: "pertinence", libelle: "Pertinence" },
  { cle: "litiges", libelle: "Plus de litiges" },
  { cle: "indice", libelle: "Indice le plus bas" },
];

export default async function Annuaire({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const saisie = (typeof params.q === "string" ? params.q : "").trim();
  /**
   * En deçà de trois caractères, on ne cherche pas.
   *
   * « a » correspond à 9 592 463 fiches : la base les parcourt toutes, la page
   * affiche « 9 592 463 fiches correspondent », et personne n'a rien appris.
   * Aucun index ne sauve ce cas — un index trigramme ne sait rien faire d'un
   * motif de moins de trois caractères, c'est sa définition même.
   */
  const requete = saisie.length >= 3 ? saisie : "";
  const saisieTropCourte = saisie.length > 0 && saisie.length < 3;
  const secteur = typeof params.secteur === "string" ? params.secteur : "";
  const departement = typeof params.departement === "string" ? params.departement : "";
  const tri = typeof params.tri === "string" && TRIS.some((t) => t.cle === params.tri) ? params.tri : "pertinence";
  const verifiesSeulement = params.verifies === "1";
  const page = Math.max(1, Number(params.page ?? 1) || 1);

  const { lignes, total, totalRegistres, erreurSource, pagesApi } = await collecter({
    // La valeur filtrée, pas la saisie : c'est ici que le garde des trois
    // caractères doit s'appliquer. La lui passer brute le contournait.
    requete,
    secteur,
    departement,
    page,
  });

  let resultats = lignes;
  if (verifiesSeulement) resultats = resultats.filter((l) => l.verifies > 0);
  if (tri === "litiges") resultats = [...resultats].sort((a, b) => b.signalements - a.signalements);
  if (tri === "indice")
    resultats = [...resultats].sort((a, b) => (a.indice ?? 101) - (b.indice ?? 101));

  const lienPage = (n: number) => {
    const p = new URLSearchParams();
    if (saisie) p.set("q", saisie);
    if (secteur) p.set("secteur", secteur);
    if (departement) p.set("departement", departement);
    if (tri !== "pertinence") p.set("tri", tri);
    if (verifiesSeulement) p.set("verifies", "1");
    if (n > 1) p.set("page", String(n));
    return `/entreprises${p.toString() ? `?${p}` : ""}`;
  };

  const lienTri = (cle: string) => {
    const p = new URLSearchParams();
    if (saisie) p.set("q", saisie);
    if (secteur) p.set("secteur", secteur);
    if (departement) p.set("departement", departement);
    if (cle !== "pertinence") p.set("tri", cle);
    if (verifiesSeulement) p.set("verifies", "1");
    return `/entreprises${p.toString() ? `?${p}` : ""}`;
  };

  const lienBascule = () => {
    const p = new URLSearchParams();
    if (saisie) p.set("q", saisie);
    if (secteur) p.set("secteur", secteur);
    if (departement) p.set("departement", departement);
    if (tri !== "pertinence") p.set("tri", tri);
    if (!verifiesSeulement) p.set("verifies", "1");
    return `/entreprises${p.toString() ? `?${p}` : ""}`;
  };

  return (
    <Page
      entete={{
        baseline: "Signalement et suivi des litiges de consommation",
        recherche: true,
        valeurRecherche: requete,
        navActive: "annuaire",
      }}
      fil={[{ libelle: "Annuaire des entreprises" }]}
    >
      <div className="rf-conteneur" style={{ padding: "32px 32px 48px" }}>
        <h1 className="rf-h1 rf-h1--petit">Annuaire des entreprises</h1>
        <p className="rf-texte rf-mt-10" style={{ maxWidth: 760 }}>
          Fiches constituées à partir des registres publics. Les statistiques de litiges proviennent des
          signalements de consommateurs, avec leur niveau de vérification.
        </p>

        <div className="rf-carte rf-mt-24">
          {/* ── Filtres ─────────────────────────────────────────────────── */}
          <form
            method="get"
            style={{
              display: "flex",
              gap: 14,
              padding: "16px 20px",
              flexWrap: "wrap",
              alignItems: "flex-end",
              borderBottom: "1px solid var(--rf-ligne-carte)",
            }}
          >
            <div style={{ flex: "1 1 260px", minWidth: 0 }}>
              <label className="rf-etiquette" htmlFor="f-q" style={{ display: "block", marginBottom: 6 }}>
                Recherche
              </label>
              <input
                id="f-q"
                className="rf-input"
                name="q"
                defaultValue={saisie}
                placeholder="Nom, raison sociale ou SIREN"
                style={{ padding: "10px 12px", fontSize: 14, minHeight: 42 }}
              />
            </div>
            <div style={{ flex: "0 1 220px" }}>
              <label className="rf-etiquette" htmlFor="f-secteur" style={{ display: "block", marginBottom: 6 }}>
                Secteur
              </label>
              <select
                id="f-secteur"
                className="rf-select"
                name="secteur"
                defaultValue={secteur}
                style={{ padding: "10px 12px", fontSize: 14, minHeight: 42 }}
              >
                <option value="">Tous les secteurs</option>
                {SECTEURS.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.libelle}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ flex: "0 1 190px" }}>
              <label className="rf-etiquette" htmlFor="f-dep" style={{ display: "block", marginBottom: 6 }}>
                Département
              </label>
              <select
                id="f-dep"
                className="rf-select"
                name="departement"
                defaultValue={departement}
                style={{ padding: "10px 12px", fontSize: 14, minHeight: 42 }}
              >
                <option value="">Toute la France</option>
                {DEPARTEMENTS.map((d) => (
                  <option key={d.code} value={d.code}>
                    {d.code} — {d.nom}
                  </option>
                ))}
              </select>
            </div>
            {tri !== "pertinence" ? <input type="hidden" name="tri" value={tri} /> : null}
            {verifiesSeulement ? <input type="hidden" name="verifies" value="1" /> : null}
            <button type="submit" className="rf-btn rf-btn--primaire" style={{ flex: "none" }}>
              Filtrer
            </button>
            <Link
              href={lienBascule()}
              className={`rf-btn ${verifiesSeulement ? "rf-btn--primaire" : "rf-btn--neutre"}`}
              style={{ flex: "none", fontSize: 13.5 }}
              aria-pressed={verifiesSeulement}
            >
              {verifiesSeulement ? "✓ Litiges vérifiés seulement" : "Litiges vérifiés seulement"}
            </Link>
          </form>

          {/* ── Barre de tri ────────────────────────────────────────────── */}
          <div
            style={{
              display: "flex",
              gap: 16,
              padding: "12px 20px",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              background: "var(--rf-fond-leger)",
            }}
          >
            <div style={{ fontSize: 13.5 }}>
              <strong>
                {/* 1 001 est la sentinelle du décompte plafonné : afficher ce
                    chiffre-là serait faux, il signifie « plus de 1 000 ». */}
                {requete && total > 1000 ? "Plus de 1 000" : formatNombre(total)} fiche
                {total > 1 ? "s" : ""}
              </strong>{" "}
              {requete
                ? total > 1
                  ? "correspondent à cette recherche"
                  : "correspond à cette recherche"
                : "dans l’annuaire"}
              {total > resultats.length ? (
                <span className="rf-legende">
                  {" "}
                  · {formatNombre(resultats.length)} affichée{resultats.length > 1 ? "s" : ""} ici
                </span>
              ) : null}
              {/* L'API plafonne à 10 000 : au-delà, le nombre exact est inconnu
                  et l'annoncer serait faux. */}
              {requete && totalRegistres > 0 ? (
                <span className="rf-legende">
                  {" "}
                  · {totalRegistres >= 10_000 ? "plus de 10 000" : formatNombre(totalRegistres)} dans les
                  registres publics
                </span>
              ) : null}
            </div>
            <div className="rf-ligne" style={{ gap: 8 }}>
              <span className="rf-legende">Trier par</span>
              {TRIS.map((t) => (
                <Link
                  key={t.cle}
                  href={lienTri(t.cle)}
                  className={`rf-btn rf-btn--xs ${tri === t.cle ? "rf-btn--primaire" : "rf-btn--neutre"}`}
                  aria-current={tri === t.cle ? "true" : undefined}
                >
                  {t.libelle}
                </Link>
              ))}
            </div>
          </div>

          {/* ── Résultats ───────────────────────────────────────────────── */}
          {erreurSource ? (
            <div style={{ padding: "20px 22px" }}>
              <div className="rf-encart rf-encart--alerte">
                Le registre public n’a pas répondu à cette recherche. Les fiches déjà constituées restent
                consultables ; réessayez dans quelques instants.
              </div>
            </div>
          ) : null}

          {saisieTropCourte ? (
            <div className="rf-carte rf-mt-16" style={{ padding: 22 }}>
              <p style={{ fontSize: 17, fontWeight: 700 }}>Saisissez au moins trois caractères</p>
              <p className="rf-texte rf-mt-10">
                En deçà, la recherche remonterait des millions de fiches sans vous apprendre quoi que
                ce soit. Vous pouvez aussi parcourir l’annuaire{" "}
                <Link href="/annuaire">par secteur et par ville</Link>.
              </p>
            </div>
          ) : resultats.length === 0 ? (
            <div style={{ padding: "36px 22px", textAlign: "center" }}>
              <p style={{ fontSize: 17, fontWeight: 700 }}>Aucune entreprise ne correspond à cette recherche</p>
              <p className="rf-texte rf-mt-8" style={{ maxWidth: 560, margin: "8px auto 0" }}>
                Vérifiez l’orthographe, essayez la raison sociale exacte ou le numéro SIREN à neuf chiffres.
                Vous pouvez aussi signaler votre litige en saisissant l’entreprise vous-même.
              </p>
              <p className="rf-mt-18">
                <Link href="/signaler" className="rf-btn rf-btn--primaire">
                  Signaler quand même
                </Link>
              </p>
            </div>
          ) : (
            resultats.map((r) => (
              <article key={r.siren} className="rf-resultat">
                <div className="rf-resultat__principal">
                  <div className="rf-ligne" style={{ gap: 10 }}>
                    <Link href={`/entreprises/${r.slug}`} className="rf-resultat__nom">
                      {r.denomination}
                    </Link>
                    <span className={`rf-badge rf-badge--sm ${r.active ? "rf-badge--succes" : "rf-badge--erreur"}`}>
                      {r.active ? "Active" : "Radiée"}
                    </span>
                    {!r.connue ? (
                      <span className="rf-badge rf-badge--sm rf-badge--non-verifie">Fiche à constituer</span>
                    ) : null}
                  </div>
                  <p className="rf-mt-6" style={{ fontSize: 13.5, color: "var(--rf-texte-2)" }}>
                    {r.meta}
                  </p>
                  <div className="rf-etiquettes">
                    <span className="rf-etiquette-bordee">SIREN {formatSiren(r.siren)}</span>
                    {r.naf ? <span className="rf-etiquette-bordee">{r.naf}</span> : null}
                    {r.anciennete ? <span className="rf-etiquette-bordee">{r.anciennete}</span> : null}
                  </div>
                </div>

                <div className="rf-resultat__chiffres">
                  <div className="rf-tuile rf-tuile--compacte">
                    <div className="rf-etiquette" style={{ fontSize: 11 }}>
                      Indice
                    </div>
                    <div
                      className="rf-nombres"
                      style={{ fontSize: 19, fontWeight: 700, marginTop: 4, color: couleurScore(r.indice) }}
                    >
                      {r.indice ?? "—"}
                      <span style={{ fontSize: 11.5, color: "var(--rf-texte-3)", fontWeight: 400 }}>/100</span>
                    </div>
                  </div>
                  <div className="rf-tuile rf-tuile--compacte">
                    <div className="rf-etiquette" style={{ fontSize: 11 }}>
                      Litiges
                    </div>
                    <div className="rf-nombres" style={{ fontSize: 19, fontWeight: 700, marginTop: 4 }}>
                      {r.signalements}
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--rf-cobalt)", fontWeight: 600 }}>
                      {r.verifies} vérifié{r.verifies > 1 ? "s" : ""}
                    </div>
                  </div>
                  <div className="rf-tuile rf-tuile--compacte">
                    <div className="rf-etiquette" style={{ fontSize: 11 }}>
                      Réponse
                    </div>
                    <div
                      className="rf-nombres"
                      style={{
                        fontSize: 19,
                        fontWeight: 700,
                        marginTop: 4,
                        color:
                          r.tauxReponse === null
                            ? "var(--rf-texte-desactive)"
                            : r.tauxReponse >= 75
                              ? "var(--rf-succes)"
                              : r.tauxReponse >= 55
                                ? "var(--rf-alerte)"
                                : "var(--rf-erreur)",
                      }}
                    >
                      {r.tauxReponse === null ? "—" : formatPourcent(r.tauxReponse)}
                    </div>
                  </div>
                </div>

                <div className="rf-resultat__actions">
                  <Link href={`/entreprises/${r.slug}`} className="rf-btn rf-btn--secondaire rf-btn--sm">
                    Voir la fiche
                  </Link>
                  <Link href={`/signaler/${r.slug}`} className="rf-btn rf-btn--primaire rf-btn--sm">
                    Signaler un litige
                  </Link>
                </div>
              </article>
            ))
          )}

          <div
            style={{
              padding: "18px 22px",
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <span className="rf-legende">
              Source : Sirene · RNE/INPI · BODACC · signalements Recours France — consulté le{" "}
              {formatDate(new Date())}
            </span>
            <div className="rf-ligne" style={{ gap: 14 }}>
              {page > 1 ? (
                <Link href={lienPage(page - 1)} style={{ fontSize: 13.5, fontWeight: 600 }}>
                  Page précédente
                </Link>
              ) : null}
              {page < pagesApi ? (
                <Link href={lienPage(page + 1)} style={{ fontSize: 13.5, fontWeight: 600 }}>
                  Page suivante
                </Link>
              ) : null}
            </div>
          </div>
        </div>

        <div
          className="rf-carte rf-carte--teintee rf-mt-20"
          style={{
            padding: "22px 24px",
            display: "flex",
            justifyContent: "space-between",
            gap: 24,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div className="rf-flex1">
            <div style={{ fontSize: 17, fontWeight: 700 }}>Vous ne trouvez pas l’entreprise&nbsp;?</div>
            <p className="rf-texte rf-mt-6" style={{ fontSize: 14 }}>
              Signalez votre litige avec le nom commercial et le site internet du professionnel. La fiche est
              créée après rapprochement avec les registres publics, sous 48 heures ouvrées.
            </p>
          </div>
          <Link href="/signaler?mode=libre" className="rf-btn rf-btn--primaire rf-btn--md rf-flexnone">
            Signaler quand même
          </Link>
        </div>
      </div>
    </Page>
  );
}

/**
 * Fusionne les fiches déjà constituées et les résultats du registre public.
 * Une entreprise absente de la base apparaît quand même : sa fiche est créée
 * à la première consultation.
 */
async function collecter({
  requete,
  secteur,
  departement,
  page,
}: {
  requete: string;
  secteur: string;
  departement: string;
  page: number;
}): Promise<{ lignes: Ligne[]; total: number; totalRegistres: number; erreurSource: boolean; pagesApi: number }> {
  const parSiren = new Map<string, Ligne>();
  let total = 0;
  let totalRegistres = 0;
  let erreurSource = false;
  let pagesApi = 1;

  // 1. Fiches locales (les seules à porter des statistiques de signalement).
  const locales = await prisma.entreprise.findMany({
    where: {
      AND: [
        requete
          ? { OR: clausesRecherche(requete) }
          : {},
        secteur ? { secteur } : {},
        departement ? { departement } : {},
      ],
    },
    // Trié sur un ordre qu'un index couvre.
    //
    // Le tri précédent — indiceTransparence décroissant — lisait 934 196 blocs,
    // soit 7,3 Go, pour rendre vingt-cinq lignes : dix-neuf secondes. La
    // colonne est renseignée sur dix lignes sur treize millions, et un tri
    // décroissant place les valeurs nulles en tête ; la base parcourait donc
    // tout pour produire une liste en réalité alphabétique. Autant l'assumer et
    // la faire servir par l'index.
    // …sauf quand on cherche — et c'est le point décisif. Avec
    // « ORDER BY denomination LIMIT 25 », le planificateur préfère remonter
    // l'index alphabétique entier en testant chaque ligne au filtre, plutôt que
    // d'interroger les index trigrammes puis trier. Mesuré en production sur
    // « boulangerie » : 106 033 lignes écartées une à une, 41 secondes, index
    // trigrammes présents et valides. Sans tri, il bascule sur les trigrammes
    // et s'arrête aux vingt-cinq premières correspondances. Les vingt-cinq
    // lignes sont ensuite triées en mémoire : l'affichage ne change pas, seul
    // le chemin d'accès change.
    ...(requete ? {} : { orderBy: [{ denomination: "asc" as const }] }),
    take: 25,
  });
  if (requete) locales.sort((a, b) => a.denomination.localeCompare(b.denomination, "fr"));

  // Nombre de fiches correspondant au filtre, indépendant de la page affichée :
  // sans lui, l'annuaire ne dit jamais ce qu'il contient.
  //
  // Sans filtre, ce comptage porte sur treize millions de lignes et n'apprend
  // rien de plus que le pied de page. On prend alors l'estimation entretenue
  // par le catalogue : une lecture, au lieu de plusieurs secondes.
  const sansFiltre = !requete && !secteur && !departement;
  const totalLocal = sansFiltre
    ? await prisma.$queryRaw<{ n: bigint | null }[]>`
        SELECT reltuples::bigint AS n FROM pg_class WHERE relname = 'Entreprise'
      `.then((r) => Number(r[0]?.n ?? 0))
    : requete
      ? // Plafonné au millier : compter exactement les 12 892 « boulangerie »
        // relit autant de pages éparses que la recherche elle-même, pour un
        // chiffre dont personne n'a l'usage exact. Au-delà, « plus de 1 000 ».
        await prisma.entreprise
          .findMany({
            where: {
              AND: [
                { OR: clausesRecherche(requete) },
                secteur ? { secteur } : {},
                departement ? { departement } : {},
              ],
            },
            select: { id: true },
            take: 1001,
          })
          .then((r) => r.length)
      : await prisma.entreprise.count({
          where: {
            AND: [secteur ? { secteur } : {}, departement ? { departement } : {}],
          },
        });

  const compteurs = await compteursAnnuaire(locales.map((e) => e.id));

  for (const e of locales) {
    const c = compteurs.get(e.id) ?? { total: 0, verifies: 0, tauxReponse: null };
    parSiren.set(e.siren, {
      slug: e.slug,
      siren: e.siren,
      denomination: e.denomination,
      meta: [e.formeJuridique, e.nafLibelle, e.commune ? `${e.commune} (${e.departement ?? ""})` : null]
        .filter(Boolean)
        .join(" · "),
      naf: e.naf,
      anciennete: libelleAnciennete(e.dateImmatriculation),
      active: e.etatAdministratif === "ACTIVE",
      indice: e.indiceTransparence,
      signalements: c.total,
      verifies: c.verifies,
      tauxReponse: c.tauxReponse,
      connue: true,
    });
  }
  total = totalLocal;

  // 2. Registre public, lorsqu'une requête est saisie.
  if (requete.length >= 2) {
    try {
      const sections = secteur ? sectionsPourSecteur(secteur) : [];
      const api = await rechercherEntreprises(requete, {
        page,
        parPage: 10,
        departement: departement || undefined,
        sectionActivite: sections[0],
      });
      totalRegistres = api.total;
      pagesApi = Math.min(api.pages, 50);

      for (const r of api.resultats) {
        if (parSiren.has(r.siren)) continue;
        const champs = versEntreprise(r);
        if (secteur && champs.secteur !== secteur) continue;
        parSiren.set(r.siren, {
          slug: slugEntreprise(champs.denomination, r.siren),
          siren: r.siren,
          denomination: champs.denomination,
          meta: [
            champs.formeJuridique,
            champs.nafLibelle,
            champs.commune ? `${champs.commune} (${champs.departement ?? ""})` : null,
          ]
            .filter(Boolean)
            .join(" · "),
          naf: champs.naf,
          anciennete: libelleAnciennete(champs.dateImmatriculation),
          active: champs.etatAdministratif === "ACTIVE",
          indice: null,
          signalements: 0,
          verifies: 0,
          tauxReponse: null,
          connue: false,
        });
      }
    } catch {
      erreurSource = true;
    }
  }

  return { lignes: [...parSiren.values()], total, totalRegistres, erreurSource, pagesApi };
}
