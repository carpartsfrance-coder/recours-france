/**
 * L'adresse publique du service, en un seul endroit.
 *
 * Elle gouverne les canoniques, le robots.txt, les sept mille tranches du plan
 * de site, les données structurées et les liens de suivi des courriels. Elle
 * était recopiée à six endroits, chacun avec son propre repli sur
 * `http://localhost:3200` — et un repli silencieux est ici la pire des
 * défaillances : le site continue de fonctionner, mais annonce à Google treize
 * millions d'URL sur une adresse locale, et envoie aux consommateurs des liens
 * de suivi qui ne mènent nulle part.
 *
 * D'où l'échec bruyant en production : mieux vaut un déploiement qui refuse de
 * démarrer qu'un mois de plan de site pointant sur localhost.
 */

function resoudre(): string {
  const brut = (process.env.APP_URL ?? "").trim().replace(/\/+$/, "");

  if (!brut) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "APP_URL est absente. Elle construit les canoniques, le plan de site et " +
          "les liens des courriels : sans elle, le service publierait des adresses fausses.",
      );
    }
    return "http://localhost:3200";
  }

  // `next build` s'exécute avec NODE_ENV=production, y compris sur un poste de
  // travail où APP_URL pointe légitimement sur localhost. Refuser cette
  // adresse-là cassait la compilation locale sans rien protéger : ce que le
  // contrôle traque, c'est une adresse publique servie en clair.
  const local = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/.test(brut);
  if (process.env.NODE_ENV === "production" && !brut.startsWith("https://") && !local) {
    throw new Error(`APP_URL doit commencer par https:// en production, reçu « ${brut} ».`);
  }

  return brut;
}

/** Sans barre oblique finale : tous les chemins la portent déjà. */
export const ADRESSE = resoudre();

/** Une URL absolue à partir d'un chemin interne. */
export function absolu(chemin: string): string {
  return `${ADRESSE}${chemin.startsWith("/") ? chemin : `/${chemin}`}`;
}
