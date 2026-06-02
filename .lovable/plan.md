## Objectif

Réparer le lien de téléchargement de l'APK (404) en utilisant le dépôt GitHub confirmé : `lebirinois/quran-acces-pour-tous`.

## Cause du 404

`VITE_GITHUB_REPOSITORY` n'est défini que pendant le build GitHub Actions. En preview/prod Lovable, la variable est absente et le lien retombe sur le placeholder `OWNER/REPO`, d'où le 404.

## Changement

**`src/lib/apkDownload.ts`** — remplacer le fallback `OWNER/REPO` par le vrai dépôt :

```ts
const apkFileName = 'quran-acces-pour-tous.apk';
const githubRepository =
  import.meta.env.VITE_GITHUB_REPOSITORY || 'lebirinois/quran-acces-pour-tous';

export const apkDownloadUrl =
  import.meta.env.VITE_APK_DOWNLOAD_URL ||
  `https://github.com/${githubRepository}/releases/latest/download/${apkFileName}`;
```

Aucun autre fichier à modifier. Le workflow GitHub Actions continue de fonctionner (la variable d'env override le fallback si présente).

## Pré-requis côté GitHub

Pour que le lien fonctionne réellement, il faut qu'une release `latest` existe sur `https://github.com/lebirinois/quran-acces-pour-tous/releases` avec le fichier `quran-acces-pour-tous.apk`. Le workflow `.github/workflows/build-apk.yml` la crée automatiquement à chaque push sur `main`. Si aucune release n'apparaît encore :

1. Vérifier que le repo s'appelle bien `quran-acces-pour-tous` (sinon je corrige le nom).
2. Aller dans l'onglet **Actions** du repo et vérifier que le workflow « Build Android APK » s'est exécuté avec succès.
3. Au besoin, relancer le workflow manuellement (Run workflow).

## Vérification après implémentation

Ouvrir la page `/install` et cliquer « Télécharger l'APK Android » → l'URL doit pointer vers `https://github.com/lebirinois/quran-acces-pour-tous/releases/latest/download/quran-acces-pour-tous.apk` et déclencher le téléchargement.
