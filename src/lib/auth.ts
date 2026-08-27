/**
 * Deux mécanismes d'accès, volontairement séparés :
 *  — le consommateur n'a AUCUN compte : il reçoit un lien signé par email ;
 *  — l'administration Recours France utilise un identifiant et un mot de passe.
 */
import { randomBytes, createHash } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "./db";

const COOKIE_ADMIN = "rf_admin";
const DUREE_SESSION_ADMIN = 8 * 3_600_000; // 8 heures
const DUREE_JETON_SUIVI = 90 * 86_400_000; // 90 jours

// ── Mots de passe ────────────────────────────────────────────────────────────
//
// Le hachage vit dans `mot-de-passe.ts`, sans dépendance à Next : le script de
// création de compte en a besoin, et il ne peut pas importer ce fichier-ci.
// Réexporté ici pour que les appelants existants n'aient pas à changer.

export { hacherMotDePasse, verifierMotDePasse } from "./mot-de-passe";

// ── Session administrateur ───────────────────────────────────────────────────

export async function ouvrirSessionAdmin(adminId: string): Promise<void> {
  const jeton = randomBytes(32).toString("hex");
  const expireLe = new Date(Date.now() + DUREE_SESSION_ADMIN);
  await prisma.adminSession.create({ data: { jeton, adminId, expireLe } });
  await prisma.adminUser.update({ where: { id: adminId }, data: { dernierAccesLe: new Date() } });

  const magasin = await cookies();
  magasin.set(COOKIE_ADMIN, jeton, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expireLe,
  });
}

export async function fermerSessionAdmin(): Promise<void> {
  const magasin = await cookies();
  const jeton = magasin.get(COOKIE_ADMIN)?.value;
  if (jeton) await prisma.adminSession.deleteMany({ where: { jeton } });
  magasin.delete(COOKIE_ADMIN);
}

export type AdminConnecte = { id: string; email: string; nom: string; role: string };

export async function adminCourant(): Promise<AdminConnecte | null> {
  const magasin = await cookies();
  const jeton = magasin.get(COOKIE_ADMIN)?.value;
  if (!jeton) return null;

  const session = await prisma.adminSession.findUnique({ where: { jeton }, include: { admin: true } });
  if (!session || session.expireLe < new Date() || !session.admin.actif) return null;
  return {
    id: session.admin.id,
    email: session.admin.email,
    nom: session.admin.nom,
    role: session.admin.role,
  };
}

/** À appeler en tête de chaque page et action d'administration. */
export async function exigerAdmin(): Promise<AdminConnecte> {
  const admin = await adminCourant();
  if (!admin) throw new Error("NON_AUTORISE");
  return admin;
}

export async function journaliser(
  adminId: string | null,
  action: string,
  cible: string,
  cibleId?: string,
  detail?: string,
) {
  await prisma.journalAction.create({ data: { adminId, action, cible, cibleId, detail } });
}

// ── Lien de suivi consommateur (sans compte) ─────────────────────────────────

export async function creerJetonSuivi(signalementId: string, email: string): Promise<string> {
  const jeton = randomBytes(24).toString("base64url");
  await prisma.jetonAcces.create({
    data: {
      jeton,
      type: "SUIVI_SIGNALEMENT",
      signalementId,
      email: email.toLowerCase(),
      expireLe: new Date(Date.now() + DUREE_JETON_SUIVI),
    },
  });
  return jeton;
}

export async function resoudreJetonSuivi(jeton: string) {
  const entree = await prisma.jetonAcces.findUnique({
    where: { jeton },
    include: { signalement: true },
  });
  if (!entree || entree.expireLe < new Date() || !entree.signalement) return null;
  return entree;
}

/** Le lien de suivi est prolongé à chaque consultation utile. */
export async function prolongerJeton(jeton: string) {
  await prisma.jetonAcces.update({
    where: { jeton },
    data: { utiliseLe: new Date(), expireLe: new Date(Date.now() + DUREE_JETON_SUIVI) },
  });
}

/** Empreinte d'IP conservée pour la lutte contre les dépôts massifs, jamais l'IP en clair. */
export function empreinteIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  return createHash("sha256")
    .update(`${ip}|${process.env.APP_SECRET ?? "sel-par-defaut"}`)
    .digest("hex")
    .slice(0, 32);
}
