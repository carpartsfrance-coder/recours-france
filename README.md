# Recours France

Plateforme privée indépendante de signalement des litiges de consommation.
Un consommateur signale gratuitement un litige, sans créer de compte, et reçoit
en retour les démarches à effectuer **dans le bon ordre**, la liste des preuves
à conserver et le médiateur compétent lorsqu'il est identifié.

Les fiches d'entreprise sont constituées à partir des registres publics
(Sirene, RNE/INPI, BODACC, annuaire des médiateurs) et croisées avec les
signalements déposés.

---

## Périmètre — ce que la plateforme ne fait pas

Contrainte produit forte, appliquée dans le code, les libellés et les statistiques :

- ne transmet **pas** les réclamations aux professionnels ;
- n'envoie **aucun** courrier à la place du consommateur ;
- ne négocie **pas** le litige ;
- ne recueille **pas** les réponses des professionnels — tout est **déclaré par le consommateur** ;
- ne permet **pas** encore aux professionnels de répondre aux signalements ;
- ne délivre **pas** de conseil juridique personnalisé.

Un signalement est **déclaré** ou **vérifié** (après contrôle manuel d'un
justificatif). Une résolution n'existe qu'après **confirmation explicite du
consommateur**.

## Démarrage

Prérequis : Node 22+, PostgreSQL 14+.

```bash
npm install
cp .env.example .env          # renseigner DATABASE_URL et APP_SECRET
createdb recours_france
npm run db:push
npm run seed                  # compte admin + fiches réelles + données de démonstration
npm run dev                   # http://localhost:3200
```

Le seed crée le compte d'administration `admin@recours-france.fr` /
`recours-france-2026` (à changer immédiatement), importe six fiches réelles
depuis les registres publics et génère des signalements de démonstration
rattachés à des adresses `@example.com`.

Retirer les données de démonstration : `npx tsx prisma/seed.ts --purge-demo`.

## Commandes

| Commande | Rôle |
| --- | --- |
| `npm run dev` | serveur de développement (port 3200) |
| `npm run build` / `npm start` | build et exécution en production |
| `npm run typecheck` | vérification TypeScript |
| `npm run db:push` / `db:migrate` | schéma Prisma |
| `npm run seed` | amorçage |
| `npm run sync` | synchronisation quotidienne des sources publiques |
| `npm run scores` | recalcul quotidien des indices + purge de l'historique à 5 ans |

`npm run sync -- --siren=424059822` cible une entreprise ; `--limite=200` traite
les fiches les plus anciennes en priorité.

## Architecture

```
src/
├── app/
│   ├── page.tsx                          accueil
│   ├── entreprises/                      annuaire, fiche, avis, erreur, revendication, suivi, PDF
│   ├── signaler/                          formulaire une page + confirmation
│   ├── mon-espace/                        accès par email, suivi, récapitulatif PDF, modèle de relance
│   ├── admin/(interne)/                   administration (authentifiée)
│   ├── api/                               recherche, données brutes d'une fiche, lecture des pièces
│   ├── methodologie, aide, pages légales
│   └── globals.css                        système de design complet
├── components/                            chrome, accordéon, formulaires, blocs de fiche
└── lib/
    ├── sources/                           connecteurs des registres publics
    ├── referentiels/                      NAF, catégories juridiques, départements
    ├── scoring.ts, stats.ts               indices et agrégats
    ├── demarches.ts                       guide des démarches et modèle de relance
    ├── pdf.ts                             générateur PDF sans dépendance
    ├── auth.ts, upload.ts, mailer.ts, emails.ts, contenus.ts, format.ts
```

Stack : Next.js 16 (App Router, Server Actions), TypeScript, Prisma,
PostgreSQL. Aucune dépendance UI : le système de design du handoff est
reproduit en CSS natif (`globals.css`), sans arrondi, sans ombre, sans dégradé.

## Sources de données

| Source | Usage | Clé | Fréquence |
| --- | --- | --- | --- |
| API Recherche d'entreprises (DINUM/Insee) | identité, activité, siège, effectifs, dirigeants, comptes agrégés | non | quotidienne |
| API Sirene 3.11 (Insee) | liste complète des établissements, état administratif | `SIRENE_API_KEY` | quotidienne |
| API RNE (INPI) | capital, dirigeants, greffe, actes déposés | `INPI_USERNAME` / `INPI_PASSWORD` | quotidienne |
| BODACC (DILA) | dépôts de comptes, modifications, procédures collectives | non | quotidienne |
| Annuaire des médiateurs (CECMC) | médiateur compétent | non | mensuelle |
| Site officiel de l'entreprise | URL, email et téléphone du SAV, CGV, contact, mention de médiation | non | à la synchronisation |

Sans clé Sirene ni identifiants INPI, la plateforme fonctionne : ces
connecteurs se désactivent proprement et la fiche s'appuie sur les sources
ouvertes. Chaque donnée est stockée avec **sa source et sa date de vérification**
(table `DonneeSource`), affichées sur la fiche et exposées par l'API publique
`/api/entreprises/{siren}`.

## Règles métier codées

1. Un signalement sans justificatif contrôlé est **non vérifié** : il n'entre dans
   aucune statistique de comportement, seulement dans le volume agrégé.
2. Une résolution n'est comptabilisée qu'après **confirmation explicite du
   consommateur**. Abandon ou absence de retour ≠ résolu.
3. Le score d'expérience n'est publié qu'à partir de **30 signalements vérifiés
   sur 12 mois**. En dessous : « Données insuffisantes pour établir un score fiable ».
4. L'indice de transparence ne dépend **que** des données publiques.
5. Les délais publiés sont des **médianes**, jamais des moyennes, sur une base
   glissante de 12 mois.
6. Chaque donnée affichée porte sa **source** et sa date de synchronisation.
7. Aucun texte libre du consommateur n'est publié : les résumés visibles sont
   produits par la plateforme à partir des seules données structurées.
8. Recalcul quotidien des indices, historique conservé 5 ans.
9. Rectification d'une donnée inexacte sous 15 jours ; un signalement vérifié
   n'est pas retiré sur simple demande ni contre paiement.

Barèmes : `src/lib/scoring.ts`. Agrégats : `src/lib/stats.ts`. Ces règles sont
publiées à l'utilisateur sur `/methodologie` — elles sont opposables.

## Données personnelles et sécurité

- Les justificatifs sont écrits dans `storage/justificatifs/` (hors du
  répertoire public, permissions `0600`), jamais servis publiquement, lisibles
  uniquement via `/api/justificatifs/[id]` par un administrateur authentifié, et
  chaque consultation est tracée.
- L'adresse IP n'est jamais stockée en clair : seule une empreinte salée l'est.
- Le consommateur supprime son signalement et ses pièces depuis son espace, sans
  justification.
- Les sessions d'administration sont des cookies `httpOnly` signés, expirant à 8 h ;
  les mots de passe sont hachés en `scrypt`.
- Toute action de modération est enregistrée dans `JournalAction`.

### Envoi d'emails

`MAIL_ENABLED=false` (défaut) : **aucun envoi réel**. Les messages sont écrits
dans `.mail-outbox/` et consultables dans un navigateur. Passer à `true`
nécessite en plus `SMTP_HOST` et `SMTP_USER`. Ne jamais activer l'envoi réel en
développement avec des adresses réelles.

## Avant la mise en production

- [ ] `DEMO_BANNER=false` — retire « Démonstration — données fictives ».
- [ ] `npx tsx prisma/seed.ts --purge-demo` — retire les signalements de démonstration.
- [ ] Changer le mot de passe du compte d'administration.
- [ ] Compléter les mentions légales (éditeur, SIREN, directeur de publication, hébergeur).
- [ ] Générer un `APP_SECRET` propre (`openssl rand -hex 32`).
- [ ] Configurer SMTP et passer `MAIL_ENABLED=true`.
- [ ] Planifier `npm run sync` et `npm run scores` une fois par jour.
- [ ] Faire réaliser l'audit d'accessibilité RGAA et mettre à jour `/accessibilite`.

## Contraintes de marque

Aucun élément du Système de design de l'État, aucune police Marianne, aucun
bloc-marque « République Française ». La charte est originale : cobalt
`#1E4BD2`, Public Sans, aucun arrondi. Le bandeau d'indépendance et la mention
de pied de page sont affichés sur **toutes** les pages.
