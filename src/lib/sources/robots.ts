/**
 * Respect de robots.txt.
 *
 * Sonder des domaines candidats revient à visiter des sites tiers qui n'ont
 * rien demandé. L'agent utilisateur les identifie déjà honnêtement ; encore
 * faut-il honorer ce qu'ils refusent. Sans cela, une détection à l'échelle du
 * catalogue serait une campagne d'exploration non sollicitée.
 *
 * Implémentation volontairement minimale : on ne lit que les directives
 * applicables à notre agent ou à « * », et le moindre doute vaut refus.
 */
import { appel } from "./http";

const CACHE = new Map<string, { interdits: string[]; expire: number }>();
const DUREE_CACHE = 6 * 60 * 60 * 1000;

async function reglesDuDomaine(origine: string): Promise<string[]> {
  const enCache = CACHE.get(origine);
  if (enCache && enCache.expire > Date.now()) return enCache.interdits;

  const interdits: string[] = [];
  try {
    const reponse = await appel(`${origine}/robots.txt`, {
      timeoutMs: 5_000,
      tentatives: 0,
      headers: { Accept: "text/plain" },
    });
    if (reponse.ok) {
      const texte = (await reponse.text()).slice(0, 100_000);
      let concerne = false;
      for (const ligne of texte.split("\n")) {
        const propre = ligne.split("#")[0].trim();
        const [cle, ...reste] = propre.split(":");
        const valeur = reste.join(":").trim();
        if (!cle) continue;
        const nom = cle.trim().toLowerCase();
        if (nom === "user-agent") {
          const agent = valeur.toLowerCase();
          concerne = agent === "*" || agent.includes("recoursfrance");
        } else if (nom === "disallow" && concerne && valeur) {
          interdits.push(valeur);
        }
      }
    }
  } catch {
    // robots.txt inaccessible : on n'en déduit aucune interdiction, mais on ne
    // met pas non plus le résultat en cache trop longtemps.
  }

  CACHE.set(origine, { interdits, expire: Date.now() + DUREE_CACHE });
  return interdits;
}

/** L'exploration de cette URL est-elle autorisée ? */
export async function explorationAutorisee(url: string): Promise<boolean> {
  let cible: URL;
  try {
    cible = new URL(url);
  } catch {
    return false;
  }
  const interdits = await reglesDuDomaine(cible.origin);
  // « Disallow: / » ferme tout le site.
  return !interdits.some((chemin) => chemin === "/" || cible.pathname.startsWith(chemin));
}
