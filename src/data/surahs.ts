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
}

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
