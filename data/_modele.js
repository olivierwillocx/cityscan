// LAB MR — MODELE de fichier de livraison hebdomadaire.
// Copier ce fichier sous le nom data/AAAA-MM-JJ.js, le remplir, puis ajouter la ligne
//     <script src="data/AAAA-MM-JJ.js"></script>
// dans index.html. Ce fichier-ci n'est PAS charge par le site : c'est une reference.

LABMR.editions.push(
{
 "id": "2026-09-28",                                  // identifiant de la livraison = sa date
 "periode":      { "fr": "Semaine du 21 au 28 septembre 2026", "nl": "Week van 21 tot 28 september 2026" },
 "production":   { "fr": "28 septembre 2026",                  "nl": "28 september 2026" },
 "top3":         { "fr": "Paragraphe de synthese designant les trois initiatives les plus interessantes pour Bruxelles et pourquoi.", "nl": "..." },
 "methode":      { "fr": "Comment la veille a ete faite cette semaine, et ses limites.", "nl": "..." },
 "sansResultat": { "fr": "Matieres dans lesquelles rien de solide n a ete trouve cette semaine.", "nl": "..." },
 "aSuivre":      { "fr": ["Initiative annoncee, date attendue.", "Autre."], "nl": ["...", "..."] },
 "doutes":       { "fr": ["Doute residuel a signaler plutot qu a taire."], "nl": ["..."] }
}
);

LABMR.fiches.push(
{
 "id": "2026-09-28-01",          // unique dans tout le site : date de la livraison + numero
 "edition": "2026-09-28",        // l identifiant de l edition ci-dessus
 "inst": "Région",               // "Région" | "COCOM" | "COCOF" | "COCOM / COCOF"  (institution BRUXELLOISE)
 "verdict": "best",              // "best" bonne pratique | "bad" mauvaise pratique | "watch" a evaluer
 "transpo": "forte",             // "forte" | "moyenne" | "faible"
 "dateISO": "2026-09-24",        // date de la decision ou de la publication
 "villeKey": "Copenhague",       // nom court en francais, orthographe constante d une fiche a l autre
 "pays": "DK",                   // code a deux lettres majuscules
 "theme":   { "fr": "Mobilité — stationnement", "nl": "Mobiliteit — parkeren" },
 "matiere": { "key": "mobilite", "fr": "Mobilité", "nl": "Mobiliteit" },
 // Les quatorze valeurs possibles de "matiere", a reprendre au caractere pres :
 //  {"key":"mobilite","fr":"Mobilité","nl":"Mobiliteit"}
 //  {"key":"logement","fr":"Logement","nl":"Huisvesting"}
 //  {"key":"urbanisme","fr":"Urbanisme et espace public","nl":"Stedenbouw en openbare ruimte"}
 //  {"key":"environnement","fr":"Environnement et énergie","nl":"Leefmilieu en energie"}
 //  {"key":"proprete","fr":"Propreté et déchets","nl":"Netheid en afval"}
 //  {"key":"economie","fr":"Économie et tourisme","nl":"Economie en toerisme"}
 //  {"key":"securite","fr":"Sécurité et prévention","nl":"Veiligheid en preventie"}
 //  {"key":"gouvernance","fr":"Gouvernance et digitalisation","nl":"Bestuur en digitalisering"}
 //  {"key":"fiscalite","fr":"Fiscalité et finances","nl":"Fiscaliteit en financiën"}
 //  {"key":"sante","fr":"Santé","nl":"Gezondheid"}
 //  {"key":"aide","fr":"Aide aux personnes","nl":"Bijstand aan personen"}
 //  {"key":"formation","fr":"Formation et cohésion sociale","nl":"Opleiding en sociale cohesie"}
 //  {"key":"culture","fr":"Culture, sport et écoles","nl":"Cultuur, sport en scholen"}
 //  {"key":"resilience","fr":"Résilience et gestion de crise","nl":"Veerkracht en crisisbeheer"}
 //      (themes : "Résilience — inondations", "Résilience — pandémie", "Résilience — guerre et protection civile")
 "titre":           { "fr": "La mesure en une ligne.", "nl": "..." },
 "ville":           { "fr": "Copenhague — Danemark, commune (Københavns Kommune)", "nl": "Kopenhagen — Denemarken, gemeente (Københavns Kommune)" },
 "date":            { "fr": "24 septembre 2026 (décision du conseil municipal)", "nl": "24 september 2026 (beslissing van de gemeenteraad)" },
 "competence":      { "fr": "Région — mobilité (stationnement) ; ministre de la Mobilité", "nl": "Gewest — mobiliteit (parkeren); minister van Mobiliteit" },
 "quoi":            { "fr": "Quatre a six lignes factuelles : le probleme, la mesure, le calendrier, le budget.", "nl": "..." },
 "resultats":       { "fr": "Chiffres attribues a leur source, ou « pas encore de résultats publiés ». Signaler un chiffre conteste ou issu de la seule ville.", "nl": "..." },
 "transposabilite": { "fr": "Trois a cinq lignes : ce qui existe deja a Bruxelles, ce qui bloquerait, ce qui serait directement realisable.", "nl": "..." },
 "angle":           { "fr": "Une phrase : la question orale, l interpellation ou la demande d audition qui peut en sortir.", "nl": "..." },
 "sources": [
   { "media": "The Local Denmark", "date": "24/09/2026", "url": "https://exemple.invalid/article" }
 ]
}
// , { fiche suivante } ...
);
