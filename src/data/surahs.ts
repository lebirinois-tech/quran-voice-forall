export interface Surah {
  number: number;
  name: string;
  nameArabic: string;
  englishName: string;
  versesCount: number;
  revelationType: 'Meccan' | 'Medinan';
}

export interface Verse {
  number: number;
  text: string;
  translation: string;
  page?: number;
}

// Page start mapping for each surah (surah number -> starting page)
export const surahPageStart: Record<number, number> = {
  1: 1, 2: 2, 3: 50, 4: 77, 5: 106, 6: 128, 7: 151, 8: 177, 9: 187,
  10: 208, 11: 221, 12: 235, 13: 249, 14: 255, 15: 262, 16: 267,
  17: 282, 18: 293, 19: 305, 20: 312, 21: 322, 22: 332, 23: 342,
  24: 350, 25: 359, 26: 367, 27: 377, 28: 385, 29: 396, 30: 404,
  31: 411, 32: 415, 33: 418, 34: 428, 35: 434, 36: 440, 37: 446,
  38: 453, 39: 458, 40: 467, 41: 477, 42: 483, 43: 489, 44: 496,
  45: 499, 46: 502, 47: 507, 48: 510, 49: 515, 50: 518, 51: 520,
  52: 523, 53: 526, 54: 528, 55: 531, 56: 534, 57: 537, 58: 542,
  59: 545, 60: 549, 61: 551, 62: 553, 63: 554, 64: 556, 65: 558,
  66: 560, 67: 562, 68: 564, 69: 566, 70: 568, 71: 570, 72: 572,
  73: 574, 74: 575, 75: 577, 76: 578, 77: 580, 78: 582, 79: 583,
  80: 585, 81: 586, 82: 587, 83: 588, 84: 589, 85: 590, 86: 591,
  87: 591, 88: 592, 89: 593, 90: 594, 91: 595, 92: 595, 93: 596,
  94: 596, 95: 597, 96: 597, 97: 598, 98: 598, 99: 599, 100: 599,
  101: 600, 102: 600, 103: 601, 104: 601, 105: 601, 106: 602,
  107: 602, 108: 602, 109: 603, 110: 603, 111: 603, 112: 604,
  113: 604, 114: 604,
};

// Calculate approximate page number for a verse
export const getVersePage = (surahNumber: number, verseNumber: number, totalVerses: number): number => {
  const startPage = surahPageStart[surahNumber] || 1;
  const nextSurahStart = surahPageStart[surahNumber + 1] || 605;
  const pagesInSurah = Math.max(1, nextSurahStart - startPage);
  
  // Calculate page based on verse position (0-indexed progress)
  const verseProgress = (verseNumber - 1) / Math.max(1, totalVerses - 1);
  const calculatedPage = Math.floor(startPage + (pagesInSurah * verseProgress));
  
  // Ensure we stay within the surah's page range
  return Math.min(Math.max(calculatedPage, startPage), nextSurahStart - 1);
};

// Juz (part) mapping - each Juz starts at [surahNumber, verseNumber]
export const juzMapping: Record<number, { surah: number; verse: number; name: string }> = {
  1: { surah: 1, verse: 1, name: "Alif Lam Mim" },
  2: { surah: 2, verse: 142, name: "Sayaqul" },
  3: { surah: 2, verse: 253, name: "Tilka ar-Rusul" },
  4: { surah: 3, verse: 93, name: "Lan Tanaloo" },
  5: { surah: 4, verse: 24, name: "Wal Muhsanat" },
  6: { surah: 4, verse: 148, name: "La Yuhibbu Allah" },
  7: { surah: 5, verse: 82, name: "Wa Iza Sami'u" },
  8: { surah: 6, verse: 111, name: "Wa Law Annana" },
  9: { surah: 7, verse: 88, name: "Qal al-Mala" },
  10: { surah: 8, verse: 41, name: "Wa A'lamu" },
  11: { surah: 9, verse: 93, name: "Ya'taziruna" },
  12: { surah: 11, verse: 6, name: "Wa ma min Dabbah" },
  13: { surah: 12, verse: 53, name: "Wa ma Ubarri'u" },
  14: { surah: 15, verse: 1, name: "Alif Lam Ra" },
  15: { surah: 17, verse: 1, name: "Subhana Allazi" },
  16: { surah: 18, verse: 75, name: "Qal Alam" },
  17: { surah: 21, verse: 1, name: "Iqtaraba lin-Nas" },
  18: { surah: 23, verse: 1, name: "Qad Aflaha" },
  19: { surah: 25, verse: 21, name: "Wa Qal Allazina" },
  20: { surah: 27, verse: 56, name: "A'man Khalaqa" },
  21: { surah: 29, verse: 46, name: "Utlu ma Uhiya" },
  22: { surah: 33, verse: 31, name: "Wa man Yaqnut" },
  23: { surah: 36, verse: 28, name: "Wa ma Anzalna" },
  24: { surah: 39, verse: 32, name: "Fa man Azlamu" },
  25: { surah: 41, verse: 47, name: "Ilayhi Yuraddu" },
  26: { surah: 46, verse: 1, name: "Ha Mim" },
  27: { surah: 51, verse: 31, name: "Qala Fama" },
  28: { surah: 58, verse: 1, name: "Qad Sami'a" },
  29: { surah: 67, verse: 1, name: "Tabaraka Allazi" },
  30: { surah: 78, verse: 1, name: "Amma Yatasa'alun" },
};

export const surahs: Surah[] = [
  { number: 1, name: "Al-Fatiha", nameArabic: "الفاتحة", englishName: "The Opening", versesCount: 7, revelationType: "Meccan" },
  { number: 2, name: "Al-Baqarah", nameArabic: "البقرة", englishName: "The Cow", versesCount: 286, revelationType: "Medinan" },
  { number: 3, name: "Aal-Imran", nameArabic: "آل عمران", englishName: "The Family of Imran", versesCount: 200, revelationType: "Medinan" },
  { number: 4, name: "An-Nisa", nameArabic: "النساء", englishName: "The Women", versesCount: 176, revelationType: "Medinan" },
  { number: 5, name: "Al-Ma'idah", nameArabic: "المائدة", englishName: "The Table", versesCount: 120, revelationType: "Medinan" },
  { number: 6, name: "Al-An'am", nameArabic: "الأنعام", englishName: "The Cattle", versesCount: 165, revelationType: "Meccan" },
  { number: 7, name: "Al-A'raf", nameArabic: "الأعراف", englishName: "The Heights", versesCount: 206, revelationType: "Meccan" },
  { number: 8, name: "Al-Anfal", nameArabic: "الأنفال", englishName: "The Spoils of War", versesCount: 75, revelationType: "Medinan" },
  { number: 9, name: "At-Tawbah", nameArabic: "التوبة", englishName: "The Repentance", versesCount: 129, revelationType: "Medinan" },
  { number: 10, name: "Yunus", nameArabic: "يونس", englishName: "Jonah", versesCount: 109, revelationType: "Meccan" },
  { number: 11, name: "Hud", nameArabic: "هود", englishName: "Hud", versesCount: 123, revelationType: "Meccan" },
  { number: 12, name: "Yusuf", nameArabic: "يوسف", englishName: "Joseph", versesCount: 111, revelationType: "Meccan" },
  { number: 36, name: "Ya-Sin", nameArabic: "يس", englishName: "Ya Sin", versesCount: 83, revelationType: "Meccan" },
  { number: 55, name: "Ar-Rahman", nameArabic: "الرحمن", englishName: "The Most Merciful", versesCount: 78, revelationType: "Medinan" },
  { number: 56, name: "Al-Waqi'ah", nameArabic: "الواقعة", englishName: "The Event", versesCount: 96, revelationType: "Meccan" },
  { number: 67, name: "Al-Mulk", nameArabic: "الملك", englishName: "The Kingdom", versesCount: 30, revelationType: "Meccan" },
  { number: 78, name: "An-Naba", nameArabic: "النبأ", englishName: "The News", versesCount: 40, revelationType: "Meccan" },
  { number: 112, name: "Al-Ikhlas", nameArabic: "الإخلاص", englishName: "The Sincerity", versesCount: 4, revelationType: "Meccan" },
  { number: 113, name: "Al-Falaq", nameArabic: "الفلق", englishName: "The Dawn", versesCount: 5, revelationType: "Meccan" },
  { number: 114, name: "An-Nas", nameArabic: "الناس", englishName: "Mankind", versesCount: 6, revelationType: "Meccan" },
];

// Sample verses for Al-Fatiha
export const alFatihaVerses: Verse[] = [
  { number: 1, text: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ", translation: "Au nom d'Allah, le Tout Miséricordieux, le Très Miséricordieux" },
  { number: 2, text: "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ", translation: "Louange à Allah, Seigneur de l'univers" },
  { number: 3, text: "الرَّحْمَٰنِ الرَّحِيمِ", translation: "Le Tout Miséricordieux, le Très Miséricordieux" },
  { number: 4, text: "مَالِكِ يَوْمِ الدِّينِ", translation: "Maître du Jour de la rétribution" },
  { number: 5, text: "إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ", translation: "C'est Toi [Seul] que nous adorons, et c'est Toi [Seul] dont nous implorons secours" },
  { number: 6, text: "اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ", translation: "Guide-nous dans le droit chemin" },
  { number: 7, text: "صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ", translation: "Le chemin de ceux que Tu as comblés de faveurs, non pas de ceux qui ont encouru Ta colère, ni des égarés" },
];

// Sample verses for Al-Ikhlas
export const alIkhlasVerses: Verse[] = [
  { number: 1, text: "قُلْ هُوَ اللَّهُ أَحَدٌ", translation: "Dis: Il est Allah, Unique" },
  { number: 2, text: "اللَّهُ الصَّمَدُ", translation: "Allah, Le Seul à être imploré pour ce que nous désirons" },
  { number: 3, text: "لَمْ يَلِدْ وَلَمْ يُولَدْ", translation: "Il n'a jamais engendré, n'a pas été engendré non plus" },
  { number: 4, text: "وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ", translation: "Et nul n'est égal à Lui" },
];

export const getSurahVerses = (surahNumber: number): Verse[] => {
  switch (surahNumber) {
    case 1:
      return alFatihaVerses;
    case 112:
      return alIkhlasVerses;
    default:
      return alFatihaVerses;
  }
};
