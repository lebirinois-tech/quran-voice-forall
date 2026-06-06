# Mushaf officiel avec surbrillance du verset en lecture

## Objectif

Remplacer (pour Hafs d'abord) le rendu image des pages Mushaf par le **rendu officiel par polices QPC** de l'API Quran.com. Cela permet de **surligner précisément le verset (et même le mot)** en cours de lecture audio — essentiel pour la mémorisation.

## Pourquoi pas de bounding boxes sur les images

L'API Quran.com ne fournit pas de coordonnées (x, y, w, h) par verset pour les **images** scannées des Mushaf. À la place, le projet officiel `quran.com` et l'app mobile utilisent les **polices QPC HAFS** (v1/v2/v4) : chaque page = une police dédiée, chaque mot = un glyphe (`code_v1` / `code_v2`). Le mushaf est donc **rendu côté client**, ce qui rend la surbrillance triviale (c'est juste du texte stylé).

C'est l'approche **officielle Quran.com** (open source).

## Portée

- ✅ **Hafs** : rendu QPC v2 + surbrillance verset en cours + scroll auto vers le verset
- ⏸️ **Warsh / Qalun** : pas couverts par les polices QPC officielles → on **garde le rendu image actuel** avec la bande de versets améliorée déjà en place
- ✅ Conserver swipe gauche/droite pour changer de page
- ✅ Conserver clic sur un verset pour le lire

## Étapes techniques

1. **Récupération données page** (cache localStorage par page) :
   - `GET https://api.quran.com/api/v4/verses/by_page/{page}?words=true&word_fields=code_v2,line_number,page_number,position&per_page=300`
   - Retourne tous les versets de la page avec mots + glyphes + n° de ligne

2. **Polices QPC v2** :
   - 604 fichiers `p1.woff2` … `p604.woff2` hébergés sur `https://quran-com.s3.amazonaws.com/fonts/quran/hafs/v2/woff2/p{N}.woff2` (CDN officiel Quran.com)
   - Chargement à la demande via `FontFace` API, mise en cache navigateur

3. **Nouveau composant** `MushafPageRenderer.tsx` :
   - Pour chaque ligne (1–15) : afficher les mots dans l'ordre RTL avec `font-family: "p{N}"`
   - Grouper les mots par verset → wrapper `<span data-verse="N">` cliquable
   - Centrer les Basmala et titres de sourate (ligne 1 contient parfois un en-tête)

4. **Surbrillance** :
   - Quand `currentVerse` change, ajouter `bg-primary/20 ring-2 ring-primary` sur le span du verset
   - `scrollIntoView({ block: 'center' })` pour suivre la lecture

5. **Branchement dans `MushafPageViewer`** :
   - Si `mushafType === 'hafs'` → afficher `MushafPageRenderer` à la place de l'image
   - Sinon → image actuelle (Warsh / Qalun inchangés)

## Limites connues

- La police QPC v2 n'inclut **pas** les couleurs Tajweed (texte noir uniforme). Si tu veux le Tajweed coloré du Mushaf Hafs, on doit garder les images (pas de surbrillance possible) **ou** appliquer Tajweed via l'API Tajweed déjà utilisée en mode versets, mais le résultat visuel diffèrera des images Médine.
- Première ouverture d'une page = téléchargement de ~50 Ko de police (rapide, mis en cache ensuite).
- Hors-ligne : les pages déjà visitées resteront accessibles (cache navigateur + localStorage des données API).

## Question pour toi

Pour le Mushaf **Hafs** rendu officiel, tu préfères :

- **A.** Texte noir style Mushaf Médine officiel (le plus fidèle, mais pas de couleurs Tajweed)
- **B.** Texte avec couleurs Tajweed automatiques (lisible pour la mémorisation, mais s'éloigne du visuel image actuel)

Et confirme : on commence par **Hafs uniquement** (Warsh/Qalun gardent le rendu image avec la bande de versets) ?
