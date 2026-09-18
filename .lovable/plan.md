# Corriger la navigation par Juz

## Objectif
Faire en sorte que le choix d’un Juz ouvre systématiquement sa première page correcte dans les trois Mushafs pages : Hafs, Warsh et Qaloun.

## Modifications prévues
- Faire passer la navigation par Juz par le même mécanisme fiable que la navigation directe par numéro de page.
- Retirer le paramètre de verset concurrent de cette navigation : le code actuel envoie simultanément une page et un verset, alors que l’affichage Mushaf doit prendre la page comme référence.
- Conserver le Juz choisi dans le sélecteur et fermer le panneau seulement après le déclenchement de la navigation.
- Réinitialiser proprement la page affichée lors d’un changement de Juz, y compris lorsque deux Juz commencent dans la même sourate.
- Resynchroniser l’audio sur le premier verset de la nouvelle page uniquement si une lecture est déjà en cours.

## Vérification
- Tester les Juz 1, 2, 7, 15, 29 et 30, notamment deux changements successifs au sein d’une même sourate.
- Répéter le contrôle dans les vues pages Hafs, Warsh et Qaloun sur écran mobile.
- Vérifier que le numéro de page, le contenu du Mushaf et la position audio correspondent au Juz sélectionné.

## Détail technique
Le tableau des 30 pages de départ existe déjà. La correction portera sur la transmission et l’application de la page choisie, sans modifier le rendu Tajweed, les couleurs ni la mise en page validée.
