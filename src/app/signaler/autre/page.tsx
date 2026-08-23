import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BandeauIndependance, Page, PiedDePage } from "@/components/chrome";
import { Tunnel } from "@/components/refonte/tunnel";
import { DEPUIS_MOTIF, famillesPour } from "@/lib/tunnel-refonte";
import { ecrireBrouillon, lireBrouillon } from "@/lib/brouillon";
import { normaliserDomaine } from "@/lib/boutiques";
import { CIBLE_LIBRE } from "@/lib/tunnel";

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
 * Entrée du tunnel pour une entreprise ou une boutique non répertoriée.
 *
 * Ce segment est statique : Next le fait passer avant le segment dynamique
 * `[slug]`, et aucun slug d'entreprise ne peut valoir « autre » puisqu'ils se
 * terminent tous par les neuf chiffres du SIREN.
 *
 * Ces signalements sont souvent les plus utiles : une boutique en ligne dont
 * aucune personne morale n'est établie, une société étrangère, une enseigne
 * qu'aucun registre français ne connaît. Les refuser renverrait chez elle la
 * personne dont la difficulté est justement de ne pas savoir à qui elle a
 * affaire.
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

  /**
   * La cible est déjà désignée : on passe au tunnel.
   *
   * Ce segment statique masque le segment dynamique `[slug]` pour la valeur
   * « autre », qui est justement celle de la cible libre : `/signaler/autre`
   * ne pouvait donc jamais afficher le tunnel, et le formulaire renvoyait vers
   * une étape inexistante. Le parcours libre — celui de toute boutique dont
   * l'exploitant n'est pas établi — s'arrêtait sur une page introuvable.
   *
   * Le formulaire reste accessible pour corriger la cible : `?cible=1`.
   */
  if (brouillon.libreNom && query.cible !== "1") {
    const motif = typeof query.motif === "string" ? query.motif : null;
    return (
      <>
        <BandeauIndependance />
        <main id="contenu">
          <Tunnel
            slug={CIBLE_LIBRE}
            nom={brouillon.libreNom}
            lieu={null}
            siren={null}
            familles={famillesPour(null, null)}
            preselection={motif ? (DEPUIS_MOTIF[motif] ?? null) : null}
          />
        </main>
        <PiedDePage />
      </>
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
    <Page
      entete={{ baseline: "Observatoire des problèmes consommateurs", sansCta: true }}
      piedComplet={false}
    >
      <div className="rfx rfx--doux">
        <div className="rfx-tunnel" style={{ padding: "36px 20px 56px" }}>
          <h1 className="rfx-h2">Quelle entreprise ou boutique ?</h1>
          <p className="rfx-texte" style={{ marginTop: 10 }}>
            Elle n’est pas répertoriée chez nous — c’est fréquent pour une boutique en ligne, une
            société étrangère, ou une enseigne récente. Indiquez ce que vous connaissez : le nom, ou
            l’adresse du site sur lequel vous avez acheté.
          </p>

          {erreur ? (
            <div className="rfx-erreur" style={{ marginTop: 18 }} role="alert">
              Indiquez au moins un nom ou une adresse de site pour continuer.
            </div>
          ) : null}

          <form action={continuer} style={{ marginTop: 24 }}>
            <label className="rfx-champ">
              <span className="rfx-champ__label">Nom de l’entreprise ou de l’enseigne</span>
              <span className="rfx-champ__aide">Tel que vous le connaissez</span>
              <input
                type="text"
                name="nom"
                className="rfx-input"
                defaultValue={brouillon.libreNom ?? recherche}
                placeholder="ex. Bergamotte"
                autoComplete="organization"
              />
            </label>

            <label className="rfx-champ">
              <span className="rfx-champ__label">Adresse du site</span>
              <span className="rfx-champ__aide">
                Facultatif, mais c’est souvent le plus sûr : c’est le site que vous avez utilisé.
              </span>
              <input
                type="text"
                name="site"
                className="rfx-input"
                defaultValue={brouillon.libreSite ?? ""}
                placeholder="ex. bergamotte.com"
                autoComplete="url"
              />
            </label>

            <div className="rfx-bloc rfx-bloc--alt" style={{ padding: "12px 14px" }}>
              <p className="rfx-petit" style={{ margin: 0 }}>
                Votre signalement sera enregistré et vous recevrez vos démarches. Il ne sera pas
                publié tant que l’entreprise n’aura pas été identifiée : nous ne créons pas de fiche
                publique sur la seule foi d’un nom, au risque de l’attribuer à un homonyme.
              </p>
            </div>

            <button type="submit" className="rfx-btn rfx-btn--large" style={{ marginTop: 20 }}>
              Continuer
            </button>
          </form>

          <p className="rfx-mention" style={{ marginTop: 24 }}>
            <Link href="/signaler">← Chercher une entreprise répertoriée</Link>
          </p>
        </div>
      </div>
    </Page>
  );
}
