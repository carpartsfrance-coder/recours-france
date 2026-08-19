"use client";

import { useActionState, useState } from "react";
import {
  ajouterJustificatif,
  basculerRappels,
  repondreContestation,
  cloturerSignalement,
  confirmerResolution,
  enregistrerReponse,
  supprimerSignalement,
  type EtatDossier,
} from "./actions";
import { formatTaille, NOMBRE_MAX, TAILLE_MAX, TYPES_ACCEPTES } from "@/lib/upload-constantes";

function Retour({ etat }: { etat: EtatDossier }) {
  if (etat.erreur) {
    return (
      <div className="rf-encart rf-encart--erreur rf-mt-12" role="alert">
        {etat.erreur}
      </div>
    );
  }
  if (etat.message) {
    return (
      <div className="rf-encart rf-encart--succes rf-mt-12" role="status">
        {etat.message}
      </div>
    );
  }
  return null;
}

export function FormulaireReponse({ jeton }: { jeton: string }) {
  const [etat, action, enCours] = useActionState<EtatDossier, FormData>(enregistrerReponse, {});
  return (
    <form action={action}>
      <input type="hidden" name="jeton" value={jeton} />
      <p className="rf-texte" style={{ fontSize: 13.5 }}>
        Recours France ne reçoit pas les réponses des professionnels. Enregistrez ici ce que vous avez reçu :
        le statut de votre signalement et les délais applicables se mettent à jour.
      </p>
      <fieldset style={{ border: 0, padding: 0, margin: "14px 0 0" }}>
        <legend className="rf-champ__label">Nature de la réponse reçue</legend>
        <div className="rf-segments">
          {[
            { cle: "accuse", libelle: "Accusé de réception" },
            { cle: "solution", libelle: "Solution proposée" },
            { cle: "partielle", libelle: "Geste partiel" },
          ].map((n, i) => (
            <label key={n.cle} className="rf-segment">
              <input type="radio" name="nature" value={n.cle} defaultChecked={i === 0} />
              {n.libelle}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="rf-champ__label rf-mt-14" htmlFor="commentaire">
        Précision <span className="rf-champ__label-facultatif">(facultatif, non publié)</span>
      </label>
      <input
        id="commentaire"
        name="commentaire"
        className="rf-input"
        maxLength={400}
        placeholder="ex. avoir de 120 € proposé le 3 septembre"
      />
      <button type="submit" className="rf-btn rf-btn--primaire rf-mt-14" disabled={enCours}>
        {enCours ? "Enregistrement…" : "Enregistrer la réponse"}
      </button>
      <Retour etat={etat} />
    </form>
  );
}

export function FormulaireResolution({ jeton }: { jeton: string }) {
  const [etat, action, enCours] = useActionState<EtatDossier, FormData>(confirmerResolution, {});
  return (
    <form action={action}>
      <input type="hidden" name="jeton" value={jeton} />
      <p className="rf-texte" style={{ fontSize: 13.5 }}>
        Une résolution n’est comptabilisée qu’après votre confirmation explicite. Sans confirmation, le
        signalement reste en cours, non résolu ou abandonné : il n’est jamais compté comme résolu.
      </p>
      <label className="rf-case rf-mt-14">
        <input type="checkbox" name="complete" />
        <span>
          Je confirme avoir obtenu une résolution <strong>complète</strong> de mon litige (remboursement,
          réparation, remplacement ou résiliation effective).
        </span>
      </label>
      <button type="submit" className="rf-btn rf-btn--succes rf-mt-14" disabled={enCours}>
        {enCours ? "Enregistrement…" : "Confirmer la résolution"}
      </button>
      <Retour etat={etat} />
    </form>
  );
}

export function FormulairePieces({ jeton, restant }: { jeton: string; restant: number }) {
  const [etat, action, enCours] = useActionState<EtatDossier, FormData>(ajouterJustificatif, {});
  const [selection, setSelection] = useState<File[]>([]);

  return (
    <form action={action}>
      <input type="hidden" name="jeton" value={jeton} />
      <p className="rf-texte" style={{ fontSize: 13.5 }}>
        Votre pièce est enregistrée, horodatée et scellée. Elle n’est pas examinée systématiquement : elle
        le sera si l’entreprise conteste votre signalement. Un dossier accompagné d’un justificatif entre
        dans les statistiques publiques, sous forme agrégée et anonyme. Vos pièces ne sont jamais publiées.
      </p>
      <label className="rf-depot rf-mt-14" htmlFor="pieces-fichier">
        <span style={{ display: "block", fontSize: 14.5, fontWeight: 700 }}>Déposer une pièce</span>
        <span className="rf-legende" style={{ display: "block", marginTop: 6 }}>
          PDF, JPG ou PNG — 10 Mo maximum, {restant} pièce{restant > 1 ? "s" : ""} encore possible
          {restant > 1 ? "s" : ""}
        </span>
      </label>
      <input
        id="pieces-fichier"
        name="pieces"
        type="file"
        multiple
        accept=".pdf,.jpg,.jpeg,.png"
        className="rf-vh"
        disabled={restant <= 0}
        onChange={(e) => setSelection(Array.from(e.target.files ?? []))}
      />
      {selection.length ? (
        <ul className="rf-carte rf-mt-12">
          {selection.map((f) => (
            <li key={f.name} style={{ padding: "10px 14px", borderBottom: "1px solid var(--rf-ligne-carte)", fontSize: 13 }}>
              {f.name}
              <span className="rf-legende"> · {formatTaille(f.size)}</span>
              {!TYPES_ACCEPTES.includes(f.type) ? (
                <span className="rf-erreur-champ">Format non accepté</span>
              ) : f.size > TAILLE_MAX ? (
                <span className="rf-erreur-champ">Fichier trop volumineux</span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      <button type="submit" className="rf-btn rf-btn--primaire rf-mt-14" disabled={enCours || restant <= 0}>
        {enCours ? "Envoi…" : "Envoyer la pièce"}
      </button>
      {restant <= 0 ? (
        <p className="rf-legende rf-mt-8">Vous avez atteint la limite de {NOMBRE_MAX} pièces.</p>
      ) : null}
      <Retour etat={etat} />
    </form>
  );
}

export function FormulaireCloture({ jeton }: { jeton: string }) {
  const [etat, action, enCours] = useActionState<EtatDossier, FormData>(cloturerSignalement, {});
  return (
    <form action={action}>
      <input type="hidden" name="jeton" value={jeton} />
      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="rf-champ__label">Motif de clôture</legend>
        <div className="rf-segments">
          <label className="rf-segment">
            <input type="radio" name="motif" value="non-resolu" defaultChecked />
            Aucune solution obtenue
          </label>
          <label className="rf-segment">
            <input type="radio" name="motif" value="abandon" />
            J’abandonne la démarche
          </label>
        </div>
      </fieldset>
      <p className="rf-legende rf-mt-12">
        Dans les deux cas, le signalement n’est jamais comptabilisé comme résolu.
      </p>
      <button type="submit" className="rf-btn rf-btn--neutre rf-mt-14" disabled={enCours}>
        {enCours ? "Clôture…" : "Clôturer le signalement"}
      </button>
      <Retour etat={etat} />
    </form>
  );
}

export function FormulaireContestation({
  jeton,
  echeance,
  aUneiece,
}: {
  jeton: string;
  echeance: string;
  aUneiece: boolean;
}) {
  const [etat, action, enCours] = useActionState<EtatDossier, FormData>(repondreContestation, {});
  return (
    <form action={action}>
      <input type="hidden" name="jeton" value={jeton} />
      <p className="rf-texte" style={{ fontSize: 14.5, fontWeight: 600 }}>
        L’entreprise conteste l’authenticité de votre signalement.
      </p>
      <p className="rf-texte rf-mt-8" style={{ fontSize: 13.5 }}>
        {aUneiece
          ? `Confirmez votre signalement avant le ${echeance}. Votre pièce sera examinée — elle n’est ni publiée, ni transmise à l’entreprise.`
          : `Déposez d’abord une pièce justificative avec « Ajouter un justificatif », puis confirmez ici avant le ${echeance}.`}
      </p>
      <p className="rf-texte rf-mt-8" style={{ fontSize: 13.5, fontWeight: 600 }}>
        Sans réponse à cette date, votre signalement est retiré de la publication. Votre dossier personnel et
        vos démarches restent accessibles.
      </p>
      <button type="submit" className="rf-btn rf-btn--primaire rf-mt-14" disabled={enCours || !aUneiece}>
        {enCours ? "Envoi…" : "Confirmer mon signalement"}
      </button>
      <Retour etat={etat} />
    </form>
  );
}

export function FormulaireRappels({ jeton, actifs }: { jeton: string; actifs: boolean }) {
  const [etat, action, enCours] = useActionState<EtatDossier, FormData>(basculerRappels, {});
  return (
    <form action={action}>
      <input type="hidden" name="jeton" value={jeton} />
      <input type="hidden" name="activer" value={actifs ? "non" : "oui"} />
      <p className="rf-texte" style={{ fontSize: 13.5 }}>
        {actifs
          ? "Vous recevez un rappel le jour où une démarche devient possible : la relance écrite à trente jours, puis l’ouverture de la médiation. Aucun autre message ne vous est envoyé."
          : "Les rappels sont désactivés pour ce dossier. Les échéances restent affichées ci-dessus, mais rien ne vous sera envoyé."}
      </p>
      <p className="rf-legende rf-mt-10">
        Une exception : si l’entreprise entre en procédure collective, vous serez prévenu même sans rappels.
        Le délai de déclaration de créance est de deux mois, et son dépassement éteint définitivement votre
        droit à réclamer.
      </p>
      <button type="submit" className="rf-btn rf-btn--neutre rf-mt-14" disabled={enCours}>
        {enCours ? "Enregistrement…" : actifs ? "Ne plus recevoir de rappels" : "Recevoir à nouveau les rappels"}
      </button>
      <Retour etat={etat} />
    </form>
  );
}

export function FormulaireSuppression({ jeton }: { jeton: string }) {
  const [etat, action, enCours] = useActionState<EtatDossier, FormData>(supprimerSignalement, {});
  const [confirme, setConfirme] = useState(false);
  return (
    <form action={action}>
      <input type="hidden" name="jeton" value={jeton} />
      <p className="rf-texte" style={{ fontSize: 13.5 }}>
        La suppression retire définitivement votre signalement des statistiques publiques et efface vos pièces
        de nos serveurs. Cette action est irréversible.
      </p>
      <label className="rf-case rf-mt-12">
        <input type="checkbox" checked={confirme} onChange={(e) => setConfirme(e.target.checked)} />
        <span>Je demande la suppression définitive de mon signalement et de mes pièces.</span>
      </label>
      <button type="submit" className="rf-btn rf-btn--danger rf-mt-14" disabled={enCours || !confirme}>
        {enCours ? "Suppression…" : "Supprimer mon signalement"}
      </button>
      <Retour etat={etat} />
    </form>
  );
}
