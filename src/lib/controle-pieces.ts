/**
 * Contrôles automatiques d'un justificatif déposé — étage 1.
 *
 * Principe directeur : un refus à tort est bien plus grave qu'une acceptation à
 * tort. Refuser la vraie facture d'un consommateur légitime casse le seul
 * service qu'on lui rend ; un document sans valeur qui passe ne nuit à personne
 * tant qu'il n'est pas contesté — et il est alors examiné.
 *
 * D'où deux catégories strictement séparées :
 *   — REFUS : uniquement ce qui est certain (fichier illisible, tronqué,
 *     chiffré, ou dont les octets démentent le type annoncé) ;
 *   — ANOMALIES : tout le reste. Enregistrées, jamais publiées, jamais
 *     bloquantes. Elles servent à avertir le déposant et à prioriser l'examen
 *     le jour où une entreprise conteste.
 */

export type ControlePiece = {
  /** Message à afficher au déposant si le fichier est rejeté. */
  refus: string | null;
  /** Signaux non bloquants, conservés en base. */
  anomalies: string[];
};

/** En-têtes réels attendus pour chaque type déclaré. */
const SIGNATURES: Record<string, { octets: number[]; libelle: string }> = {
  "image/jpeg": { octets: [0xff, 0xd8, 0xff], libelle: "JPEG" },
  "image/png": { octets: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], libelle: "PNG" },
};

/**
 * En dessous de ce nombre d'octets par pixel, une image est presque
 * certainement vide ou uniforme : une page blanche se comprime dix fois mieux
 * qu'un document scanné. Seuil délibérément bas — c'est un signal, pas un refus.
 */
const OCTETS_PAR_PIXEL_SUSPECT = 0.008;

export function controlerOctets(octets: Buffer, typeDeclare: string): ControlePiece {
  const anomalies: string[] = [];

  if (typeDeclare === "application/pdf") {
    // Le %PDF- doit apparaître au tout début (la norme tolère un léger décalage).
    if (!octets.subarray(0, 1024).includes("%PDF-")) {
      return { refus: "Ce fichier n’est pas un PDF valide, malgré son extension.", anomalies };
    }
    // Un PDF complet se termine par %%EOF. Son absence signe une copie interrompue.
    if (!octets.subarray(Math.max(0, octets.length - 4096)).includes("%%EOF")) {
      return {
        refus: "Ce PDF est incomplet : le transfert a probablement été interrompu. Redéposez-le.",
        anomalies,
      };
    }
    // Chiffrement : cherché près de la fin, là où se trouve le dictionnaire
    // trailer — le chercher partout confondrait avec du texte de contenu.
    if (octets.subarray(Math.max(0, octets.length - 4096)).includes("/Encrypt")) {
      return {
        refus: "Ce PDF est protégé par mot de passe : il ne pourra pas être consulté. Déposez une version non protégée.",
        anomalies,
      };
    }
    return { refus: null, anomalies };
  }

  const signature = SIGNATURES[typeDeclare];
  if (signature) {
    const debut = Array.from(octets.subarray(0, signature.octets.length));
    if (!signature.octets.every((o, i) => debut[i] === o)) {
      return { refus: `Ce fichier n’est pas une image ${signature.libelle} valide.`, anomalies };
    }
  }

  const dimensions = mesurerImage(octets, typeDeclare);
  if (dimensions) {
    const parPixel = octets.length / (dimensions.largeur * dimensions.hauteur);
    if (parPixel < OCTETS_PAR_PIXEL_SUSPECT) anomalies.push("image probablement vide ou uniforme");
    if (dimensions.largeur < 300 || dimensions.hauteur < 300) {
      anomalies.push("image de très faible définition, probablement illisible");
    }
  }

  return { refus: null, anomalies };
}

/** Dimensions lues dans l'en-tête, sans décoder l'image ni dépendance externe. */
function mesurerImage(octets: Buffer, type: string): { largeur: number; hauteur: number } | null {
  if (type === "image/png" && octets.length > 24) {
    return { largeur: octets.readUInt32BE(16), hauteur: octets.readUInt32BE(20) };
  }
  if (type === "image/jpeg") {
    let i = 2;
    while (i + 9 < octets.length) {
      if (octets[i] !== 0xff) {
        i++;
        continue;
      }
      const marqueur = octets[i + 1];
      // SOF0 à SOF15, hors marqueurs sans dimensions (DHT, JPG, DAC).
      if (marqueur >= 0xc0 && marqueur <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marqueur)) {
        return { hauteur: octets.readUInt16BE(i + 5), largeur: octets.readUInt16BE(i + 7) };
      }
      i += 2 + octets.readUInt16BE(i + 2);
    }
  }
  return null;
}
