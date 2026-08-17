/**
 * RNE — Registre national des entreprises (INPI).
 * Nécessite un compte API (INPI_USERNAME / INPI_PASSWORD). Sans identifiants,
 * le connecteur reste inactif : la fiche s'appuie alors sur Sirene et BODACC.
 * https://www.inpi.fr/acces-api-entreprises
 */
import { appel, appelJson, dateOuNull } from "./http";

const BASE = process.env.INPI_API_URL ?? "https://registre-national-entreprises.inpi.fr/api";

let jeton: { valeur: string; expire: number } | null = null;

export function inpiConfigure(): boolean {
  return Boolean(process.env.INPI_USERNAME && process.env.INPI_PASSWORD);
}

async function authentifier(): Promise<string> {
  if (jeton && jeton.expire > Date.now()) return jeton.valeur;

  const reponse = await appel(`${BASE}/sso/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: process.env.INPI_USERNAME,
      password: process.env.INPI_PASSWORD,
    }),
    timeoutMs: 15_000,
  });
  if (!reponse.ok) throw new Error(`[inpi] authentification refusée (${reponse.status})`);
  const data = (await reponse.json()) as { token?: string };
  if (!data.token) throw new Error("[inpi] jeton absent de la réponse");
  // Le jeton INPI vaut une heure ; on garde une marge de sécurité.
  jeton = { valeur: data.token, expire: Date.now() + 50 * 60_000 };
  return data.token;
}

type Personne = {
  identite?: {
    entreprise?: {
      denomination?: string;
      formeJuridique?: string;
      dateImmat?: string;
      dateCessation?: string;
      nomCommercial?: string;
      montantCapital?: number;
      deviseCapital?: string;
      capitalVariable?: boolean;
    };
    description?: { objet?: string };
  };
  composition?: {
    pouvoirs?: {
      typeDePersonne?: string;
      individu?: { descriptionPersonne?: { nom?: string; prenoms?: string[] } };
      entreprise?: { denomination?: string };
      roleEntreprise?: string;
    }[];
  };
  adresseEntreprise?: {
    adresse?: {
      numVoie?: string;
      typeVoie?: string;
      voie?: string;
      codePostal?: string;
      commune?: string;
      pays?: string;
    };
  };
  detailCessationEntreprise?: { dateCessationTotaleActivite?: string };
};

export type DonneesRne = {
  denomination: string | null;
  nomCommercial: string | null;
  formeJuridique: string | null;
  dateImmatriculation: Date | null;
  dateCessation: Date | null;
  capital: number | null;
  devise: string | null;
  objetSocial: string | null;
  representantLegal: string | null;
  adresse: string | null;
  greffe: string | null;
};

export async function parSiren(siren: string): Promise<DonneesRne | null> {
  if (!inpiConfigure()) return null;
  const propre = siren.replace(/\D/g, "");
  if (propre.length !== 9) return null;

  const token = await authentifier();
  const data = await appelJson<{
    formality?: { content?: { personneMorale?: Personne; personnePhysique?: Personne } };
    greffe?: string;
  }>(`${BASE}/companies/${propre}`, "inpi", {
    headers: { Authorization: `Bearer ${token}` },
    timeoutMs: 20_000,
  });

  const contenu = data.formality?.content?.personneMorale ?? data.formality?.content?.personnePhysique;
  if (!contenu) return null;

  const ent = contenu.identite?.entreprise ?? {};
  const dirigeant = (contenu.composition?.pouvoirs ?? []).find((p) => p.individu || p.entreprise);
  const nomDirigeant = dirigeant?.individu?.descriptionPersonne
    ? [
        (dirigeant.individu.descriptionPersonne.prenoms ?? []).join(" "),
        dirigeant.individu.descriptionPersonne.nom,
      ]
        .filter(Boolean)
        .join(" ")
    : (dirigeant?.entreprise?.denomination ?? null);

  const adr = contenu.adresseEntreprise?.adresse;
  const adresse = adr
    ? [adr.numVoie, adr.typeVoie, adr.voie, adr.codePostal, adr.commune].filter(Boolean).join(" ")
    : null;

  return {
    denomination: ent.denomination ?? null,
    nomCommercial: ent.nomCommercial ?? null,
    formeJuridique: ent.formeJuridique ?? null,
    dateImmatriculation: dateOuNull(ent.dateImmat),
    dateCessation: dateOuNull(
      ent.dateCessation ?? contenu.detailCessationEntreprise?.dateCessationTotaleActivite,
    ),
    capital: typeof ent.montantCapital === "number" ? ent.montantCapital : null,
    devise: ent.deviseCapital ?? "EUR",
    objetSocial: contenu.identite?.description?.objet ?? null,
    representantLegal: nomDirigeant
      ? `${nomDirigeant}${dirigeant?.roleEntreprise ? ` (${dirigeant.roleEntreprise})` : ""}`
      : null,
    adresse,
    greffe: data.greffe ?? null,
  };
}

/** Liste des actes et pièces déposés au RNE, pour l'historique de la fiche. */
export async function actesParSiren(
  siren: string,
): Promise<{ date: Date; titre: string; detail: string | null; reference: string }[]> {
  if (!inpiConfigure()) return [];
  const propre = siren.replace(/\D/g, "");
  const token = await authentifier();

  try {
    const data = await appelJson<
      { id?: string; dateDepot?: string; typeRdd?: { typeRdd?: string }[]; nomDocument?: string }[]
    >(`${BASE}/companies/${propre}/attachments`, "inpi", {
      headers: { Authorization: `Bearer ${token}` },
      timeoutMs: 20_000,
    });
    return (Array.isArray(data) ? data : [])
      .map((a) => {
        const date = dateOuNull(a.dateDepot);
        if (!date) return null;
        const type = a.typeRdd?.[0]?.typeRdd ?? a.nomDocument ?? "Pièce déposée";
        return {
          date,
          titre: "Dépôt au registre national des entreprises",
          detail: type,
          reference: `Dépôt RNE n° ${a.id ?? ""}`.trim(),
        };
      })
      .filter((x): x is { date: Date; titre: string; detail: string; reference: string } => Boolean(x));
  } catch {
    // Les pièces ne sont pas toujours accessibles selon le profil du compte.
    return [];
  }
}
