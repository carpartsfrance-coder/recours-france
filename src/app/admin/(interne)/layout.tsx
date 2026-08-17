import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { adminCourant } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { deconnexionAdmin } from "../actions";

export const dynamic = "force-dynamic";

const LIENS: { href: string; libelle: string; compteur?: string }[] = [
  { href: "/admin", libelle: "Tableau de bord" },
  { href: "/admin/justificatifs", libelle: "Justificatifs", compteur: "justificatifs" },
  { href: "/admin/signalements", libelle: "Signalements" },
  { href: "/admin/avis", libelle: "Avis", compteur: "avis" },
  { href: "/admin/entreprises", libelle: "Fiches entreprises" },
  { href: "/admin/corrections", libelle: "Erreurs signalées", compteur: "corrections" },
  { href: "/admin/revendications", libelle: "Revendications", compteur: "revendications" },
  { href: "/admin/journal", libelle: "Journal d’audit" },
];

export default async function LayoutInterne({ children }: { children: React.ReactNode }) {
  const admin = await adminCourant();
  if (!admin) redirect("/admin/connexion");

  const [justificatifs, avis, corrections, revendications] = await Promise.all([
    prisma.justificatif.count({ where: { etat: "EN_ATTENTE" } }),
    prisma.avis.count({ where: { moderation: "EN_ATTENTE" } }),
    prisma.correction.count({ where: { etat: "EN_ATTENTE" } }),
    prisma.revendication.count({ where: { etat: "EN_ATTENTE" } }),
  ]);
  const compteurs: Record<string, number> = { justificatifs, avis, corrections, revendications };

  return (
    <div className="rf-admin">
      <nav className="rf-admin__nav" aria-label="Navigation de l’administration">
        <div style={{ padding: "0 24px 20px", display: "flex", alignItems: "center", gap: 12 }}>
          <Image
            src="/pictogramme-rf.png"
            alt=""
            aria-hidden="true"
            width={30}
            height={32}
            style={{ height: 32, width: "auto", filter: "brightness(0) invert(1)" }}
          />
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>Recours France</span>
          <span style={{ color: "var(--rf-sur-nuit)", fontWeight: 600, fontSize: 12.5 }}>Administration</span>
        </div>
        <ul>
          {LIENS.map((l) => {
            const n = l.compteur ? compteurs[l.compteur] : 0;
            return (
              <li key={l.href}>
                <Link href={l.href}>
                  <span>{l.libelle}</span>
                  {n > 0 ? <span className="rf-admin__compteur">{n}</span> : null}
                </Link>
              </li>
            );
          })}
        </ul>
        <div style={{ padding: "20px 24px 0", borderTop: "1px solid var(--rf-filet-nuit)", marginTop: 16 }}>
          <div style={{ fontSize: 12.5, color: "var(--rf-sur-nuit)" }}>{admin.nom}</div>
          <div className="rf-micro" style={{ color: "var(--rf-sur-nuit-attenue)" }}>
            {admin.role}
          </div>
          <form action={deconnexionAdmin} style={{ marginTop: 12 }}>
            <button
              type="submit"
              style={{
                border: 0,
                background: "none",
                color: "var(--rf-sur-nuit-attenue)",
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
                padding: 0,
                fontFamily: "inherit",
              }}
            >
              Se déconnecter
            </button>
          </form>
          <p className="rf-micro" style={{ color: "var(--rf-sur-nuit-attenue)", marginTop: 16, lineHeight: 1.6 }}>
            Toute action de modération est enregistrée dans le journal d’audit.
          </p>
        </div>
      </nav>
      <div className="rf-admin__contenu">{children}</div>
    </div>
  );
}
