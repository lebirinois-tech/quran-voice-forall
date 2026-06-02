const apkFileName = 'quran-acces-pour-tous.apk';
const githubRepository =
  import.meta.env.VITE_GITHUB_REPOSITORY || 'lebirinois-tech/quran-voice-forall';

export const apkDownloadUrl =
  import.meta.env.VITE_APK_DOWNLOAD_URL ||
  `https://github.com/${githubRepository}/releases/latest/download/${apkFileName}`;