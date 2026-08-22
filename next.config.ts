import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ["@prisma/client", "nodemailer"],
  experimental: {
    serverActions: {
      // Les justificatifs sont limités à 10 Mo par pièce, 5 pièces par signalement.
      bodySizeLimit: "56mb",
    },
  },
  /**
   * L'ancienne adresse d'hébergement renvoie définitivement vers le domaine.
   *
   * Sans cela, recours-france.onrender.com et recours-france.fr servent le même
   * site en répondant 200 tous les deux. Google traite alors deux adresses
   * distinctes portant le même contenu, et répartit entre elles le crédit
   * qu'une seule devrait recevoir. Un canonique ne suffit pas : c'est une
   * indication, quand une 301 est une instruction.
   *
   * Le préfixe /api en est exempté à dessein. La sonde de santé de
   * l'hébergeur interroge le service sur son propre nom, et une redirection
   * lui ferait conclure à une panne — le service serait redémarré en boucle
   * alors qu'il répond parfaitement.
   *
   * Le nom d'hôte est écrit ici plutôt que lu dans APP_URL : c'est l'adresse
   * qu'on quitte, pas celle qu'on rejoint, et elle ne changera plus.
   */
  async redirects() {
    return [
      {
        source: "/:chemin((?!api/).*)",
        has: [{ type: "host", value: "recours-france.onrender.com" }],
        destination: "https://recours-france.fr/:chemin",
        // 301 plutôt que le 308 de `permanent: true`. Google traite les deux
        // à l'identique, mais 301 est le signal que toute la chaîne d'outils
        // reconnaît sans hésiter — et une redirection de domaine se relit
        // pendant des années, souvent par quelqu'un d'autre.
        statusCode: 301,
      },
    ];
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
      {
        // Les pièces justificatives ne sont jamais publiées ni indexées.
        source: "/api/justificatifs/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
      },
    ];
  },
};

export default nextConfig;
