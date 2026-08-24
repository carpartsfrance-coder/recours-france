import Link from "next/link";
import Image from "next/image";

/**
 * Le logotype de la fiche.
 *
 * La maquette institutionnelle dessine à cet endroit une bulle de dialogue :
 * c'est le repère du prototype, pas la marque. Le logo de Recours France est
 * celui que porte déjà le reste du site — le dossier à la coche et son filet
 * tricolore — et c'est lui qui est repris ici.
 *
 * Seul le pictogramme est repris, le nom restant du texte. Le verrou complet
 * embarque la signature « vos droits, notre engagement », illisible à
 * trente-huit pixels de haut ; l'en-tête du site fait le même choix, pour la
 * même raison.
 *
 * La composition du nom, elle, vient de la maquette : deux lignes serrées,
 * `Recours` au-dessus de `France`.
 */
const PICTO = { clair: "/pictogramme-rf.png", fonce: "/pictogramme-rf-blanc.png", ratio: 352 / 309 };

export function Logo({ taille = 38, fonce = false }: { taille?: number; fonce?: boolean }) {
  return (
    <Link
      href="/"
      aria-label="Recours France — accueil"
      style={{ display: "inline-flex", alignItems: "center", gap: 11, textDecoration: "none", flex: "none" }}
    >
      <Image
        src={fonce ? PICTO.fonce : PICTO.clair}
        alt=""
        aria-hidden="true"
        width={Math.round(taille * PICTO.ratio)}
        height={taille}
        priority={!fonce}
        style={{ flex: "none", height: taille, width: "auto" }}
      />
      <span
        style={{
          display: "flex",
          flexDirection: "column",
          fontSize: fonce ? 16 : 17,
          fontWeight: 800,
          letterSpacing: "-0.02em",
          lineHeight: 1.06,
          color: fonce ? "#fff" : "var(--e-navy)",
        }}
      >
        <span>Recours</span>
        <span>France</span>
      </span>
    </Link>
  );
}
