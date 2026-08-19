import type { ReactElement } from "react";

/**
 * Balisage JSON-LD.
 *
 * Sans lui, un moteur doit deviner que la page décrit une entreprise précise.
 * Le balisage relie explicitement la fiche à l'entité — son identifiant légal,
 * son site officiel, son adresse — ce qui aide à associer la page aux requêtes
 * portant sur cette entreprise.
 *
 * On ne déclare que ce qu'on sait réellement : aucune note agrégée, aucun avis,
 * aucun élément que la plateforme ne publie pas. Un balisage qui promet plus
 * que la page n'affiche est une cause de déclassement, pas un gain.
 */
export function DonneesStructurees({ donnees }: { donnees: Record<string, unknown> }): ReactElement {
  return (
    <script
      type="application/ld+json"
      // Le contenu est construit par le serveur à partir de la base : aucune
      // saisie utilisateur n'y transite.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(donnees) }}
    />
  );
}

/** Fiche d'une personne morale identifiée dans les registres publics. */
export function organisationJsonLd(params: {
  nom: string;
  siren: string;
  url: string;
  siteWeb?: string | null;
  adresse?: string | null;
  codePostal?: string | null;
  commune?: string | null;
  telephone?: string | null;
  email?: string | null;
}): Record<string, unknown> {
  const donnees: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: params.nom,
    identifier: [
      { "@type": "PropertyValue", propertyID: "SIREN", value: params.siren },
    ],
    // URL absolue : une adresse relative n'est pas exploitable dans du JSON-LD.
    mainEntityOfPage: params.url.startsWith("http")
      ? params.url
      : `${process.env.APP_URL ?? "http://localhost:3200"}${params.url}`,
  };
  if (params.siteWeb) donnees.url = params.siteWeb;
  if (params.adresse || params.commune) {
    donnees.address = {
      "@type": "PostalAddress",
      addressCountry: "FR",
      ...(params.adresse ? { streetAddress: params.adresse } : {}),
      ...(params.codePostal ? { postalCode: params.codePostal } : {}),
      ...(params.commune ? { addressLocality: params.commune } : {}),
    };
  }
  // Le service consommateurs, quand il est connu : c'est précisément ce que
  // cherche quelqu'un en litige.
  if (params.telephone || params.email) {
    donnees.contactPoint = {
      "@type": "ContactPoint",
      contactType: "customer service",
      ...(params.telephone ? { telephone: params.telephone } : {}),
      ...(params.email ? { email: params.email } : {}),
      areaServed: "FR",
      availableLanguage: "French",
    };
  }
  return donnees;
}
