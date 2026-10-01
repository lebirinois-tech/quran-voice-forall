# Architecture

- Les trois Mushafs pages utilisent les polices Unicode KFGQPC embarquées correspondant à Hafs, Warsh et Qaloun afin de préserver la géométrie Médine hors ligne.
- Le Mushaf Hafs utilise les coupures Médine officielles mot par mot des 604 pages ; le navigateur ne doit jamais recalculer ces coupures.
- Le coloriage thématique ne peut modifier les coupures de lignes : chaque suite de mots d'un même thème porte un aplat pastel continu et seuls les passages documentés sont colorés.
- Hafs, Warsh et Qaloun partagent le même index local de 6 236 références thématiques dérivé de QSAC CC BY 4.0 et la même palette propre à l’application, car le thème dépend du verset et non de sa graphie.
- Hafs (police KFGQPC) : U+06DF est remplacé par U+0652 à l'affichage, car le glyphe 06DF de cette police est un gros disque noir pleine largeur ; le 0652 de cette police est le petit zéro rond correct.
