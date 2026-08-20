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

/**
 * Questions fréquentes, en `FAQPage`.
 *
 * Le balisage ne porte que sur des questions réellement affichées et dépliées :
 * décrire à un moteur un contenu que le visiteur ne verrait pas est trompeur,
 * et c'est exactement ce que sanctionnent les consignes sur les données
 * structurées.
 *
 * Ni `Review` ni `AggregateRating` sur cette page : les signalements ne sont
 * pas des avis notés, et les baliser comme tels donnerait des étoiles dans les
 * résultats de recherche pour un contenu qui n'en comporte pas.
 */
export function faqJsonLd(questions: { q: string; a: string }[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: questions.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

/** Fil d'Ariane, en `BreadcrumbList`. */
export function filAlianeJsonLd(items: { libelle: string; href?: string }[]): Record<string, unknown> {
  const base = process.env.APP_URL ?? "http://localhost:3200";
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.libelle,
      ...(it.href ? { item: `${base}${it.href}` } : {}),
    })),
  };
}
