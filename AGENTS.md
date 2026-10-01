# Architecture

- Les trois Mushafs pages utilisent les polices Unicode KFGQPC embarquées correspondant à Hafs, Warsh et Qaloun afin de préserver la géométrie Médine hors ligne.
- Le Mushaf Hafs utilise les coupures Médine officielles mot par mot des 604 pages ; le navigateur ne doit jamais recalculer ces coupures.
- Le coloriage thématique ne peut modifier les coupures de lignes : les fonds suivent le flux en ligne et seuls les passages documentés sont colorés.
- Hafs, Warsh et Qaloun partagent le même index local de 6 236 références thématiques dérivé de QSAC CC BY 4.0 et la même palette propre à l’application, car le thème dépend du verset et non de sa graphie.
