import Link from "next/link";
import { Page } from "@/components/chrome";
import { ItemCoche } from "@/components/ui";
import { statistiquesPlateforme } from "@/lib/stats";
import { formatNombre } from "@/lib/format";

export const dynamic = "force-dynamic";

const ETAPES = [
  {
    n: "1",
    titre: "Signalez",
    desc: "Un seul formulaire : entreprise, motif, montant, dates et un résumé court des faits. Aucun texte libre publié tel quel.",
    note: "3 à 5 minutes, sans compte",
  },
  {
    n: "2",
    titre: "Documentez",
    desc: "Ajoutez vos justificatifs si vous le souhaitez : facture, commande, échanges. Ils restent privés, horodatés et scellés, et appuient votre signalement.",
    note: "Justificatifs facultatifs",
  },
  {
    n: "3",
    titre: "Agissez",
    desc: "Vous recevez par email les démarches dans le bon ordre, le médiateur compétent lorsqu’il est identifié et les voies officielles disponibles.",
    note: "Vous gardez la main à chaque étape",
  },
];

export const BENEFICES = [
  "Les démarches à effectuer dans le bon ordre, avec les dates calculées pour votre dossier",
  "Un rappel le jour où vous pouvez saisir le médiateur — vous n’avez rien à noter",
  "Une alerte si l’entreprise entre en procédure collective : deux mois pour déclarer votre créance",
  "Un courrier de réclamation prérempli, prêt à envoyer",
  "Une checklist des justificatifs et preuves à conserver",
  "Le médiateur compétent lorsqu’il est identifié, et les démarches officielles utiles",
];

const SOURCES = [
  { nom: "Répertoire Sirene", desc: "Identité, activité, établissements, état administratif", tag: "Insee" },
  { nom: "Registre national des entreprises", desc: "Statuts, dirigeants, modifications déposées", tag: "INPI" },
  { nom: "BODACC", desc: "Dépôts de comptes, procédures collectives", tag: "Donnée ouverte" },
  { nom: "Signalements consommateurs", desc: "Publiés avec leur niveau de vérification", tag: "Recours France" },
];

export default async function Accueil() {
  const stats = await statistiquesPlateforme();

  return (
    <Page>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section style={{ background: "var(--rf-fond-teinte)", borderBottom: "1px solid var(--rf-separateur)" }}>
        <div className="rf-conteneur" style={{ padding: "56px 32px 52px" }}>
          <div style={{ maxWidth: 800 }}>
            <h1 className="rf-h1 rf-h1--accueil">
              Un problème avec une entreprise&nbsp;?
              <br />
              Signalez votre litige gratuitement.
            </h1>
            <p className="rf-chapo rf-mt-20" style={{ maxWidth: 700 }}>
              Ne vous contentez pas d’un avis. En quelques minutes, vous obtenez un signalement structuré, la
              liste des preuves à conserver et les démarches à effectuer dans le bon ordre.
            </p>
            <div className="rf-ligne rf-mt-28" style={{ gap: 14 }}>
              <Link href="/signaler" className="rf-btn rf-btn--primaire rf-btn--lg">
                Signaler mon litige gratuitement
              </Link>
              <span className="rf-legende" style={{ fontSize: 13.5 }}>
                Gratuit · 3 à 5 minutes
                <br />
                Sans création de compte
              </span>
            </div>
          </div>

          <div className="rf-carte rf-mt-36" style={{ padding: "22px 24px", maxWidth: 860 }}>
            <div className="rf-ligne--entre" style={{ display: "flex", flexWrap: "wrap" }}>
              <strong style={{ fontSize: 14 }}>Vérifier une entreprise avant d’acheter</strong>
              <span className="rf-legende">Données publiques Sirene · RNE/INPI · BODACC</span>
            </div>
            <form className="rf-recherche rf-mt-12" action="/entreprises" role="search">
              <label className="rf-vh" htmlFor="recherche-accueil">
                Nom commercial, raison sociale, SIREN ou site internet
              </label>
              <input
                id="recherche-accueil"
                className="rf-input"
                type="search"
                name="q"
                placeholder="Nom commercial, raison sociale, SIREN ou site internet"
                style={{ flex: "1 1 300px", padding: "13px 15px" }}
              />
              <button type="submit" className="rf-btn rf-btn--marine" style={{ padding: "13px 24px", fontSize: 15 }}>
                Rechercher
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* ── Comment ça marche ────────────────────────────────────────────── */}
      <section className="rf-conteneur" style={{ padding: "48px 32px 40px" }}>
        <h2 className="rf-h2" style={{ fontSize: 28, letterSpacing: "-0.025em" }}>
          Comment ça marche
        </h2>
        <p className="rf-texte rf-mt-8" style={{ maxWidth: 780 }}>
          Trois étapes, sans engagement. Recours France ne se substitue ni au professionnel, ni au médiateur,
          ni au juge : la plateforme organise votre signalement et vous indique la voie à suivre.
        </p>
        <div className="rf-grille rf-grille--280 rf-mt-26">
          {ETAPES.map((e) => (
            <article key={e.n} className="rf-carte rf-carte--filet-haut" style={{ padding: 24 }}>
              <div className="rf-ligne" style={{ gap: 12, flexWrap: "nowrap" }}>
                <span className="rf-pastille rf-pastille--claire rf-pastille--30">{e.n}</span>
                <h3 style={{ fontSize: 18, fontWeight: 700 }}>{e.titre}</h3>
              </div>
              <p className="rf-texte rf-mt-12" style={{ fontSize: 14.5, lineHeight: 1.65 }}>
                {e.desc}
              </p>
              <p className="rf-legende rf-mt-12 rf-separateur-haut">{e.note}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ── Ce que vous obtenez gratuitement ─────────────────────────────── */}
      <section className="rf-bande--teinte">
        <div className="rf-conteneur" style={{ padding: "38px 32px 40px" }}>
          <div className="rf-ligne--entre" style={{ display: "flex", flexWrap: "wrap" }}>
            <h2 className="rf-h2 rf-h2--secondaire" style={{ fontSize: 24 }}>
              Ce que vous obtenez gratuitement
            </h2>
            <span className="rf-legende">Par email, dès la fin du signalement</span>
          </div>
          <ul className="rf-grille rf-grille--large rf-mt-24">
            {BENEFICES.map((b) => (
              <ItemCoche key={b}>{b}</ItemCoche>
            ))}
          </ul>
          <p className="rf-encart rf-mt-26" style={{ fontSize: 16 }}>
            Un avis raconte votre problème.{" "}
            <strong>Un signalement Recours France vous aide à l’organiser et à agir.</strong>
          </p>
        </div>
      </section>

      {/* ── Des données publiques, pas des rumeurs ───────────────────────── */}
      <section className="rf-conteneur" style={{ padding: "44px 32px 40px" }}>
        <div className="rf-grille" style={{ gap: 32 }}>
          <div>
            <h2 className="rf-h2 rf-h2--secondaire" style={{ fontSize: 24 }}>
              Des données publiques, pas des rumeurs
            </h2>
            <p className="rf-texte rf-mt-12" style={{ fontSize: 14.5, lineHeight: 1.65 }}>
              Chaque fiche d’entreprise est constituée à partir des registres officiels, avec la date de
              synchronisation. Les signalements de consommateurs sont publiés à part, avec leur niveau de
              preuve : un litige déclaré sans pièce n’a jamais le même poids qu’un litige accompagné d’un justificatif.
            </p>
            <p className="rf-mt-14">
              <Link href="/entreprises" style={{ fontSize: 14, fontWeight: 600 }}>
                Parcourir l’annuaire des entreprises
              </Link>
            </p>
            <p className="rf-legende rf-mt-14">
              {formatNombre(stats.entreprises)} fiche{stats.entreprises > 1 ? "s" : ""} constituée
              {stats.entreprises > 1 ? "s" : ""} · {formatNombre(stats.signalements)} signalement
              {stats.signalements > 1 ? "s" : ""} publié{stats.signalements > 1 ? "s" : ""}, dont{" "}
              {formatNombre(stats.verifies)} accompagné{stats.verifies > 1 ? "s" : ""} d’un justificatif.
            </p>
          </div>
          <div className="rf-carte">
            {SOURCES.map((s) => (
              <div
                key={s.nom}
                style={{
                  padding: "14px 18px",
                  borderBottom: "1px solid var(--rf-ligne-carte)",
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 14,
                  alignItems: "baseline",
                  flexWrap: "wrap",
                }}
              >
                <div className="rf-min0">
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{s.nom}</div>
                  <div className="rf-legende rf-mt-4">{s.desc}</div>
                </div>
                <span className="rf-badge rf-badge--sm rf-badge--verifie-doux">{s.tag}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Appel à l'action final ───────────────────────────────────────── */}
      <section className="rf-bande--marine">
        <div
          className="rf-conteneur"
          style={{
            padding: "44px 32px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(330px, 1fr))",
            gap: 40,
            alignItems: "center",
          }}
        >
          <div>
            <h2 className="rf-h2--marine" style={{ fontSize: 30, lineHeight: 1.2 }}>
              Un litige en cours&nbsp;? Ne restez pas seul avec vos courriels.
            </h2>
            <p
              className="rf-mt-14"
              style={{ fontSize: 15.5, color: "var(--rf-sur-marine)", lineHeight: 1.65, maxWidth: 640 }}
            >
              Signalez votre litige : vous obtenez un signalement structuré, la liste des preuves à conserver
              et les démarches à effectuer dans le bon ordre.
            </p>
          </div>
          <div
            style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 380, width: "100%", justifySelf: "end" }}
          >
            <Link href="/signaler" className="rf-btn rf-btn--sur-marine rf-btn--xl rf-btn--bloc">
              Signaler mon litige gratuitement
            </Link>
            <span
              className="rf-centre"
              style={{ fontSize: 13.5, color: "var(--rf-sur-marine-attenue)", lineHeight: 1.5 }}
            >
              Gratuit · 3 à 5 minutes · Justificatifs facultatifs
            </span>
          </div>
        </div>
      </section>
    </Page>
  );
}
