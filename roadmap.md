# Feuille de route

## En cours
- Mise à jour intelligente APK/PWA codée et testée (9 tests, Android simulé) : publication du site demandée le 23 octobre 2026 à 22:58 UTC ; APK n° 192 terminé avec succès (contrôle GitHub à 23:01 UTC). Attente : installation initiale sur tablette ; installation Android réelle non vérifiée ici.
- (Terminé 24 octobre 2026) APK généré automatiquement par GitHub à chaque modification du projet ; problème de redirection tablette résolu par l’utilisateur.
- (Terminé 24 octobre 2026) Installation tablette : la redirection vers le site est résolue, l'utilisateur confirme que tout fonctionne.
- (Terminé 22 octobre 2026) APK n° 191 lancé depuis la connexion GitHub du projet et publié dans l'édition « latest » : https://github.com/lebirinois-tech/quran-voice-forall/releases/download/latest/quran-acces-pour-tous.apk

- Corriger uniquement le coloriage Warsh/Qaloun signalé sur les deuxième et quatrième pages d’Al-Baqara ; contrôler les correspondances thématiques sur toutes les sourates, sans toucher à la mise en page.
- Décision prise (choix B) : conserver le rendu actuel de Warsh et Qaloun (15 lignes, Tajweed, coloriage des thèmes, audio, Tafsir) ; les PDF Warsh/Qaloun servent uniquement de référence de contrôle visuel, aucune intégration d'images.
- Terminer le contrôle automatisé des 604 pages de chaque riwaya ; le contrôle complet dépasse actuellement la durée maximale d’une exécution.

## À faire
- Bugs Windows : attente de précisions (quelle page, quel geste, capture).

- Ajouter un choix mémorisé « une page / deux pages côte à côte » dans les trois Mushafs pages, uniquement à partir de la sourate 2 Al-Baqara.

## Fait récemment
- Cartouche décoré du titre de sourate ajouté en mode Versets (Hafs, Warsh, Qaloun), avec plus d'air vertical pour les jambages inférieurs ; 23 tests validés, contrôle visuel Playwright ; site publié et APK n° 196 généré avec succès le 23 octobre 2026 à 23:32 UTC.
- Ouvertures de sourate unifiées dans les trois Mushafs : titre seul sur sa ligne puis Basmala centrée en dessous (Yunus, Hud, An-Nisa, etc.), sans déplacer aucun mot des coupures Médine ; 13 tests validés, contrôle visuel pages 208/221/77, publié le 22 octobre 2026.
- Recherche plein texte dans tout le Coran (page /search, insensible au tachkile et aux formes des lettres), navigation directe vers le verset ; publiée le 16 octobre 2026.
- Hafs : taille de police uniforme sur toutes les pages (même valeur par écran) ; marge de sécurité resserrée (0,995, 40 itérations) pour qu'aucune lettre ne soit coupée au bord.
- Hafs : source Uthmani vérifiée sur 6 236 versets et tous les mots des 604 pages, signes de tanween incompatibles corrigés, signes d’iqlab authentiques conservés (99 mîm bas, 510 mîm haut), cache versionné ; pages 3 et 4 d’Al-Baqara contrôlées en navigateur sur écran d’ordinateur et de téléphone, aucune marque parasite ni signe superposé ; publié le 13 octobre 2026.
- Lecture arabe du Tafsir : sélection explicite d’un صوت عربي avec préférence masculine, pauses et signes vocaliques conservés ; tests et parcours d’écoute vérifiés avec voix simulées. Qualité réelle de la prononciation dépend du moteur vocal installé et reste à valider sur appareil.
- Traduction complète des menus en français, arabe et anglais : en-tête, accueil (installation, modes Versets/Pages, sourate, recherche, Juz, pied de page), écran de bienvenue et cartes des sourates (mecquoise/médinoise, nombre de versets).
- Hafs : découpage officiel du Tafsir موضوعي de محفظ الوحيين (1 277 passages, 103 pour Al-Baqara), couleurs d'origine et titre de chaque passage dans le Tafsir.
- Titres thématiques retirés en vue Versets ; le Tafsir موضوعي réunit tous les versets consécutifs du passage touché, en trois langues et hors connexion.
- Warsh et Qaloun alignés sur Hafs : pages calibrées sur 15 lignes et même index de couleurs en modes Pages et Versets ; police Qaloun officielle aussi en vue Versets.
- Suivi audio allégé : le mot récité est uniquement souligné, sans fond ni surbrillance du verset.
- Découpage plus fin en 1 035 paragraphes de sens sur les 114 sourates, paragraphes voisins toujours de couleurs différentes (Pages et Versets).
- Injection visible du découpage thématique complet en 560 passages : l’index des 6 236 versets est désormais renouvelé avec chaque version, y compris sur les téléphones ayant conservé une ancienne copie ; début d’Al-Baqara séparé en 1–2 puis 3–5 selon la référence validée.
- Découpage thématique complet en 560 passages continus sur les 6 236 versets, partagé par Hafs, Warsh et Qaloun ; le menu et le Tafsir موضوعي affichent désormais le thème exact de l'aplat touché.
- Flèches « page suivante » et « page précédente » rétablies dans la barre inférieure sur les petits écrans.
- Fonds thématiques Hafs regroupés en aplats pastel légers et continus par passage, au lieu d'un rectangle séparé derrière chaque mot ; Tajweed et coupures Médine inchangés.
- Coloriage par paragraphes de sens sur Hafs, Warsh et Qaloun : couleur unique par paragraphe, paragraphes voisins toujours de couleurs différentes.
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

## Open
- [ ] Auto-resume last reading position on app reopen (local, all users) + banner; then publish
- [ ] Mushaf Hafs : afficher les images officielles du Mushaf Tajweed (15 lignes) avec le coloriage thématique actuel superposé

## En cours (24 octobre 2026, 23:50 UTC)
- Conflit de signature APK (« package en conflit avec un package déjà présent ») : clé permanente `signing/quran-acces.keystore` créée et branchée sur le workflow ; l'utilisateur doit désinstaller l'ancienne application de la tablette UNE dernière fois, puis installer le nouvel APK signé ; ensuite les mises à jour passeront par-dessus sans désinstallation.
- Bouton « Aller — اذهب » ajouté à côté de la liste des sourates (la sélection ne naviguait pas sur la tablette) ; vérifié Playwright : choix puis validation ouvre bien la sourate.
