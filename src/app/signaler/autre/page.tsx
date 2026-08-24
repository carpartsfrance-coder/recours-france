import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Tunnel } from "@/components/refonte/tunnel";
import { DEPUIS_MOTIF, famillesPour } from "@/lib/tunnel-refonte";
import { ecrireBrouillon, lireBrouillon } from "@/lib/brouillon";
import { normaliserDomaine } from "@/lib/boutiques";
import { CIBLE_LIBRE } from "@/lib/tunnel";
import { resoudreCible } from "@/lib/cible";
import { typo } from "@/lib/typographie";
import { Bouclier, FlecheGauche } from "@/components/refonte/icones";

export const dynamic = "force-dynamic";

/** Le titre suit ce que la page affiche : la désignation de la cible, ou le tunnel. */
export async function generateMetadata(): Promise<Metadata> {
  const brouillon = await lireBrouillon();
  return {
    title: brouillon.libreNom
      ? `Signaler un problème avec ${brouillon.libreNom}`
      : "Quelle entreprise ou boutique ?",
    robots: { index: false, follow: false },
  };
}

/**
 * Écran 1 du parcours — désigner l'entreprise ou la boutique.
 *
 * Il ne s'affiche que lorsque la cible n'est pas connue : arrivé d'une fiche,
 * on entre directement sur la situation. Ces signalements-là sont souvent les
 * plus utiles — une boutique en ligne dont aucune personne morale n'est
 * établie, une société étrangère, une enseigne qu'aucun registre français ne
 * connaît. Les refuser renverrait chez elle la personne dont la difficulté est
 * précisément de ne pas savoir à qui elle a affaire.
 *
 * Ce segment est statique : Next le fait passer avant le segment dynamique
 * `[slug]`, et il masque donc la valeur réservée à la cible libre. C'est
 * pourquoi la même page sert les deux rôles — le formulaire quand rien n'est
 * désigné, le parcours dès qu'une cible l'est.
 */
export default async function CibleLibre({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const brouillon = await lireBrouillon();
  const erreur = query.erreur === "1";
  const recherche = typeof query.q === "string" ? query.q : "";

  /** La cible est désignée : on passe à la situation. `?cible=1` revient ici. */
  const cible = brouillon.libreNom && query.cible !== "1" ? await resoudreCible(CIBLE_LIBRE) : null;
  if (cible) {
    const motif = typeof query.motif === "string" ? query.motif : null;
    return (
      <Tunnel
        slug={CIBLE_LIBRE}
        nom={cible.nom}
        lieu={null}
        siren={null}
        familles={famillesPour(null, null)}
        preselection={motif ? (DEPUIS_MOTIF[motif] ?? null) : null}
        fiche={cible.fiche}
        societe={cible.societe}
        via={null}
      />
    );
  }

  async function continuer(donnees: FormData) {
    "use server";
    const nom = String(donnees.get("nom") ?? "").trim();
    const site = String(donnees.get("site") ?? "").trim();
    if (nom.length < 2 && !site) redirect("/signaler/autre?erreur=1");

    const domaine = site ? normaliserDomaine(site) : null;
    await ecrireBrouillon({
      // À défaut de raison sociale, le domaine fait le nom : c'est ainsi que la
      // personne désigne le commerçant — « bergamotte.com », pas une société
      // qu'elle n'a jamais vue.
      libreNom: nom || domaine || "",
      libreSite: domaine ?? undefined,
    });
    redirect("/signaler/autre");
  }

  return (
    <div className="rfp">
      <header className="rfp-entete">
        <div className="rfp-conteneur rfp-conteneur--1000 rfp-entete__piste">
          <Link href="/" className="rfp-logo" aria-label="Recours France — accueil">
            <span className="rfp-logo__mot">
              Recours
              <em>France</em>
            </span>
            <span className="rfp-logo__barres" aria-hidden="true">
              <i style={{ width: 32, background: "var(--p-bleu)" }} />
              <i style={{ width: 24, background: "#E1000F" }} />
            </span>
          </Link>
          <Link href="/" className="rfp-quitter">
            Quitter
          </Link>
        </div>
      </header>

      <main id="contenu">
        <div className="rfp-conteneur rfp-conteneur--900" style={{ paddingTop: 30 }}>
          <ol className="rfp-etapes">
            <li className="rfp-etape rfp-etape--actif" aria-current="step" style={{ width: 118 }}>
              <span className="rfp-etape__rond">1</span>
              <span className="rfp-etape__nom">Entreprise</span>
            </li>
            <li className="rfp-etapes__trait rfp-etapes__trait--fait" aria-hidden="true" />
            <li className="rfp-etape" style={{ width: 130 }}>
              <span className="rfp-etape__rond">2</span>
              <span className="rfp-etape__nom">Votre situation</span>
            </li>
            <li className="rfp-etapes__trait" aria-hidden="true" />
            <li className="rfp-etape" style={{ width: 150 }}>
              <span className="rfp-etape__rond">3</span>
              <span className="rfp-etape__nom">{typo("Vérifier et publier")}</span>
            </li>
          </ol>

          <h1 className="rfp-h1" style={{ marginTop: 28 }}>
            {typo("Quelle entreprise ou boutique ?")}
          </h1>
          <p className="rfp-sous" style={{ marginTop: 10, marginInline: "auto", maxWidth: "56ch" }}>
            {typo("Indiquez le nom que vous connaissez ou l’adresse du site sur lequel vous avez acheté.")}
          </p>

          <form action={continuer}>
            <div className="rfp-carte rfp-carte--12" style={{ marginTop: 26, maxWidth: 780, marginInline: "auto" }}>
              {erreur ? (
                <div className="rfp-blocage" role="alert" style={{ marginTop: 0, marginBottom: 18 }}>
                  {typo("Indiquez au moins un nom ou une adresse de site pour continuer.")}
                </div>
              ) : null}

              <div className="rfp-champ">
                <label className="rfp-champ__label" htmlFor="rfp-nom">
                  {typo("Nom de l’entreprise ou de l’enseigne")}
                </label>
                <span className="rfp-champ__aide">{typo("Tel que vous le connaissez")}</span>
                <input
                  id="rfp-nom"
                  name="nom"
                  type="text"
                  className="rfp-input"
                  placeholder="ex. Garage Martin"
                  autoComplete="organization"
                  defaultValue={brouillon.libreNom ?? (recherche.includes(".") ? "" : recherche)}
                />
              </div>

              <div className="rfp-champ">
                <label className="rfp-champ__label" htmlFor="rfp-site">
                  {typo("Adresse du site")}
                </label>
                <span className="rfp-champ__aide">
                  {typo("Facultatif, mais souvent plus fiable pour identifier la bonne entreprise.")}
                </span>
                <input
                  id="rfp-site"
                  name="site"
                  type="text"
                  className="rfp-input"
                  placeholder="ex. entreprise.fr"
                  autoComplete="url"
                  /* La recherche qui a mené ici est presque toujours un domaine —
                     on arrive de l'annuaire des boutiques, où l'on vient de le
                     taper. Le redemander serait le demander deux fois. */
                  defaultValue={brouillon.libreSite ?? (recherche.includes(".") ? recherche : "")}
                />
              </div>

              <div className="rfp-encart" style={{ marginTop: 24 }}>
                <Bouclier taille={44} style={{ flex: "none", color: "var(--p-bleu)" }} />
                <div>
                  <div className="rfp-encart__titre">{typo("Pourquoi cette vérification ?")}</div>
                  <p style={{ marginTop: 5 }}>
                    {typo(
                      "Nous vérifions l’identité de l’entreprise pour éviter d’attribuer votre litige à un homonyme.",
                    )}
                  </p>
                </div>
              </div>

              <p className="rfp-second" style={{ marginTop: 20, textAlign: "center" }}>
                {typo("Si l’entreprise est identifiée, votre litige pourra être publié immédiatement.")}
                <br />
                {typo("Sinon, votre dossier sera enregistré jusqu’à sa confirmation.")}
              </p>
            </div>

            <div style={{ maxWidth: 520, marginInline: "auto", marginTop: 24 }}>
              <button type="submit" className="rfp-btn">
                Continuer
              </button>
            </div>
          </form>

          <p style={{ textAlign: "center", marginTop: 18 }}>
            <Link href="/signaler" className="rfp-lien-retour">
              <FlecheGauche taille={17} />
              {typo("Chercher une entreprise répertoriée")}
            </Link>
          </p>

          <p className="rfp-aide" style={{ textAlign: "center", marginTop: 6 }}>
            {typo("Gratuit • sans compte • quelques informations suffisent")}
          </p>
        </div>
      </main>

      <footer className="rfp-pied">
        <div className="rfp-conteneur rfp-conteneur--1000 rfp-pied__piste">
          <span>{typo("Recours France • Plateforme privée et indépendante")}</span>
          <nav className="rfp-pied__liens">
            <Link href="/a-propos">{typo("À propos")}</Link>
            <Link href="/methodologie">Fonctionnement</Link>
            <Link href="/charte-de-moderation">{typo("Règles de publication")}</Link>
            <Link href="/donnees-personnelles">{typo("Confidentialité")}</Link>
            <Link href="/contact">Contact</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
