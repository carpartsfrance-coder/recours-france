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
export const revalidate = 86400;

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
