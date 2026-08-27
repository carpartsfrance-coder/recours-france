/**
 * Le hachage des mots de passe d'administration, isolé du reste.
 *
 * Il vivait dans `auth.ts`, lequel importe `next/headers` pour les cookies —
 * donc inutilisable depuis un script en ligne de commande, alors que c'est
 * précisément là qu'on crée le premier compte. Séparé ici, il n'a plus aucune
 * dépendance à Next et les deux mondes partagent la même fonction : un compte
 * créé au terminal se connecte forcément sur le site.
 *
 * scrypt plutôt que bcrypt : il est dans la bibliothèque standard de Node, ce
 * qui évite une dépendance native à recompiler à chaque déploiement.
 */
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb) as (
  motDePasse: string,
  sel: Buffer,
  longueur: number,
) => Promise<Buffer>;

export async function hacherMotDePasse(motDePasse: string): Promise<string> {
  const sel = randomBytes(16);
  const cle = await scrypt(motDePasse, sel, 64);
  return `scrypt:${sel.toString("hex")}:${cle.toString("hex")}`;
}

export async function verifierMotDePasse(motDePasse: string, hachage: string): Promise<boolean> {
  const [algo, selHex, cleHex] = hachage.split(":");
  if (algo !== "scrypt" || !selHex || !cleHex) return false;
  const cle = await scrypt(motDePasse, Buffer.from(selHex, "hex"), 64);
  const attendu = Buffer.from(cleHex, "hex");
  return cle.length === attendu.length && timingSafeEqual(cle, attendu);
}
