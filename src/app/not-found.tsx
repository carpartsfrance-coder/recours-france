import Link from "next/link";
import { Page } from "@/components/chrome";

export default function Introuvable() {
  return (
    <Page>
      <div className="rf-conteneur" style={{ padding: "64px 32px 72px", maxWidth: 760 }}>
        <span className="rf-badge rf-badge--non-verifie">Erreur 404</span>
        <h1 className="rf-h1 rf-mt-16">Cette page n’existe pas</h1>
        <p className="rf-chapo rf-mt-14">
          Le lien est peut-être expiré, ou la fiche demandée n’a pas encore été constituée à partir des
          registres publics.
        </p>
        <div className="rf-ligne rf-mt-24" style={{ gap: 12 }}>
          <Link href="/entreprises" className="rf-btn rf-btn--primaire rf-btn--md">
            Chercher une entreprise
          </Link>
          <Link href="/signaler" className="rf-btn rf-btn--secondaire rf-btn--md">
            Signaler un litige
          </Link>
          <Link href="/mon-espace" className="rf-btn rf-btn--tertiaire rf-btn--md">
            Retrouver mon signalement
          </Link>
        </div>
      </div>
    </Page>
  );
}
