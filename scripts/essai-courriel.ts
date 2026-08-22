/**
 * Essai d'envoi, avant de compter sur la messagerie.
 *
 * Le lien de suivi envoyé par courriel est le seul chemin par lequel un
 * consommateur retrouve son dossier : ni compte, ni mot de passe, ni autre
 * porte d'entrée. Une configuration SMTP fausse ne se voit donc nulle part —
 * le tunnel se termine normalement, l'écran de réussite s'affiche, et la
 * personne n'a simplement jamais de nouvelles.
 *
 *   npm run essai:courriel -- vous@exemple.fr
 *
 * Les identifiants sont demandés à la saisie plutôt que passés en variables
 * d'environnement. Une commande qui les porte en clair les laisse dans
 * l'historique du terminal, et se recopie volontiers dans une conversation ou
 * un ticket — c'est arrivé. Ici ils ne quittent jamais le processus.
 */

import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { envoyer, versTexte } from "../src/lib/mailer";

const destinataire = process.argv[2];

function ligne(cle: string, valeur: string | undefined, secret = false) {
  const v = !valeur
    ? "(absente)"
    : secret
      ? `${valeur.slice(0, 3)}… (${valeur.length} caractères)`
      : valeur;
  console.log(`  ${cle.padEnd(16)} ${v}`);
}

async function main() {
  // Demandés seulement s'ils manquent, et seulement devant un vrai terminal.
  // `readline` ne résout jamais sa promesse quand l'entrée est un tube : le
  // script restait bloqué sans rien afficher, ce qu'aucune trace n'expliquait.
  const interactif = Boolean(stdin.isTTY);
  if ((!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) && !interactif) {
    console.log(
      "\nIdentifiants absents, et l'entrée n'est pas un terminal.\n" +
        "Relancez depuis un terminal, ou fournissez SMTP_USER et SMTP_PASSWORD.",
    );
    process.exitCode = 1;
    return;
  }
  if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    const invite = createInterface({ input: stdin, output: stdout });
    if (!process.env.SMTP_USER) {
      process.env.SMTP_USER = (await invite.question("\nIdentifiant SMTP : ")).trim();
    }
    if (!process.env.SMTP_PASSWORD) {
      process.env.SMTP_PASSWORD = (await invite.question("Mot de passe SMTP : ")).trim();
    }
    invite.close();
    process.env.SMTP_HOST ||= "smtp.mailersend.net";
    process.env.SMTP_PORT ||= "587";
    process.env.MAIL_ENABLED = "true";
  }

  console.log("\nConfiguration lue :");
  ligne("MAIL_ENABLED", process.env.MAIL_ENABLED);
  ligne("SMTP_HOST", process.env.SMTP_HOST);
  ligne("SMTP_PORT", process.env.SMTP_PORT ?? "587 (défaut)");
  ligne("SMTP_USER", process.env.SMTP_USER);
  if (/^COLLEZ|^\.\.\.$|^<|^votre/i.test(process.env.SMTP_USER ?? "")) {
    console.log("\n  ⚠ L'identifiant est resté un texte à remplacer.");
  }
  ligne("SMTP_PASSWORD", process.env.SMTP_PASSWORD, true);
  ligne("MAIL_FROM", process.env.MAIL_FROM);
  ligne("MAIL_REPLY_TO", process.env.MAIL_REPLY_TO);

  // Le prédicat d'activation vit dans le module et n'est pas exporté ; on le
  // reproduit ici à l'identique plutôt que d'élargir sa surface publique.
  const actif =
    process.env.MAIL_ENABLED === "true" && Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);
  if (!actif) {
    console.log(
      "\nL'envoi est INACTIF. Il faut MAIL_ENABLED=true, plus SMTP_HOST et SMTP_USER.\n" +
        "Tant que c'est le cas, les courriels sont écrits sur disque au lieu d'être envoyés.",
    );
    process.exitCode = 1;
    return;
  }

  if (!destinataire) {
    console.log("\nIndiquez une adresse : npm run essai:courriel -- vous@exemple.fr\n");
    process.exitCode = 1;
    return;
  }

  console.log(`\n→ Envoi vers ${destinataire}…`);
  try {
    const html =
      "<p>Cet essai confirme que la messagerie de Recours France fonctionne.</p>" +
      "<p>Si vous lisez ceci depuis votre boîte de réception et non depuis les " +
      "indésirables, l'authentification du domaine est correctement en place.</p>";
    const r = await envoyer({
      destinataire,
      sujet: "Essai de configuration — Recours France",
      html,
      texte: versTexte(html),
    });
    console.log(r.envoye ? "  envoyé." : `  NON envoyé — écrit dans ${r.chemin ?? "(?)"}`);
    console.log(
      "\nVérifiez maintenant DEUX choses :\n" +
        "  1. le message est bien arrivé ;\n" +
        "  2. il est dans la boîte de réception, pas dans les indésirables.\n" +
        "Le second point dépend de SPF, DKIM et DMARC, pas du code.",
    );
  } catch (e) {
    console.error("\n  échec :", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  }
}

// Un script d'essai qui meurt en silence est pire qu'inutile : on croit avoir
// vérifié quelque chose. Toute erreur non prévue s'affiche et fait sortir en
// échec.
main().catch((e) => {
  console.error("\n  erreur inattendue :", e instanceof Error ? e.message : e);
  process.exit(1);
});
