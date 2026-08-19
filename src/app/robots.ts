import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.APP_URL ?? "http://localhost:3200";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Espaces privés : suivi de signalement, administration, pièces justificatives.
        disallow: ["/admin", "/mon-espace", "/signaler/confirmation", "/api/justificatifs"],
      },
    ],
    // L'index, et non /sitemap.xml : le plan est découpé en milliers de
    // tranches, et Next réserve cette dernière adresse à sa convention.
    sitemap: `${base}/sitemap-index.xml`,
  };
}
