# Traductions et Tafsir dans les Mushafs pages

## Résultat attendu
- Conserver la page arabe Tajweed actuelle, ses couleurs thématiques et ses titres.
- Au toucher d’un verset, ouvrir une fenêtre assortie au Mushaf sans quitter la page.
- Afficher le verset arabe, sa traduction et son Tafsir dans les trois langues : arabe, français et anglais.
- Appliquer exactement le même fonctionnement aux pages Hafs, Warsh et Qaloun, y compris aux versets d’une sourate voisine présents sur la page.

## Interface
- Ajouter une action unique « Traduction et Tafsir » dans le menu du verset.
- Présenter trois onglets de langue clairs : العربية, Français, English.
- Garder le numéro du verset, la couleur de son thème et une mise en page lisible sur mobile.
- Charger les contenus déjà intégrés à l’application en priorité pour fonctionner hors connexion.

## Détails techniques
- Créer une vue dédiée au verset qui charge les données par numéro de sourate et de verset.
- Réutiliser les fichiers hors connexion existants pour les Tafsirs arabe, français et anglais.
- Utiliser la traduction française embarquée et le texte arabe de la page ; conserver un repli fiable pour l’anglais.
- Corriger l’ouverture des détails pour les versets des sourates voisines, pas seulement la sourate principale.
- Vérifier sur mobile les trois Mushafs et contrôler l’absence de débordement.
