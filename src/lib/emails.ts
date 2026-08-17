import { bouton, echapper, envoyer, gabarit, versTexte } from "./mailer";
import { construireGuide, modeleRelance, type Categorie, type ContactPrealable } from "./demarches";
import { formatDateLongue, formatMontant, LIBELLES_CATEGORIE } from "./format";

function base(): string {
  return process.env.APP_URL ?? "http://localhost:3200";
}

type ContexteSignalement = {
  reference: string;
  email: string;
  prenom: string;
  nom: string;
  entreprise: string;
  adresseEntreprise?: string | null;
  emailReclamation?: string | null;
  telephoneReclamation?: string | null;
  categorie: Categorie;
  montant: number | null;
  dateFaits: Date;
  contactPrealable: ContactPrealable;
  verifie: boolean;
  jeton: string;
  mediateur?: { nom: string; delaiInstruction: string | null; siteWeb: string | null } | null;
};

/**
 * Email de confirmation : c'est le livrable promis au consommateur.
 * Il contient la référence, la checklist des preuves, les démarches dans
 * l'ordre, le médiateur lorsqu'il est identifié et le lien de suivi.
 */
export async function envoyerRecapitulatif(ctx: ContexteSignalement) {
  const guide = construireGuide({
    categorie: ctx.categorie,
    contactPrealable: ctx.contactPrealable,
    dateSignalement: new Date(),
    reference: ctx.reference,
    verifie: ctx.verifie,
    mediateur: ctx.mediateur,
  });

  const lienSuivi = `${base()}/mon-espace/dossier/${ctx.jeton}`;

  const corps = `
  <p style="font-size:15px;line-height:1.6;color:#4A515F">
    Bonjour ${echapper(ctx.prenom)}, votre signalement concernant <strong>${echapper(ctx.entreprise)}</strong> est enregistré.
    Conservez cette référence : elle doit figurer sur chaque document envoyé au professionnel.
  </p>

  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border:1px solid #D7DCE5;margin:20px 0">
    <tr><td style="padding:18px 20px">
      <div style="font-size:11.5px;font-weight:700;color:#5F6673;text-transform:uppercase;letter-spacing:.05em">Référence du signalement</div>
      <div style="font-family:Menlo,monospace;font-size:21px;font-weight:700;margin-top:6px">${ctx.reference}</div>
      <div style="font-size:13px;color:#4A515F;line-height:1.7;margin-top:14px;border-top:1px solid #EEF1F7;padding-top:12px">
        Entreprise : <strong>${echapper(ctx.entreprise)}</strong><br />
        Catégorie : ${LIBELLES_CATEGORIE[ctx.categorie]}<br />
        Montant déclaré : ${ctx.montant ? formatMontant(ctx.montant) : "non déclaré"}<br />
        Date des faits : ${formatDateLongue(ctx.dateFaits)}<br />
        Niveau de vérification : <strong>${ctx.verifie ? "Vérifié" : "Déclaré"}</strong>
      </div>
    </td></tr>
  </table>

  ${
    ctx.verifie
      ? ""
      : `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border:2px solid #1E4BD2;background:#F7F9FE;margin:20px 0">
    <tr><td style="padding:18px 20px">
      <div style="font-size:16px;font-weight:700">Faites vérifier votre signalement</div>
      <p style="font-size:14px;line-height:1.6;color:#4A515F;margin:8px 0 0">
        Répondez simplement à cet email en joignant une facture, une confirmation de commande ou un échange
        avec le professionnel. Un signalement vérifié entre dans les statistiques publiques de l’entreprise.
        Vos pièces ne sont jamais publiées.
      </p>
    </td></tr></table>`
  }

  <h2 style="font-size:19px;font-weight:700;margin:26px 0 10px">Les démarches, dans le bon ordre</h2>
  <ol style="padding-left:18px;margin:0;font-size:14px;color:#4A515F;line-height:1.6">
    ${guide.etapes
      .map(
        (e) =>
          `<li style="margin-bottom:12px"><strong style="color:#14161C">${echapper(e.titre)}</strong> — ${echapper(e.delai)}<br />${echapper(e.description)}</li>`,
      )
      .join("")}
  </ol>

  <h2 style="font-size:19px;font-weight:700;margin:26px 0 10px">Les preuves à conserver</h2>
  <ul style="padding-left:18px;margin:0;font-size:14px;color:#4A515F;line-height:1.6">
    ${guide.preuves
      .slice(0, 6)
      .map((p) => `<li style="margin-bottom:10px"><strong style="color:#14161C">${echapper(p.intitule)}</strong> — ${echapper(p.utilite)}</li>`)
      .join("")}
  </ul>

  <h2 style="font-size:19px;font-weight:700;margin:26px 0 10px">Coordonnées utiles du professionnel</h2>
  <p style="font-size:14px;line-height:1.7;color:#4A515F;margin:0">
    ${echapper(ctx.entreprise)}<br />
    ${ctx.adresseEntreprise ? `${echapper(ctx.adresseEntreprise)}<br />` : ""}
    ${ctx.emailReclamation ? `Service consommateurs : ${echapper(ctx.emailReclamation)}<br />` : ""}
    ${ctx.telephoneReclamation ? `Téléphone : ${echapper(ctx.telephoneReclamation)}<br />` : ""}
    ${!ctx.emailReclamation && !ctx.telephoneReclamation ? "Aucune coordonnée de service consommateurs identifiée à ce jour : consultez les mentions légales du professionnel." : ""}
  </p>

  ${
    ctx.mediateur
      ? `<h2 style="font-size:19px;font-weight:700;margin:26px 0 10px">Médiateur de la consommation</h2>
  <p style="font-size:14px;line-height:1.7;color:#4A515F;margin:0">
    <strong style="color:#14161C">${echapper(ctx.mediateur.nom)}</strong><br />
    Saisine gratuite, à votre initiative, recevable deux mois après une réclamation écrite restée sans réponse satisfaisante.<br />
    Délai d’instruction : ${echapper(ctx.mediateur.delaiInstruction ?? "90 jours")}.
    ${ctx.mediateur.siteWeb ? `<br /><a href="${ctx.mediateur.siteWeb}">${echapper(ctx.mediateur.siteWeb)}</a>` : ""}
  </p>`
      : ""
  }

  <h2 style="font-size:19px;font-weight:700;margin:26px 0 10px">Démarches officielles disponibles</h2>
  <ul style="padding-left:18px;margin:0;font-size:14px;color:#4A515F;line-height:1.6">
    ${guide.demarchesOfficielles
      .map((d) => `<li style="margin-bottom:10px"><a href="${d.url}">${echapper(d.nom)}</a> — ${echapper(d.description)}</li>`)
      .join("")}
  </ul>

  ${bouton(lienSuivi, "Suivre et mettre à jour mon signalement")}

  <p style="font-size:12.5px;line-height:1.6;color:#5F6673;border-top:1px solid #EEF1F7;padding-top:14px">
    Recours France structure votre signalement et vous indique les démarches disponibles. La plateforme ne
    transmet pas votre réclamation au professionnel, n’envoie aucun courrier à votre place, ne négocie pas
    votre litige et ne délivre pas de conseil juridique personnalisé. Vous restez à l’initiative de chaque étape.
  </p>`;

  const html = gabarit("Votre signalement est enregistré", corps);
  return envoyer({
    destinataire: ctx.email,
    sujet: `Signalement ${ctx.reference} — vos démarches et vos preuves`,
    html,
    texte: `${versTexte(html)}\n\n---\nMODÈLE DE RELANCE\n\n${modeleRelance({
      reference: ctx.reference,
      entreprise: ctx.entreprise,
      adresseEntreprise: ctx.adresseEntreprise,
      categorie: ctx.categorie,
      montant: ctx.montant ? formatMontant(ctx.montant) : null,
      dateFaits: ctx.dateFaits,
      prenom: ctx.prenom,
      nom: ctx.nom,
    })}`,
  });
}

/** Lien de reprise envoyé depuis « Retrouver mon signalement ». */
export async function envoyerLiensSuivi(
  email: string,
  dossiers: { reference: string; entreprise: string; jeton: string }[],
) {
  const corps = `
  <p style="font-size:15px;line-height:1.6;color:#4A515F">
    Voici les signalements rattachés à cette adresse. Les liens sont personnels : ne les transmettez à personne.
  </p>
  ${dossiers
    .map(
      (d) => `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border:1px solid #D7DCE5;margin:14px 0">
      <tr><td style="padding:16px 18px">
        <div style="font-family:Menlo,monospace;font-size:15px;font-weight:700">${d.reference}</div>
        <div style="font-size:13.5px;color:#4A515F;margin-top:4px">${echapper(d.entreprise)}</div>
        <a href="${base()}/mon-espace/dossier/${d.jeton}" style="display:inline-block;margin-top:10px;font-size:13.5px;font-weight:700;color:#1E4BD2">Ouvrir mon signalement</a>
      </td></tr></table>`,
    )
    .join("")}
  <p style="font-size:12.5px;color:#5F6673;line-height:1.6">Ces liens restent valables 90 jours et se prolongent à chaque consultation.</p>`;

  const html = gabarit("Vos signalements Recours France", corps);
  return envoyer({ destinataire: email, sujet: "Vos signalements Recours France", html, texte: versTexte(html) });
}

/** Notification après contrôle d'un justificatif par la modération. */
export async function envoyerResultatVerification(
  email: string,
  reference: string,
  jeton: string,
  accepte: boolean,
  motif?: string,
) {
  const corps = accepte
    ? `<p style="font-size:15px;line-height:1.6;color:#4A515F">
        La pièce que vous avez transmise a été contrôlée. Votre signalement <strong>${reference}</strong> est
        désormais un <strong>signalement vérifié</strong> : il entre dans les statistiques publiques de
        l’entreprise, sous forme agrégée et anonyme. Votre pièce n’est pas publiée.
      </p>${bouton(`${base()}/mon-espace/dossier/${jeton}`, "Voir mon signalement")}`
    : `<p style="font-size:15px;line-height:1.6;color:#4A515F">
        La pièce transmise pour le signalement <strong>${reference}</strong> n’a pas permis d’établir la
        réalité du dossier${motif ? ` : ${echapper(motif)}` : ""}. Votre signalement reste enregistré comme
        <strong>déclaré</strong>. Vous pouvez transmettre une autre pièce à tout moment.
      </p>${bouton(`${base()}/mon-espace/dossier/${jeton}`, "Ajouter une autre pièce")}`;

  const html = gabarit(accepte ? "Votre signalement est vérifié" : "Pièce non retenue", corps);
  return envoyer({
    destinataire: email,
    sujet: `Signalement ${reference} — ${accepte ? "vérifié" : "pièce non retenue"}`,
    html,
    texte: versTexte(html),
  });
}

/** Accusé de réception d'une demande (erreur signalée, revendication). */
export async function envoyerAccuseDemande(email: string, objet: string, detail: string) {
  const corps = `<p style="font-size:15px;line-height:1.6;color:#4A515F">${echapper(detail)}</p>
  <p style="font-size:13.5px;color:#5F6673;line-height:1.6">
    Une donnée inexacte est corrigée sous 15 jours après examen des pièces. Une donnée publique erronée doit
    être rectifiée à la source auprès du registre concerné : la fiche se met à jour à la synchronisation suivante.
  </p>`;
  const html = gabarit(objet, corps);
  return envoyer({ destinataire: email, sujet: `${objet} — Recours France`, html, texte: versTexte(html) });
}
