const ipaFileName = 'quran-acces-pour-tous-unsigned.ipa';
const githubRepository =
  import.meta.env.VITE_GITHUB_REPOSITORY || 'lebirinois-tech/quran-voice-forall';

export const ipaDownloadUrl =
  import.meta.env.VITE_IPA_DOWNLOAD_URL ||
  `https://github.com/${githubRepository}/releases/latest/download/${ipaFileName}`;
