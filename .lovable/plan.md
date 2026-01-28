
# Plan : Remplacer le Tajweed par le texte arabe simple

## Problème identifié

L'API `quran-tajweed` retourne un format propriétaire avec des crochets qui ne s'affiche pas correctement :

```
بِسْمِ [h:1[ٱ]للَّهِ [h:2[ٱ][l[ل]رَّحْمَ[n[ـٰ]نِ
```

Ce format n'est pas du HTML standard et le parsing est complexe et peu fiable.

## Solution retenue

Remplacer l'édition `quran-tajweed` par `ar.alafasy` qui retourne du texte arabe pur et propre, sans balisage spécial.

## Modifications prévues

### 1. `src/hooks/useQuranData.ts`

Changer l'appel API :
- **Avant** : `https://api.alquran.cloud/v1/surah/{n}/quran-tajweed`
- **Après** : `https://api.alquran.cloud/v1/surah/{n}/ar.alafasy`

Cette édition retourne le texte arabe standard utilisé par le récitateur Al-Afasy.

### 2. `src/components/VerseCard.tsx`

Remplacer le rendu HTML par du texte simple :
- **Avant** : `dangerouslySetInnerHTML={{ __html: verse.text }}`
- **Après** : `{verse.text}` (texte direct)

### 3. `src/index.css`

Supprimer les styles Tajweed inutilisés (optionnel, nettoyage) :
- Retirer les classes `.ham_wasl`, `.slnt`, `.ghunnah`, etc.
- Garder uniquement le style de base `.tajweed-text` pour la police arabe

## Détails techniques

### Flux simplifié

```
API ar.alafasy
      │
      ▼
Texte arabe pur
"بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ"
      │
      ▼
Rendu direct {verse.text}
      │
      ▼
Affichage propre ✓
```

### Fichiers modifiés

| Fichier | Modification |
|---------|--------------|
| `src/hooks/useQuranData.ts` | Changer l'édition API de `quran-tajweed` vers `ar.alafasy` |
| `src/components/VerseCard.tsx` | Remplacer `dangerouslySetInnerHTML` par affichage texte direct |
| `src/index.css` | Supprimer les classes CSS Tajweed inutilisées (nettoyage) |

## Avantages de cette solution

- **Fiabilité** : Texte arabe standard, pas de parsing complexe
- **Performance** : Moins de traitement côté client
- **Lisibilité** : Affichage propre et uniforme
- **Maintenance** : Code plus simple à maintenir

## Alternative future (optionnelle)

Si le Tajweed coloré est souhaité ultérieurement, une option serait d'utiliser une bibliothèque spécialisée ou une police de caractères Tajweed intégrée (comme KFGQPC Uthmanic Script) qui inclut les couleurs directement dans la police.
