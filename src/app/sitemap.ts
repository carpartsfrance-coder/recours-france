import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.APP_URL ?? "http://localhost:3200";

  const statiques = [
    "",
    "/entreprises",
    "/signaler",
    "/methodologie",
    "/aide",
    "/aide/justificatifs",
    "/aide/droits",
    "/demarches-officielles",
    "/a-propos",
    "/contact",
    "/mentions-legales",
    "/conditions-generales",
    "/donnees-personnelles",
    "/accessibilite",
    "/cookies",
    "/charte-de-moderation",
  ].map((chemin) => ({
    url: `${base}${chemin}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: chemin === "" ? 1 : 0.7,
  }));

  const entreprises = await prisma.entreprise.findMany({
    select: { slug: true, majLe: true },
    orderBy: { majLe: "desc" },
    take: 5000,
  });

  return [
    ...statiques,
    ...entreprises.map((e) => ({
      url: `${base}/entreprises/${e.slug}`,
      lastModified: e.majLe,
      changeFrequency: "daily" as const,
      priority: 0.6,
    })),
  ];
}
