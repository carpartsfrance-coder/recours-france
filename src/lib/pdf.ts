/**
 * Générateur PDF minimal, sans dépendance.
 * Produit un document A4 texte (Helvetica / Helvetica-Bold), encodé en
 * WinAnsi — suffisant pour les accents français — avec césure automatique,
 * pagination et pied de page. Utilisé pour le récapitulatif de signalement et
 * la fiche entreprise.
 */

type Bloc =
  | { type: "titre"; texte: string }
  | { type: "soustitre"; texte: string }
  | { type: "paragraphe"; texte: string }
  | { type: "petit"; texte: string }
  | { type: "cle-valeur"; cle: string; valeur: string }
  | { type: "puce"; texte: string }
  | { type: "filet" }
  | { type: "espace"; hauteur?: number }
  | { type: "saut" };

export type DocumentPdf = {
  titre: string;
  sousTitre?: string;
  blocs: Bloc[];
  piedDePage: string;
};

const LARGEUR = 595.28; // A4 en points
const HAUTEUR = 841.89;
const MARGE = 56;
const LARGEUR_UTILE = LARGEUR - MARGE * 2;

// Largeurs Helvetica (unités /1000) suffisamment fidèles pour la césure.
const LARGEURS: Record<string, number> = { defaut: 500 };
function largeurCaractere(code: number): number {
  if (code === 32) return 278;
  if (code >= 48 && code <= 57) return 556; // chiffres
  if (code >= 65 && code <= 90) return 667; // majuscules
  if ("iljItfr".includes(String.fromCharCode(code))) return 250;
  if ("mwMW".includes(String.fromCharCode(code))) return 833;
  if (code >= 97 && code <= 122) return 556; // minuscules
  if (code >= 192) return 556; // lettres accentuées
  return LARGEURS.defaut;
}

function largeurTexte(texte: string, taille: number, gras: boolean): number {
  let total = 0;
  for (const c of texte) total += largeurCaractere(c.charCodeAt(0)) * (gras ? 1.04 : 1);
  return (total / 1000) * taille;
}

function couper(texte: string, taille: number, gras: boolean, largeurMax: number): string[] {
  const mots = texte.split(/\s+/).filter(Boolean);
  const lignes: string[] = [];
  let courante = "";
  for (const mot of mots) {
    const essai = courante ? `${courante} ${mot}` : mot;
    if (largeurTexte(essai, taille, gras) > largeurMax && courante) {
      lignes.push(courante);
      courante = mot;
    } else {
      courante = essai;
    }
  }
  if (courante) lignes.push(courante);
  return lignes.length ? lignes : [""];
}

function echapper(texte: string): string {
  return texte.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

type Commande = { x: number; y: number; texte: string; taille: number; gras: boolean; gris?: boolean };

export function genererPdf(doc: DocumentPdf): Buffer {
  const pages: (Commande | { filet: true; y: number })[][] = [];
  let page: (Commande | { filet: true; y: number })[] = [];
  let y = HAUTEUR - MARGE;

  const nouvellePage = () => {
    pages.push(page);
    page = [];
    y = HAUTEUR - MARGE;
  };

  const ecrire = (texte: string, taille: number, gras: boolean, interligne: number, gris = false, decalage = 0) => {
    for (const ligne of couper(texte, taille, gras, LARGEUR_UTILE - decalage)) {
      if (y < MARGE + 40) nouvellePage();
      page.push({ x: MARGE + decalage, y, texte: ligne, taille, gras, gris });
      y -= interligne;
    }
  };

  // En-tête
  page.push({ x: MARGE, y, texte: "RECOURS FRANCE", taille: 11, gras: true });
  y -= 14;
  page.push({
    x: MARGE,
    y,
    texte: "Service prive independant — ni service de l'Etat, ni autorite administrative",
    taille: 8,
    gras: false,
    gris: true,
  });
  y -= 26;
  ecrire(doc.titre, 19, true, 24);
  if (doc.sousTitre) {
    y -= 2;
    ecrire(doc.sousTitre, 10, false, 15, true);
  }
  y -= 10;

  for (const bloc of doc.blocs) {
    switch (bloc.type) {
      case "titre":
        y -= 8;
        ecrire(bloc.texte, 13, true, 18);
        y -= 2;
        break;
      case "soustitre":
        y -= 4;
        ecrire(bloc.texte, 11, true, 16);
        break;
      case "paragraphe":
        ecrire(bloc.texte, 10, false, 14.5);
        y -= 5;
        break;
      case "petit":
        ecrire(bloc.texte, 8.5, false, 12, true);
        y -= 4;
        break;
      case "puce":
        if (y < MARGE + 40) nouvellePage();
        page.push({ x: MARGE, y, texte: "-", taille: 10, gras: true });
        ecrire(bloc.texte, 10, false, 14.5, false, 14);
        y -= 2;
        break;
      case "cle-valeur": {
        if (y < MARGE + 40) nouvellePage();
        page.push({ x: MARGE, y, texte: bloc.cle, taille: 9.5, gras: false, gris: true });
        const lignes = couper(bloc.valeur, 10, true, LARGEUR_UTILE - 180);
        let yy = y;
        for (const ligne of lignes) {
          page.push({ x: MARGE + 180, y: yy, texte: ligne, taille: 10, gras: true });
          yy -= 14;
        }
        y = yy - 4;
        break;
      }
      case "filet":
        if (y < MARGE + 40) nouvellePage();
        page.push({ filet: true, y: y + 4 });
        y -= 12;
        break;
      case "espace":
        y -= bloc.hauteur ?? 10;
        break;
      case "saut":
        nouvellePage();
        break;
    }
  }
  pages.push(page);

  // ── Sérialisation ────────────────────────────────────────────────────────
  const objets: string[] = [];
  const contenus: string[] = [];

  pages.forEach((commandes, index) => {
    let flux = "";
    for (const c of commandes) {
      if ("filet" in c) {
        flux += `0.84 0.86 0.90 RG 0.7 w ${MARGE} ${c.y.toFixed(2)} m ${(LARGEUR - MARGE).toFixed(2)} ${c.y.toFixed(2)} l S\n`;
        continue;
      }
      const gris = c.gris ? "0.37 0.39 0.44 rg" : "0.08 0.09 0.11 rg";
      flux += `BT /${c.gras ? "F2" : "F1"} ${c.taille} Tf ${gris} ${c.x.toFixed(2)} ${c.y.toFixed(2)} Td (${echapper(c.texte)}) Tj ET\n`;
    }
    const pied = `${doc.piedDePage} — page ${index + 1} sur ${pages.length}`;
    flux += `BT /F1 8 Tf 0.37 0.39 0.44 rg ${MARGE} ${MARGE - 20} Td (${echapper(pied)}) Tj ET\n`;
    contenus.push(flux);
  });

  const nbPages = pages.length;
  const idPagesRacine = 1;
  const idPolice1 = 2;
  const idPolice2 = 3;
  const premierePage = 4;

  objets[idPagesRacine] = `<< /Type /Pages /Count ${nbPages} /Kids [${Array.from(
    { length: nbPages },
    (_, i) => `${premierePage + i * 2} 0 R`,
  ).join(" ")}] >>`;
  objets[idPolice1] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
  objets[idPolice2] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";

  contenus.forEach((flux, i) => {
    const idPage = premierePage + i * 2;
    const idFlux = idPage + 1;
    objets[idPage] =
      `<< /Type /Page /Parent ${idPagesRacine} 0 R /MediaBox [0 0 ${LARGEUR} ${HAUTEUR}] ` +
      `/Resources << /Font << /F1 ${idPolice1} 0 R /F2 ${idPolice2} 0 R >> >> /Contents ${idFlux} 0 R >>`;
    objets[idFlux] = `<< /Length ${Buffer.byteLength(flux, "latin1")} >>\nstream\n${flux}endstream`;
  });

  const idCatalogue = premierePage + nbPages * 2;
  objets[idCatalogue] = `<< /Type /Catalog /Pages ${idPagesRacine} 0 R >>`;

  let sortie = "%PDF-1.4\n";
  const positions: number[] = [];
  for (let i = 1; i <= idCatalogue; i++) {
    positions[i] = Buffer.byteLength(sortie, "latin1");
    sortie += `${i} 0 obj\n${objets[i]}\nendobj\n`;
  }

  const positionXref = Buffer.byteLength(sortie, "latin1");
  sortie += `xref\n0 ${idCatalogue + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= idCatalogue; i++) {
    sortie += `${String(positions[i]).padStart(10, "0")} 00000 n \n`;
  }
  sortie += `trailer\n<< /Size ${idCatalogue + 1} /Root ${idCatalogue} 0 R >>\nstartxref\n${positionXref}\n%%EOF`;

  return Buffer.from(sortie, "latin1");
}
