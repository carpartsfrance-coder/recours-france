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
    sitemap: `${base}/sitemap.xml`,
  };
}
