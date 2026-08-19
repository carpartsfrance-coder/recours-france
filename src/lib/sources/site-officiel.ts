/**
 * Enrichissement depuis le site officiel de l'entreprise.
 * Objectif : retrouver l'URL, le téléphone et l'email du service consommateurs,
 * les CGV, la page contact/SAV et la mention de médiation.
 *
 * Garde-fous : une seule page d'accueil + au plus 4 pages légales, taille et
 * durée plafonnées, aucun formulaire soumis, aucun cookie conservé.
 */
import { appel } from "./http";

const PAGES_LEGALES = [
  "mentions-legales",
  "mentions_legales",
  "cgv",
  "conditions-generales-de-vente",
  "conditions-generales",
  "contact",
  "service-client",
  "aide",
  "nous-contacter",
];

const TAILLE_MAX = 900_000; // 900 Ko de HTML par page

export type EnrichissementSite = {
  siteWeb: string | null;
  email: string | null;
  telephone: string | null;
  urlCgv: string | null;
  urlContactSav: string | null;
  urlMentionsLegales: string | null;
  mediationDeclaree: string | null;
  sirenTrouve: string | null;
};

export function enrichissementActif(): boolean {
  return process.env.ENRICHISSEMENT_SITE_ACTIF !== "false";
}

function normaliserUrl(entree: string): string | null {
  const brut = entree.trim();
  if (!brut) return null;
  const avecSchema = /^https?:\/\//i.test(brut) ? brut : `https://${brut}`;
  try {
    const u = new URL(avecSchema);
    if (!/^https?:$/.test(u.protocol)) return null;
    // On ne visite jamais d'adresse interne.
    if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.|\[)/i.test(u.hostname)) return null;
    return u.origin + (u.pathname === "/" ? "" : u.pathname);
  } catch {
    return null;
  }
}

async function recupererHtml(url: string): Promise<string | null> {
  try {
    const reponse = await appel(url, {
      timeoutMs: 9_000,
      tentatives: 0,
      headers: { Accept: "text/html,application/xhtml+xml" },
      redirect: "follow",
    });
    if (!reponse.ok) return null;
    const type = reponse.headers.get("content-type") ?? "";
    if (!type.includes("html")) return null;
    const texte = await reponse.text();
    return texte.slice(0, TAILLE_MAX);
  } catch {
    return null;
  }
}

function texteBrut(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");
}

const MOTS_SERVICE = [
  "reclamation",
  "réclamation",
  "consommateur",
  "serviceclient",
  "service-client",
  "sav",
  "contact",
  "support",
  "clients",
];

function meilleurEmail(texte: string, html: string): string | null {
  const candidats = new Set<string>();
  for (const m of html.matchAll(/mailto:([^"'?\s>]+)/gi)) candidats.add(m[1].toLowerCase());
  for (const m of texte.matchAll(/[\w.+-]+@[\w-]+\.[\w.-]{2,}/g)) candidats.add(m[0].toLowerCase());

  const liste = [...candidats].filter(
    (e) => !/(\.png|\.jpg|\.gif|\.webp|sentry|example\.|wixpress|@2x)/i.test(e),
  );
  if (!liste.length) return null;
  // On privilégie une adresse orientée réclamation / service client.
  const prioritaire = liste.find((e) => MOTS_SERVICE.some((m) => e.split("@")[0].includes(m)));
  return prioritaire ?? liste[0];
}

function meilleurTelephone(texte: string, html: string): string | null {
  const candidats = new Set<string>();
  for (const m of html.matchAll(/tel:\+?([0-9 .()-]{8,20})/gi)) candidats.add(m[1]);
  for (const m of texte.matchAll(/(?:\+33|0)\s?[1-9](?:[\s.-]?\d{2}){4}/g)) candidats.add(m[0]);
  const liste = [...candidats]
    .map((t) => t.replace(/[^\d+]/g, ""))
    .filter((t) => t.replace(/\D/g, "").length >= 9 && t.replace(/\D/g, "").length <= 13);
  if (!liste.length) return null;
  const t = liste[0];
  const chiffres = t.startsWith("+33") ? `0${t.slice(3)}` : t;
  return chiffres.replace(/(\d{2})(?=\d)/g, "$1 ").trim();
}

export function trouverLien(html: string, base: string, motsCles: string[]): string | null {
  for (const m of html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]{0,120}?)<\/a>/gi)) {
    const href = m[1];
    const libelle = texteBrut(m[2]).toLowerCase();
    const cible = `${href.toLowerCase()} ${libelle}`;
    if (motsCles.some((mot) => cible.includes(mot))) {
      try {
        return new URL(href, base).toString();
      } catch {
        continue;
      }
    }
  }
  return null;
}

function mediationDeclaree(texte: string): string | null {
  const minuscules = texte.toLowerCase();
  const index = minuscules.indexOf("médiateur");
  const indexBis = index === -1 ? minuscules.indexOf("mediateur") : index;
  const position = indexBis === -1 ? minuscules.indexOf("médiation de la consommation") : indexBis;
  if (position === -1) return null;
  const extrait = texte.slice(Math.max(0, position - 120), position + 260).trim();
  return extrait.length > 30 ? extrait : null;
}

/** Analyse le site officiel et renvoie les coordonnées trouvées. */
export async function enrichir(urlEntree: string): Promise<EnrichissementSite | null> {
  if (!enrichissementActif()) return null;
  const racine = normaliserUrl(urlEntree);
  if (!racine) return null;

  const accueil = await recupererHtml(racine);
  if (!accueil) return null;

  const resultat: EnrichissementSite = {
    siteWeb: racine,
    email: null,
    telephone: null,
    urlCgv: null,
    urlContactSav: null,
    urlMentionsLegales: null,
    mediationDeclaree: null,
    sirenTrouve: null,
  };

  resultat.urlMentionsLegales = trouverLien(accueil, racine, ["mentions-legales", "mentions légales", "mentions_legales"]);
  resultat.urlCgv = trouverLien(accueil, racine, ["cgv", "conditions générales", "conditions-generales"]);
  resultat.urlContactSav = trouverLien(accueil, racine, [
    "service-client",
    "service client",
    "nous-contacter",
    "contactez",
    "/contact",
    "réclamation",
    "reclamation",
  ]);

  const pages = [
    resultat.urlMentionsLegales,
    resultat.urlCgv,
    resultat.urlContactSav,
    ...PAGES_LEGALES.slice(0, 3).map((p) => `${racine}/${p}`),
  ]
    .filter((u): u is string => Boolean(u))
    .filter((u, i, arr) => arr.indexOf(u) === i)
    .slice(0, 4);

  let corpus = texteBrut(accueil);
  let htmlCumule = accueil;

  for (const page of pages) {
    const html = await recupererHtml(page);
    if (!html) continue;
    htmlCumule += html;
    corpus += ` ${texteBrut(html)}`;
  }

  resultat.email = meilleurEmail(corpus, htmlCumule);
  resultat.telephone = meilleurTelephone(corpus, htmlCumule);
  resultat.mediationDeclaree = mediationDeclaree(corpus);

  const siren = corpus.match(/\b(\d{3}[\s.]?\d{3}[\s.]?\d{3})\b/);
  if (siren) resultat.sirenTrouve = siren[1].replace(/\D/g, "");

  return resultat;
}
