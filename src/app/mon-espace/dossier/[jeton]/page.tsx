import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Page } from "@/components/chrome";
import { Accordeon } from "@/components/accordeon";
import { prisma } from "@/lib/db";
import { prolongerJeton, resoudreJetonSuivi } from "@/lib/auth";
import { construireGuide, type Categorie, type ContactPrealable } from "@/lib/demarches";
import { NOMBRE_MAX } from "@/lib/upload-constantes";
import {
  FormulaireCloture,
  FormulairePieces,
  FormulaireReponse,
  FormulaireResolution,
  FormulaireSuppression,
} from "./panneau-actions";
import {
  adressePostale,
  classeBadgeStatut,
  formatDate,
  formatDateLongue,
  formatMontant,
  LIBELLES_CATEGORIE,
  LIBELLES_STATUT,
} from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Suivi de mon signalement", robots: { index: false, follow: false } };

const JOUR = 86_400_000;

export default async function Dossier({ params }: { params: Promise<{ jeton: string }> }) {
  const { jeton } = await params;
  const acces = await resoudreJetonSuivi(jeton);
  if (!acces?.signalement) notFound();
  await prolongerJeton(jeton);

  const signalement = await prisma.signalement.findUnique({
    where: { id: acces.signalement.id },
    include: {
      entreprise: { include: { mediateur: true } },
      justificatifs: { orderBy: { deposeLe: "desc" } },
      evenements: { orderBy: { date: "desc" } },
    },
  });
  if (!signalement) notFound();

  const supprime = signalement.moderation === "RETIRE";
  const entreprise = signalement.entreprise;
  const nomEntreprise = entreprise?.denomination ?? signalement.entrepriseLibreNom ?? "Entreprise non identifiée";
  const verifie = signalement.niveauVerification === "VERIFIE";
  const clos = signalement.closLe !== null;

  const guide = construireGuide({
    categorie: signalement.categorie as Categorie,
    contactPrealable: signalement.contactPrealable as ContactPrealable,
    dateSignalement: signalement.creeLe,
    reference: signalement.reference,
    verifie,
    mediateur: entreprise?.mediateur ?? null,
  });

  // Avancement : 1 déposé · 2 vérifié · 3 réclamation écrite · 4 médiation possible · 5 clôture
  const ouvertureMediation = guide.etapes[3].echeance ?? new Date();
  const etapeCourante = clos ? 5 : Date.now() >= ouvertureMediation.getTime() ? 4 : verifie ? 3 : 2;
  const etapes = [
    { titre: "Signalement déposé", note: formatDate(signalement.creeLe) },
    { titre: "Signalement vérifié", note: verifie ? formatDate(signalement.verifieLe) : "en attente de pièce" },
    {
      titre: "Réclamation écrite",
      note: signalement.contactPrealable === "ECRIT" ? "déclarée effectuée" : "à votre initiative",
    },
    { titre: "Médiation possible", note: `à partir du ${formatDate(ouvertureMediation)}` },
    { titre: "Clôture", note: clos ? formatDate(signalement.closLe) : "à confirmer" },
  ];

  const joursRestants = Math.max(0, Math.ceil((ouvertureMediation.getTime() - Date.now()) / JOUR));
  const piecesRestantes = Math.max(0, NOMBRE_MAX - signalement.justificatifs.length);

  const recapitulatif = [
    { cle: "Référence", valeur: signalement.reference },
    { cle: "Catégorie", valeur: LIBELLES_CATEGORIE[signalement.categorie] },
    { cle: "Montant déclaré", valeur: signalement.montant ? formatMontant(Number(signalement.montant)) : "non déclaré" },
    { cle: "Date des faits", valeur: formatDateLongue(signalement.dateFaits) },
    { cle: "Niveau de vérification", valeur: verifie ? "✓ Vérifié" : "Déclaré" },
    { cle: "Statut", valeur: LIBELLES_STATUT[signalement.statut] },
    { cle: "Réponse déclarée", valeur: signalement.reponseDeclaree ? "oui" : "non" },
  ];

  return (
    <Page entete={{ navActive: "espace" }} fil={[{ libelle: "Mon espace", href: "/mon-espace" }, { libelle: `Signalement ${signalement.reference}` }]} piedComplet={false}>
      {supprime ? (
        <div className="rf-conteneur" style={{ padding: "32px 32px 0" }}>
          <div className="rf-encart rf-encart--erreur" role="status">
            Ce signalement a été supprimé à votre demande. Il ne figure plus dans aucune statistique publique.
          </div>
        </div>
      ) : null}

      {/* ── En-tête du signalement ───────────────────────────────────────── */}
      <section className="rf-conteneur" style={{ padding: "32px 32px 28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 32, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div style={{ flex: "1 1 520px", minWidth: 0 }}>
            <div className="rf-ligne" style={{ gap: 8, marginBottom: 14 }}>
              <span className={`rf-badge rf-badge--sm ${verifie ? "rf-badge--verifie" : "rf-badge--non-verifie"}`}>
                {verifie ? "✓ Signalement vérifié" : "Signalement déclaré"}
              </span>
              <span className={classeBadgeStatut(signalement.statut)}>{LIBELLES_STATUT[signalement.statut]}</span>
              <span className="rf-badge rf-badge--contour">{LIBELLES_CATEGORIE[signalement.categorie]}</span>
            </div>
            <div className="rf-mono" style={{ fontSize: 13, color: "var(--rf-texte-3)" }}>
              Signalement {signalement.reference}
            </div>
            <h1 className="rf-h1" style={{ fontSize: 34, marginTop: 8 }}>
              {LIBELLES_CATEGORIE[signalement.categorie]}
              {signalement.montant ? ` — ${formatMontant(Number(signalement.montant))}` : ""}
            </h1>
            <p className="rf-texte rf-mt-12" style={{ fontSize: 15.5 }}>
              Déclaré le {formatDateLongue(signalement.creeLe)} contre{" "}
              {entreprise ? <Link href={`/entreprises/${entreprise.slug}`}>{nomEntreprise}</Link> : nomEntreprise}
              {verifie ? ` · vérifié le ${formatDate(signalement.verifieLe)}` : " · en attente de vérification"} ·
              dernière mise à jour le {formatDate(signalement.majLe)}.
            </p>
          </div>
          <div style={{ flex: "0 1 300px", display: "flex", flexDirection: "column", gap: 10 }}>
            <a href={`/mon-espace/dossier/${jeton}/recapitulatif`} className="rf-btn rf-btn--primaire rf-btn--md rf-btn--bloc">
              Télécharger le dossier (PDF)
            </a>
            <a href={`/mon-espace/dossier/${jeton}/modele-relance`} className="rf-btn rf-btn--secondaire rf-btn--sm rf-btn--bloc">
              Obtenir le modèle de relance
            </a>
            <p className="rf-legende rf-centre">
              Une résolution n’est comptabilisée qu’après votre confirmation.
            </p>
          </div>
        </div>
      </section>

      {/* ── Avancement ───────────────────────────────────────────────────── */}
      <section className="rf-bande--teinte">
        <div className="rf-conteneur" style={{ padding: "26px 32px 30px" }}>
          <div className="rf-ligne--entre" style={{ display: "flex", flexWrap: "wrap" }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>
              Avancement du signalement — étape {etapeCourante} sur 5
            </div>
            <div className="rf-legende" style={{ fontSize: 13 }}>
              {clos
                ? `Clôturé le ${formatDate(signalement.closLe)}`
                : `Médiation possible à partir du ${formatDate(ouvertureMediation)}`}
            </div>
          </div>
          <div className="rf-segments-etapes rf-mt-12" style={{ gap: 6 }}>
            {etapes.map((_, i) => (
              <div
                key={i}
                style={{
                  height: 8,
                  background:
                    i + 1 < etapeCourante
                      ? "var(--rf-barre-neutre)"
                      : i + 1 === etapeCourante
                        ? "var(--rf-cobalt)"
                        : "var(--rf-separateur)",
                }}
              />
            ))}
          </div>
          <div className="rf-ligne rf-mt-12" style={{ gap: 16 }}>
            {etapes.map((e, i) => (
              <div key={e.titre} style={{ flex: "1 1 150px", minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 12.5,
                    fontWeight: i + 1 === etapeCourante ? 700 : 500,
                    color: i + 1 <= etapeCourante ? "var(--rf-encre)" : "var(--rf-texte-3)",
                    lineHeight: 1.4,
                  }}
                >
                  {i + 1}. {e.titre}
                </div>
                <div className="rf-micro rf-mt-4">{e.note}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="rf-conteneur rf-deux-colonnes" style={{ padding: "32px 32px 48px" }}>
        <div className="rf-pile" style={{ gap: 22 }}>
          {/* Prochaine action */}
          {!clos && !supprime ? (
            <div className="rf-carte rf-carte--filet-alerte" style={{ background: "#FFFEFB", padding: "20px 22px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 20, flexWrap: "wrap", alignItems: "flex-start" }}>
                <div className="rf-flex1">
                  <div className="rf-etiquette" style={{ color: "var(--rf-alerte)" }}>
                    Prochaine action
                  </div>
                  <div style={{ fontSize: 17.5, fontWeight: 700, marginTop: 8, lineHeight: 1.35 }}>
                    {prochaineAction(signalement.contactPrealable, verifie, signalement.reponseDeclaree, joursRestants)}
                  </div>
                  <p className="rf-texte rf-mt-8" style={{ fontSize: 14 }}>
                    {detailProchaineAction(
                      signalement.contactPrealable,
                      verifie,
                      signalement.reponseDeclaree,
                      formatDate(ouvertureMediation),
                    )}
                  </p>
                </div>
                {joursRestants > 0 ? (
                  <div className="rf-flexnone rf-centre" style={{ border: "1px solid var(--rf-alerte-bordure)", background: "#fff", padding: "14px 18px" }}>
                    <div className="rf-nombres" style={{ fontSize: 26, fontWeight: 700, color: "var(--rf-alerte)", lineHeight: 1 }}>
                      {joursRestants}
                    </div>
                    <div className="rf-micro rf-mt-4">jours restants</div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {/* Actions du consommateur */}
          {!supprime ? (
            <div className="rf-pile" style={{ gap: 12 }}>
              <Accordeon
                titre="Enregistrer une réponse reçue"
                sousTitre="Le professionnel vous a répondu : consignez-le ici"
                ouvertParDefaut={!signalement.reponseDeclaree && !clos}
              >
                <FormulaireReponse jeton={jeton} />
              </Accordeon>

              <Accordeon titre="Confirmer une résolution" sousTitre="Seule votre confirmation rend une résolution comptabilisable">
                <FormulaireResolution jeton={jeton} />
              </Accordeon>

              <div id="pieces">
                <Accordeon
                  titre="Ajouter un justificatif"
                  sousTitre={
                    verifie
                      ? "Votre signalement est déjà vérifié — vous pouvez compléter le dossier"
                      : "Une pièce contrôlée fait passer votre signalement en signalement vérifié"
                  }
                  ouvertParDefaut={!verifie}
                >
                  <FormulairePieces jeton={jeton} restant={piecesRestantes} />
                </Accordeon>
              </div>

              {!clos ? (
                <Accordeon titre="Clôturer le signalement" sousTitre="Sans solution obtenue, ou par abandon de la démarche">
                  <FormulaireCloture jeton={jeton} />
                </Accordeon>
              ) : null}

              <Accordeon titre="Supprimer mon signalement" sousTitre="Suppression définitive, sur simple demande, sans justification">
                <FormulaireSuppression jeton={jeton} />
              </Accordeon>
            </div>
          ) : null}

          {/* Historique */}
          <div className="rf-carte">
            <div className="rf-carte__tete rf-carte__tete--simple">
              <h2 className="rf-h3">Historique du signalement</h2>
              <span className="rf-micro">Chaque événement est horodaté</span>
            </div>
            <div style={{ padding: "20px 22px 4px" }}>
              {signalement.evenements.map((e) => (
                <div key={e.id} className="rf-chrono rf-chrono--large">
                  <div className="rf-chrono__date">{formatDate(e.date)}</div>
                  <div className="rf-chrono__axe">
                    <span
                      className="rf-chrono__pastille"
                      style={{
                        background:
                          e.auteur === "RECOURS_FRANCE" ? "var(--rf-succes)" : "var(--rf-texte-desactive)",
                      }}
                    />
                  </div>
                  <div className="rf-chrono__contenu">
                    <div className="rf-ligne" style={{ gap: 9 }}>
                      <span style={{ fontSize: 14.5, fontWeight: 700 }}>{e.titre}</span>
                      <span
                        className={`rf-badge rf-badge--xs ${e.auteur === "RECOURS_FRANCE" ? "rf-badge--succes" : "rf-badge--non-verifie"}`}
                      >
                        {e.etiquette ?? (e.auteur === "RECOURS_FRANCE" ? "VÉRIFICATION" : "CONSOMMATEUR")}
                      </span>
                    </div>
                    {e.detail ? (
                      <p className="rf-texte rf-mt-4" style={{ fontSize: 13 }}>
                        {e.detail}
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Preuves */}
          <div className="rf-carte">
            <div className="rf-carte__tete rf-carte__tete--simple">
              <h2 className="rf-h3">Checklist des preuves</h2>
              <span className="rf-legende">
                {signalement.justificatifs.length} pièce{signalement.justificatifs.length > 1 ? "s" : ""} déposée
                {signalement.justificatifs.length > 1 ? "s" : ""}
              </span>
            </div>
            {guide.preuves.map((p) => (
              <div key={p.intitule} style={{ padding: "14px 22px", borderBottom: "1px solid var(--rf-ligne-carte)" }}>
                <div className="rf-ligne" style={{ gap: 10 }}>
                  <span style={{ fontSize: 14.5, fontWeight: 600 }}>{p.intitule}</span>
                  {p.prioritaire ? <span className="rf-badge rf-badge--xs rf-badge--verifie-doux">Prioritaire</span> : null}
                </div>
                <p className="rf-legende rf-mt-4">{p.utilite}</p>
              </div>
            ))}
            <p className="rf-carte__pied">
              Les pièces déposées restent privées. Elles servent uniquement à vérifier la réalité du
              signalement et ne sont jamais publiées.
            </p>
          </div>

          {/* Démarches */}
          <div className="rf-carte">
            <div className="rf-carte__tete rf-carte__tete--simple" style={{ display: "block" }}>
              <h2 className="rf-h3">Démarches disponibles, dans l’ordre</h2>
              <p className="rf-legende rf-mt-4">
                Chaque étape conditionne la suivante. Recours France vous indique la voie applicable ; la
                démarche reste à votre initiative.
              </p>
            </div>
            {guide.etapes.map((e) => (
              <div
                key={e.numero}
                style={{ padding: "18px 22px", borderBottom: "1px solid var(--rf-ligne-carte)", display: "flex", gap: 18, flexWrap: "wrap", justifyContent: "space-between" }}
              >
                <div className="rf-flex1">
                  <div className="rf-ligne" style={{ gap: 10 }}>
                    <span style={{ fontSize: 15.5, fontWeight: 700 }}>{e.titre}</span>
                    <span
                      className={`rf-badge rf-badge--xs ${
                        e.etat === "faite"
                          ? "rf-badge--succes"
                          : e.etat === "disponible"
                            ? "rf-badge--verifie-doux"
                            : e.etat === "conditionnee"
                              ? "rf-badge--alerte"
                              : "rf-badge--non-verifie"
                      }`}
                    >
                      {e.etat === "faite"
                        ? "Effectuée"
                        : e.etat === "disponible"
                          ? "Disponible"
                          : e.etat === "conditionnee"
                            ? `À partir du ${formatDate(e.echeance ?? ouvertureMediation)}`
                            : "Dernier recours"}
                    </span>
                  </div>
                  <p className="rf-texte rf-mt-6" style={{ fontSize: 13.5 }}>
                    {e.description}
                  </p>
                  <p className="rf-micro rf-mt-6">Délai indicatif : {e.delai}</p>
                </div>
              </div>
            ))}
            <div style={{ padding: "16px 22px" }}>
              <div className="rf-etiquette">Démarches officielles disponibles en parallèle</div>
              <ul className="rf-pile rf-pile--serree rf-mt-10" style={{ gap: 10 }}>
                {guide.demarchesOfficielles.map((d) => (
                  <li key={d.nom}>
                    <a href={d.url} target="_blank" rel="noreferrer noopener" style={{ fontSize: 13.5, fontWeight: 600 }}>
                      {d.nom}
                    </a>
                    <span className="rf-legende"> — {d.description}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="rf-encart rf-encart--doux">
            Recours France ne transmet pas votre réclamation au professionnel, n’envoie aucun courrier à votre
            place, ne négocie pas votre litige et ne permet pas encore aux professionnels de répondre aux
            signalements. Chaque statut affiché ici est déclaré par vous.
          </div>
        </div>

        {/* ── Rail droit ─────────────────────────────────────────────────── */}
        <aside className="rf-rail">
          <div className="rf-carte">
            <div className="rf-carte__tete rf-carte__tete--simple" style={{ fontSize: 14, fontWeight: 700 }}>
              Récapitulatif
            </div>
            {recapitulatif.map((r) => (
              <div key={r.cle} style={{ display: "flex", justifyContent: "space-between", gap: 14, padding: "12px 20px", borderBottom: "1px solid var(--rf-ligne-carte)", alignItems: "baseline" }}>
                <span className="rf-carte__rangee-cle">{r.cle}</span>
                <span className="rf-carte__rangee-valeur">{r.valeur}</span>
              </div>
            ))}
          </div>

          <div className="rf-carte">
            <div className="rf-carte__tete rf-carte__tete--simple" style={{ fontSize: 14, fontWeight: 700 }}>
              Coordonnées du professionnel
            </div>
            <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <div className="rf-legende">Service consommateurs</div>
                <div style={{ fontSize: 13.5, lineHeight: 1.55, marginTop: 3 }}>
                  {entreprise?.emailReclamation ?? "Non identifié à ce jour"}
                  {entreprise?.telephoneReclamation ? (
                    <>
                      <br />
                      {entreprise.telephoneReclamation}
                    </>
                  ) : null}
                </div>
              </div>
              <div>
                <div className="rf-legende">Siège social</div>
                <div style={{ fontSize: 13.5, lineHeight: 1.55, marginTop: 3 }}>
                  {entreprise
                    ? (adressePostale(entreprise) ?? "Adresse non publiée")
                    : (signalement.entrepriseLibreSite ?? "Entreprise en cours de rapprochement")}
                </div>
              </div>
              <p className="rf-micro rf-separateur-haut" style={{ lineHeight: 1.6 }}>
                Source : registres publics et site officiel de l’entreprise.
                {entreprise?.syncSiteOfficiel ? ` Vérifié le ${formatDate(entreprise.syncSiteOfficiel)}.` : ""}
              </p>
            </div>
          </div>

          {entreprise?.mediateur ? (
            <div className="rf-carte rf-carte--teintee" style={{ padding: "18px 20px" }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Médiateur identifié</div>
              <p className="rf-texte rf-mt-8" style={{ fontSize: 13 }}>
                {entreprise.mediateur.nom} — saisine gratuite, recevable deux mois après une réclamation écrite
                restée sans réponse satisfaisante.
              </p>
              {entreprise.mediateur.siteWeb ? (
                <p className="rf-mt-10">
                  <a href={entreprise.mediateur.siteWeb} target="_blank" rel="noreferrer noopener" style={{ fontSize: 13, fontWeight: 600 }}>
                    Site du médiateur
                  </a>
                </p>
              ) : null}
            </div>
          ) : null}

          {entreprise ? (
            <div className="rf-carte" style={{ padding: "18px 20px" }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Votre signalement compte</div>
              <p className="rf-texte rf-mt-8" style={{ fontSize: 13 }}>
                Une fois vérifié, votre signalement alimente les statistiques publiques de l’entreprise, sous
                forme agrégée et anonyme. Aucun texte libre n’est publié.
              </p>
              <p className="rf-mt-10">
                <Link href={`/entreprises/${entreprise.slug}`} style={{ fontSize: 13, fontWeight: 600 }}>
                  Voir la fiche {entreprise.denomination}
                </Link>
              </p>
            </div>
          ) : null}

          {clos && entreprise ? (
            <div className="rf-carte" style={{ padding: "18px 20px" }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Partager votre expérience</div>
              <p className="rf-texte rf-mt-8" style={{ fontSize: 13 }}>
                Votre signalement est clôturé : vous pouvez publier un avis rattaché à ce signalement.
              </p>
              <Link href={`/entreprises/${entreprise.slug}/avis?ref=${signalement.reference}`} className="rf-btn rf-btn--secondaire rf-btn--sm rf-btn--bloc rf-mt-12">
                Laisser un avis
              </Link>
            </div>
          ) : null}
        </aside>
      </div>
    </Page>
  );
}

function prochaineAction(contact: string, verifie: boolean, reponse: boolean, jours: number): string {
  if (!verifie) return "Ajoutez un justificatif pour faire vérifier votre signalement";
  if (contact !== "ECRIT") return "Envoyez votre réclamation écrite au professionnel";
  if (!reponse) return jours > 0 ? `Attendre la réponse du professionnel — ${jours} jours avant la médiation` : "Saisir le médiateur de la consommation";
  return "Enregistrez la suite donnée, ou confirmez la résolution";
}

function detailProchaineAction(contact: string, verifie: boolean, reponse: boolean, dateMediation: string): string {
  if (!verifie)
    return "Une facture, une confirmation de commande ou un échange avec le professionnel suffit. Le contrôle prend 48 heures ouvrées et vos pièces ne sont jamais publiées.";
  if (contact !== "ECRIT")
    return `Le modèle de relance ci-dessus est prérempli avec les références de votre signalement. Une réclamation écrite est indispensable : elle conditionne la saisine du médiateur, possible à partir du ${dateMediation}.`;
  if (!reponse)
    return `Le délai de deux mois requis avant une saisine du médiateur court jusqu’au ${dateMediation}. Si une réponse arrive, enregistrez-la ici pour mettre le signalement à jour.`;
  return "Vous avez déclaré une réponse. Confirmez la résolution si le litige est réglé, ou clôturez le signalement s’il ne l’est pas.";
}
