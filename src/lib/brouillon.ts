import { cookies } from "next/headers";

/**
 * Brouillon du tunnel de signalement, conservé dans un témoin de connexion.
 *
 * Le handoff interdit un brouillon en base avant l'adresse électronique : rien
 * ne doit exister côté serveur tant que la personne n'a pas confirmé. Mais le
 * parcours compte trois écrans, et il doit fonctionner sans JavaScript — le
 * récit ne peut donc voyager ni dans l'URL, où il serait exposé et journalisé,
 * ni dans l'état d'un composant.
 *
 * Un témoin résout les deux : il reste sur l'appareil, se transmet à chaque
 * requête, et disparaît de lui-même. Il n'y a rien à purger côté serveur, et
 * aucune ligne n'est créée pour quelqu'un qui abandonne à l'étape deux.
 */

const NOM = "rf_brouillon";
/** Un témoin plafonne à 4 096 octets ; on garde de la marge pour l'encodage. */
const LIMITE_RECIT = 1500;
const DUREE = 60 * 60 * 24 * 7;

export type Brouillon = {
  /** Entreprise ou boutique saisie librement, quand elle n'est pas répertoriée. */
  libreNom?: string;
  libreSite?: string;
  situation?: string;
  sous?: string;
  recit?: string;
  demande?: string;
  etatPro?: string;
  relances?: number;
  montant?: string;
  dateFaits?: string;
  montantPublic?: boolean;
};

export async function lireBrouillon(): Promise<Brouillon> {
  const jar = await cookies();
  const brut = jar.get(NOM)?.value;
  if (!brut) return {};
  try {
    const v = JSON.parse(decodeURIComponent(brut));
    return typeof v === "object" && v !== null ? (v as Brouillon) : {};
  } catch {
    // Un témoin illisible — tronqué, ou d'une version antérieure — ne doit pas
    // faire échouer le parcours : on repart d'un brouillon vide.
    return {};
  }
}

export async function ecrireBrouillon(valeurs: Brouillon): Promise<void> {
  const jar = await cookies();
  const fusion = { ...(await lireBrouillon()), ...valeurs };
  if (fusion.recit && fusion.recit.length > LIMITE_RECIT) {
    fusion.recit = fusion.recit.slice(0, LIMITE_RECIT);
  }
  jar.set(NOM, encodeURIComponent(JSON.stringify(fusion)), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: DUREE,
  });
}

export async function effacerBrouillon(): Promise<void> {
  const jar = await cookies();
  jar.delete(NOM);
}

export { LIMITE_RECIT };
