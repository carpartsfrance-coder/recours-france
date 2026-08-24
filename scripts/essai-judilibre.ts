/**
 * Vérification de l'extraction des parties, sans appeler l'API.
 *
 * Le texte d'essai est celui d'une décision réelle — TJ Draguignan, 6 août
 * 2026, n° 26/03698 — choisie parce qu'elle contient le piège : une société
 * défenderesse dans l'en-tête, et trois autres citées dans l'exposé du litige.
 * Rattacher ces trois-là reviendrait à publier « poursuivie » sur des sociétés
 * qui ne sont pas parties à l'instance.
 */
import { partiesMorales, rapprocher, normaliserDenomination, sirenValide, type DecisionJudilibre, type Candidat } from "../src/lib/sources/judilibre";

const TEXTE = `T R I B U N A L J U D I C I A I R E
D E D R A G U I G N A N
____________

O R D O N N A N C E D E R E F E R E

REFERE n° : N° RG 26/03698 - N° Portalis DB3D-W-B7K-LETX

MINUTE n° : 2026/ 347

DATE : 06 Août 2026

PRESIDENT : Madame Alexandra MATTIOLI

GREFFIER : M. Alexandre JACQUOT

DEMANDEUR

Monsieur [N] [U], demeurant [Adresse 1]
représenté par Me Jérôme BRUNET-DEBAINES, avocat au barreau de [V]

DEFENDERESSE

S.A.S. AUTO SERVICE VAROIS AS 83, dont le siège social est sis [Adresse 2]
non comparante

DEBATS : Après avoir entendu à l'audience du 24 Juin 2026 les parties comparantes ou leurs conseils, l'ordonnance a été rendue ce jour.

EXPOSE DU LITIGE

Par ordonnance en date du 11 décembre 2024 le Juge des référés du Tribunal judiciaire de [V], saisi par Monsieur [N] [U] au contradictoire de la S.A.R.L. GARAGE TIB AUTO 83, la S.A.R.L. DISTRIMOTOR, et de la société MRT SALES, a ordonné une expertise du véhicule.`;

const FIN_ENTETE = TEXTE.indexOf("DEBATS :");

const d: DecisionJudilibre = {
  id: "6a74dc83195da062e0ceb075",
  juridiction: "tj", chambre: null, numero: "26/03698", ecli: null,
  date: new Date("2026-08-06"), solution: null,
  solutionLibelle: "Autres mesures ordonnées en référé", nac: null,
  texte: TEXTE,
  zones: { introduction: [{ start: 0, end: FIN_ENTETE }] },
};

let echecs = 0;
const verifier = (intitule: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "✓" : "✗"} ${intitule}${detail ? ` — ${detail}` : ""}`);
  if (!ok) echecs++;
};

const parties = partiesMorales(d);
console.log("Parties extraites :", parties.map((p) => `${p.forme} ${p.denomination} (${p.role})`), "\n");

verifier("une seule partie morale retenue", parties.length === 1, `${parties.length} trouvée(s)`);
verifier("c'est la défenderesse de l'en-tête", parties[0]?.denomination === "AUTO SERVICE VAROIS AS 83");
verifier("son rôle est correct", parties[0]?.role === "defendeur");
verifier("sa forme est normalisée", parties[0]?.forme === "SAS");

for (const tiers of ["GARAGE TIB AUTO 83", "DISTRIMOTOR", "MRT SALES"]) {
  verifier(`« ${tiers} », cité dans l'exposé, n'est pas rattaché`,
    !parties.some((p) => p.denomination.includes(tiers)));
}

console.log();
const partie = parties[0];
if (partie) {
  const seul: Candidat[] = [{ id: "a", siren: "454066481", denomination: "AUTO SERVICE VAROIS AS 83", formeJuridique: "SAS" }];
  verifier("candidat unique : rapproché", rapprocher(partie, seul)?.siren === "454066481");

  const homonymes: Candidat[] = [
    ...seul,
    { id: "b", siren: "999999999", denomination: "Auto Service Varois AS 83", formeJuridique: "SAS" },
  ];
  verifier("deux homonymes de même forme : on renonce", rapprocher(partie, homonymes) === null);

  const formesDifferentes: Candidat[] = [
    ...seul,
    { id: "c", siren: "888888888", denomination: "AUTO-SERVICE VAROIS AS 83", formeJuridique: "SARL" },
  ];
  verifier("la forme juridique départage", rapprocher(partie, formesDifferentes)?.siren === "454066481");

  verifier("aucun candidat : rien", rapprocher(partie, []) === null);
  verifier("nom voisin mais différent : rien",
    rapprocher(partie, [{ id: "d", siren: "777777777", denomination: "AUTO SERVICE VAROIS", formeJuridique: "SAS" }]) === null);
}

{
  // L'en-tête accentué d'Annecy, tel qu'il est réellement rédigé : le titre
  // « DÉFENDERESSES » doit être reconnu malgré l'accent, sans quoi le rôle
  // du bloc précédent — demandeur — s'applique à la partie qui se défend.
  const texteAccentue = `DEMANDEUR
Monsieur [D] [V]
représenté par Maître Christophe TRABBIA, avocat

DÉFENDERESSES

Société ANP (AUTO NET PROTECH),
immatriculée au RCS de [Localité 2] sous le numéro 927 453 555,

Société DISTRIMOTOR,
immatriculée au RCS d'[Localité 3] sous le numéro B 432 892 412`;
  const dA: DecisionJudilibre = {
    id: "essai-accents", juridiction: "tj", chambre: null, numero: "26/00166",
    ecli: null, date: new Date("2026-05-18"), solution: null, solutionLibelle: null,
    nac: null, texte: texteAccentue,
    zones: { introduction: [{ start: 0, end: texteAccentue.length }] },
  };
  const pA = partiesMorales(dA);
  const distri = pA.find((x) => /DISTRIMOTOR/.test(x.denomination));
  verifier("« DÉFENDERESSES » accentué est reconnu comme un titre", pA.every((x) => x.role === "defendeur"),
    pA.map((x) => `${x.denomination}:${x.role}`).join(", "));
  verifier("DISTRIMOTOR y est défenderesse, avec son SIREN", distri?.role === "defendeur" && distri?.siren === "432892412");
}

console.log();
verifier("clé de Luhn : un vrai SIREN passe", sirenValide("432892412"));
verifier("clé de Luhn : un numéro de RG ne passe pas", !sirenValide("260369800"));
verifier("clé de Luhn : refuse ce qui n'a pas neuf chiffres", !sirenValide("4328924"));

{
  // Le SIREN doit primer sur le nom, y compris quand deux homonymes existent.
  const avecSiren = { denomination: "AUTO SERVICE VAROIS AS 83", forme: "SAS", role: "defendeur" as const, siren: "454066481" };
  const deux: Candidat[] = [
    { id: "a", siren: "454066481", denomination: "AUTO SERVICE VAROIS AS 83", formeJuridique: "SAS" },
    { id: "b", siren: "999999999", denomination: "AUTO SERVICE VAROIS AS 83", formeJuridique: "SAS" },
  ];
  verifier("le SIREN tranche là où le nom renonçait", rapprocher(avecSiren, deux)?.siren === "454066481");

  const siretInconnu = { ...avecSiren, siren: "000000000" };
  verifier("SIREN absent du référentiel : on retombe sur le nom, donc on renonce",
    rapprocher(siretInconnu, deux) === null);
}

console.log();
verifier("la normalisation ignore forme, casse et ponctuation",
  normaliserDenomination("S.A.R.L. Garage TIB-Auto 83") === normaliserDenomination("SARL GARAGE TIB AUTO 83"),
  normaliserDenomination("S.A.R.L. Garage TIB-Auto 83"));
verifier("la normalisation ignore les accents",
  normaliserDenomination("Société Générale de Réparation") === "SOCIETE GENERALE DE REPARATION");

console.log(`\n${echecs === 0 ? "Tout passe." : `${echecs} échec(s).`}`);
process.exit(echecs === 0 ? 0 : 1);
