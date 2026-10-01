# Feuille de route

## En cours
- Décision prise (choix B) : conserver le rendu actuel de Warsh et Qaloun (15 lignes, Tajweed, coloriage des thèmes, audio, Tafsir) ; les PDF Warsh/Qaloun servent uniquement de référence de contrôle visuel, aucune intégration d'images.
- Générer l’APK Android avec les trois Mushafs validés en 15 lignes et le rendre téléchargeable (lancement du workflow GitHub Actions par l’utilisatrice).
- Terminer le contrôle automatisé des 604 pages de chaque riwaya ; le contrôle complet dépasse actuellement la durée maximale d’une exécution.

## À faire

- Ajouter un choix mémorisé « une page / deux pages côte à côte » dans les trois Mushafs pages, uniquement à partir de la sourate 2 Al-Baqara.

## Fait récemment
- Texte intégral rétabli et lignes de mots regroupées ; les petits zéros défectueux restent dans le texte mais deviennent transparents sur Android, sans supprimer de caractères.
- Suppression à l’affichage des petits zéros coraniques que certaines polices mobiles transformaient en gros cercles noirs dispersés dans les versets, sur les trois Mushafs.
- Coloriage par paragraphes de sens (558 rukû‘ traditionnels) sur Hafs, Warsh et Qaloun : couleur unique par paragraphe, paragraphes voisins toujours de couleurs différentes.
- Remplacement des points noirs de fin de verset par des médaillons Médine lisibles sur Hafs, Warsh et Qaloun, sans modifier les lignes ni les fonds thématiques.
- Coloriage thématique complet unifié sur Hafs, Warsh et Qaloun avec le même index verset et la palette propre à l’application.
- Classification thématique complète des 6 236 versets Hafs reliée aux 604 pages Médine, avec la palette pastel propre à l’application.
- Calibrage réinitialisé et recalculé avec la fonte propre à chaque lecture : Hafs, Warsh et Qaloun visent tous exactement 15 lignes.
- Répartition stabilisée sur 15 lignes visibles dans les pages représentatives contrôlées, avec les polices Médine embarquées propres à Hafs, Warsh et Qaloun ; aucun débordement n’y est visible.
- Suppression des couleurs thématiques approximatives appliquées par défaut à une sourate entière : seuls les passages documentés sont colorés.
- Titres thématiques retirés des trois Mushafs pour ne conserver que les aplats de couleur lorsque l’intitulé n’est pas fiable.
- Présentation du texte des trois Mushafs alignée sur la référence محفظ الوحيين : lignes équilibrées sur toute la largeur et aplats pastel continus sans ligne vide.
- Vue Mushaf épurée : numéro de page centré et cliquable, champs « Go » et titre intérieur retirés, texte coranique agrandi et recentré.
- Suppression de la justification forcée et des grands vides entre les mots dans les titres et les versets, sur les trois Mushafs pages.
- Coloriage thématique des trois Mushafs rapproché de محفظ الوحيين : blocs pastel continus sans titre incertain, Tajweed préservé.
- Validation sur téléphone réel : Hafs, Warsh et Qaloun s’affichent maintenant en 15 lignes.
- Publication de la correction de mise en page après validation mobile.
- Suppression du centrage vertical qui tassait les versets au milieu du cadre ; contenu ancré en haut et interligne borné.
- Pages Hafs, Warsh et Qaloun harmonisées sur le rythme visuel du Mushaf de Médine à 15 lignes, avec ajustement automatique sans débordement.
- Fonds du Tafsir thématique rapprochés du modèle Al Muhafez : aplats pastel continus, sans coupure blanche, sur Hafs, Warsh et Qaloun.
- Traduction et Tafsir trilingues au toucher d’un verset dans les trois Mushafs pages, contenus hors connexion inclus.
- Coloriage thématique harmonisé sur les trois Mushafs selon le principe visuel de محفظ الوحيين : fonds clairs continus et titre arabe au début de chaque thème.
- Purge du cache étendue aux trois Mushafs (Hafs, Warsh, Qalun) — version unique `MUSHAF_PAGES_VERSION` v10.
- Workflows GitHub : déclenchement manuel uniquement (plus d'e-mails d'échec à chaque modification).
- Android : SDK 35 au lieu de 36, copie de l'APK sécurisée. iOS : sélection automatique du Xcode disponible.
