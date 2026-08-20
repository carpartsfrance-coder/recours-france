import { base, nombreDeTranches } from "@/lib/plan-de-site";

/**
 * Index du plan de site.
 *
 * `generateSitemaps` publie les tranches sous /sitemap/N.xml mais n'écrit
 * aucun fichier qui les recense : un moteur ne peut donc en découvrir aucune.
 *
 * L'index ne peut pas s'appeler /sitemap.xml — Next réserve cette adresse à sa
 * convention de métadonnées et refuse de démarrer si une route la réclame. Le
 * robots.txt désigne donc celle-ci.
 */
/**
 * Produit à l'exécution.
 *
 * Avec `revalidate`, Next pré-rendait cet index pendant la compilation, ce qui
 * revenait à réclamer le relevé complet des préfixes de SIREN — treize
 * millions de lignes — à chaque déploiement, et à faire échouer le build là où
 * DATABASE_URL n'existe qu'à l'exécution.
 *
 * Le relevé est de toute façon gardé en mémoire une journée par
 * `plan-de-site.ts`, et un index de plan de site n'est demandé que quelques
 * fois par jour, par des robots.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const b = base();
  const total = await nombreDeTranches();
  const lignes = Array.from(
    { length: total },
    (_, i) => `  <sitemap><loc>${b}/sitemap/${i}.xml</loc></sitemap>`,
  ).join("\n");

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${lignes}\n</sitemapindex>\n`,
    { headers: { "Content-Type": "application/xml" } },
  );
}
