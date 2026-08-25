import type { Metadata } from "next";
import { Logo } from "@/components/logo";
import { redirect } from "next/navigation";
import { adminCourant } from "@/lib/auth";
import { FormulaireConnexion } from "./formulaire";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Connexion administration", robots: { index: false, follow: false } };

export default async function Connexion() {
  if (await adminCourant()) redirect("/admin");

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--rf-fond-teinte)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div className="rf-ligne" style={{ marginBottom: 20, justifyContent: "center" }}>
          <Logo taille={40} lien={null} />
        </div>
        <FormulaireConnexion />
      </div>
    </main>
  );
}
