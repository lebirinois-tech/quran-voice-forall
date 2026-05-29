const apkFileName = 'quran-acces-pour-tous.apk';
const githubRepository = import.meta.env.VITE_GITHUB_REPOSITORY;

export const apkDownloadUrl =
  import.meta.env.VITE_APK_DOWNLOAD_URL ||
  (githubRepository
    ? `https://github.com/${githubRepository}/releases/latest/download/${apkFileName}`
    : `https://github.com/OWNER/REPO/releases/latest/download/${apkFileName}`);