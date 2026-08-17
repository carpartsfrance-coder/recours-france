import type { Metadata } from "next";
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
        <div className="rf-ligne" style={{ gap: 14, marginBottom: 20, justifyContent: "center" }}>
          <span
            aria-hidden="true"
            style={{
              width: 44,
              height: 44,
              background: "var(--rf-cobalt-fonce)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              letterSpacing: ".04em",
            }}
          >
            RF
          </span>
          <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>Recours France</span>
        </div>
        <FormulaireConnexion />
      </div>
    </main>
  );
}
