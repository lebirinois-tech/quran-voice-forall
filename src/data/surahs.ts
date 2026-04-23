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

// Reverse mapping: find the first verse on a given page for a surah
export const getFirstVerseOfPage = (surahNumber: number, page: number, totalVerses: number): number => {
  for (let v = 1; v <= totalVerses; v++) {
    if (getVersePage(surahNumber, v, totalVerses) >= page) {
      return v;
    }
  }
  return 1;
};

// Find which Juz (1-30) contains a given (surah, verse)
export const getJuzForVerse = (surahNumber: number, verseNumber: number): number => {
  let currentJuz = 1;
  for (let j = 1; j <= 30; j++) {
    const start = juzMapping[j];
    if (!start) continue;
    if (
      start.surah < surahNumber ||
      (start.surah === surahNumber && start.verse <= verseNumber)
    ) {
      currentJuz = j;
    } else {
      break;
    }
  }
  return currentJuz;
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
  { number: 13, name: "Ar-Ra'd", nameArabic: "الرعد", englishName: "The Thunder", versesCount: 43, revelationType: "Medinan" },
  { number: 14, name: "Ibrahim", nameArabic: "إبراهيم", englishName: "Abraham", versesCount: 52, revelationType: "Meccan" },
  { number: 15, name: "Al-Hijr", nameArabic: "الحجر", englishName: "The Rocky Tract", versesCount: 99, revelationType: "Meccan" },
  { number: 16, name: "An-Nahl", nameArabic: "النحل", englishName: "The Bee", versesCount: 128, revelationType: "Meccan" },
  { number: 17, name: "Al-Isra", nameArabic: "الإسراء", englishName: "The Night Journey", versesCount: 111, revelationType: "Meccan" },
  { number: 18, name: "Al-Kahf", nameArabic: "الكهف", englishName: "The Cave", versesCount: 110, revelationType: "Meccan" },
  { number: 19, name: "Maryam", nameArabic: "مريم", englishName: "Mary", versesCount: 98, revelationType: "Meccan" },
  { number: 20, name: "Ta-Ha", nameArabic: "طه", englishName: "Ta-Ha", versesCount: 135, revelationType: "Meccan" },
  { number: 21, name: "Al-Anbiya", nameArabic: "الأنبياء", englishName: "The Prophets", versesCount: 112, revelationType: "Meccan" },
  { number: 22, name: "Al-Hajj", nameArabic: "الحج", englishName: "The Pilgrimage", versesCount: 78, revelationType: "Medinan" },
  { number: 23, name: "Al-Mu'minun", nameArabic: "المؤمنون", englishName: "The Believers", versesCount: 118, revelationType: "Meccan" },
  { number: 24, name: "An-Nur", nameArabic: "النور", englishName: "The Light", versesCount: 64, revelationType: "Medinan" },
  { number: 25, name: "Al-Furqan", nameArabic: "الفرقان", englishName: "The Criterion", versesCount: 77, revelationType: "Meccan" },
  { number: 26, name: "Ash-Shu'ara", nameArabic: "الشعراء", englishName: "The Poets", versesCount: 227, revelationType: "Meccan" },
  { number: 27, name: "An-Naml", nameArabic: "النمل", englishName: "The Ant", versesCount: 93, revelationType: "Meccan" },
  { number: 28, name: "Al-Qasas", nameArabic: "القصص", englishName: "The Stories", versesCount: 88, revelationType: "Meccan" },
  { number: 29, name: "Al-Ankabut", nameArabic: "العنكبوت", englishName: "The Spider", versesCount: 69, revelationType: "Meccan" },
  { number: 30, name: "Ar-Rum", nameArabic: "الروم", englishName: "The Romans", versesCount: 60, revelationType: "Meccan" },
  { number: 31, name: "Luqman", nameArabic: "لقمان", englishName: "Luqman", versesCount: 34, revelationType: "Meccan" },
  { number: 32, name: "As-Sajdah", nameArabic: "السجدة", englishName: "The Prostration", versesCount: 30, revelationType: "Meccan" },
  { number: 33, name: "Al-Ahzab", nameArabic: "الأحزاب", englishName: "The Combined Forces", versesCount: 73, revelationType: "Medinan" },
  { number: 34, name: "Saba", nameArabic: "سبأ", englishName: "Sheba", versesCount: 54, revelationType: "Meccan" },
  { number: 35, name: "Fatir", nameArabic: "فاطر", englishName: "The Originator", versesCount: 45, revelationType: "Meccan" },
  { number: 36, name: "Ya-Sin", nameArabic: "يس", englishName: "Ya Sin", versesCount: 83, revelationType: "Meccan" },
  { number: 37, name: "As-Saffat", nameArabic: "الصافات", englishName: "Those Ranged in Ranks", versesCount: 182, revelationType: "Meccan" },
  { number: 38, name: "Sad", nameArabic: "ص", englishName: "Sad", versesCount: 88, revelationType: "Meccan" },
  { number: 39, name: "Az-Zumar", nameArabic: "الزمر", englishName: "The Groups", versesCount: 75, revelationType: "Meccan" },
  { number: 40, name: "Ghafir", nameArabic: "غافر", englishName: "The Forgiver", versesCount: 85, revelationType: "Meccan" },
  { number: 41, name: "Fussilat", nameArabic: "فصلت", englishName: "Explained in Detail", versesCount: 54, revelationType: "Meccan" },
  { number: 42, name: "Ash-Shura", nameArabic: "الشورى", englishName: "The Consultation", versesCount: 53, revelationType: "Meccan" },
  { number: 43, name: "Az-Zukhruf", nameArabic: "الزخرف", englishName: "The Gold Adornments", versesCount: 89, revelationType: "Meccan" },
  { number: 44, name: "Ad-Dukhan", nameArabic: "الدخان", englishName: "The Smoke", versesCount: 59, revelationType: "Meccan" },
  { number: 45, name: "Al-Jathiyah", nameArabic: "الجاثية", englishName: "The Kneeling", versesCount: 37, revelationType: "Meccan" },
  { number: 46, name: "Al-Ahqaf", nameArabic: "الأحقاف", englishName: "The Wind-curved Sandhills", versesCount: 35, revelationType: "Meccan" },
  { number: 47, name: "Muhammad", nameArabic: "محمد", englishName: "Muhammad", versesCount: 38, revelationType: "Medinan" },
  { number: 48, name: "Al-Fath", nameArabic: "الفتح", englishName: "The Victory", versesCount: 29, revelationType: "Medinan" },
  { number: 49, name: "Al-Hujurat", nameArabic: "الحجرات", englishName: "The Rooms", versesCount: 18, revelationType: "Medinan" },
  { number: 50, name: "Qaf", nameArabic: "ق", englishName: "Qaf", versesCount: 45, revelationType: "Meccan" },
  { number: 51, name: "Adh-Dhariyat", nameArabic: "الذاريات", englishName: "The Winnowing Winds", versesCount: 60, revelationType: "Meccan" },
  { number: 52, name: "At-Tur", nameArabic: "الطور", englishName: "The Mount", versesCount: 49, revelationType: "Meccan" },
  { number: 53, name: "An-Najm", nameArabic: "النجم", englishName: "The Star", versesCount: 62, revelationType: "Meccan" },
  { number: 54, name: "Al-Qamar", nameArabic: "القمر", englishName: "The Moon", versesCount: 55, revelationType: "Meccan" },
  { number: 55, name: "Ar-Rahman", nameArabic: "الرحمن", englishName: "The Most Merciful", versesCount: 78, revelationType: "Medinan" },
  { number: 56, name: "Al-Waqi'ah", nameArabic: "الواقعة", englishName: "The Event", versesCount: 96, revelationType: "Meccan" },
  { number: 57, name: "Al-Hadid", nameArabic: "الحديد", englishName: "The Iron", versesCount: 29, revelationType: "Medinan" },
  { number: 58, name: "Al-Mujadila", nameArabic: "المجادلة", englishName: "The Pleading Woman", versesCount: 22, revelationType: "Medinan" },
  { number: 59, name: "Al-Hashr", nameArabic: "الحشر", englishName: "The Exile", versesCount: 24, revelationType: "Medinan" },
  { number: 60, name: "Al-Mumtahanah", nameArabic: "الممتحنة", englishName: "She That is to be Examined", versesCount: 13, revelationType: "Medinan" },
  { number: 61, name: "As-Saff", nameArabic: "الصف", englishName: "The Ranks", versesCount: 14, revelationType: "Medinan" },
  { number: 62, name: "Al-Jumu'ah", nameArabic: "الجمعة", englishName: "Friday", versesCount: 11, revelationType: "Medinan" },
  { number: 63, name: "Al-Munafiqun", nameArabic: "المنافقون", englishName: "The Hypocrites", versesCount: 11, revelationType: "Medinan" },
  { number: 64, name: "At-Taghabun", nameArabic: "التغابن", englishName: "The Mutual Disillusion", versesCount: 18, revelationType: "Medinan" },
  { number: 65, name: "At-Talaq", nameArabic: "الطلاق", englishName: "The Divorce", versesCount: 12, revelationType: "Medinan" },
  { number: 66, name: "At-Tahrim", nameArabic: "التحريم", englishName: "The Prohibition", versesCount: 12, revelationType: "Medinan" },
  { number: 67, name: "Al-Mulk", nameArabic: "الملك", englishName: "The Kingdom", versesCount: 30, revelationType: "Meccan" },
  { number: 68, name: "Al-Qalam", nameArabic: "القلم", englishName: "The Pen", versesCount: 52, revelationType: "Meccan" },
  { number: 69, name: "Al-Haqqah", nameArabic: "الحاقة", englishName: "The Reality", versesCount: 52, revelationType: "Meccan" },
  { number: 70, name: "Al-Ma'arij", nameArabic: "المعارج", englishName: "The Ascending Stairways", versesCount: 44, revelationType: "Meccan" },
  { number: 71, name: "Nuh", nameArabic: "نوح", englishName: "Noah", versesCount: 28, revelationType: "Meccan" },
  { number: 72, name: "Al-Jinn", nameArabic: "الجن", englishName: "The Jinn", versesCount: 28, revelationType: "Meccan" },
  { number: 73, name: "Al-Muzzammil", nameArabic: "المزمل", englishName: "The Enshrouded One", versesCount: 20, revelationType: "Meccan" },
  { number: 74, name: "Al-Muddaththir", nameArabic: "المدثر", englishName: "The Cloaked One", versesCount: 56, revelationType: "Meccan" },
  { number: 75, name: "Al-Qiyamah", nameArabic: "القيامة", englishName: "The Resurrection", versesCount: 40, revelationType: "Meccan" },
  { number: 76, name: "Al-Insan", nameArabic: "الإنسان", englishName: "Man", versesCount: 31, revelationType: "Medinan" },
  { number: 77, name: "Al-Mursalat", nameArabic: "المرسلات", englishName: "Those Sent Forth", versesCount: 50, revelationType: "Meccan" },
  { number: 78, name: "An-Naba", nameArabic: "النبأ", englishName: "The News", versesCount: 40, revelationType: "Meccan" },
  { number: 79, name: "An-Nazi'at", nameArabic: "النازعات", englishName: "Those Who Drag Forth", versesCount: 46, revelationType: "Meccan" },
  { number: 80, name: "Abasa", nameArabic: "عبس", englishName: "He Frowned", versesCount: 42, revelationType: "Meccan" },
  { number: 81, name: "At-Takwir", nameArabic: "التكوير", englishName: "The Overthrowing", versesCount: 29, revelationType: "Meccan" },
  { number: 82, name: "Al-Infitar", nameArabic: "الانفطار", englishName: "The Cleaving", versesCount: 19, revelationType: "Meccan" },
  { number: 83, name: "Al-Mutaffifin", nameArabic: "المطففين", englishName: "The Defrauding", versesCount: 36, revelationType: "Meccan" },
  { number: 84, name: "Al-Inshiqaq", nameArabic: "الانشقاق", englishName: "The Splitting Open", versesCount: 25, revelationType: "Meccan" },
  { number: 85, name: "Al-Buruj", nameArabic: "البروج", englishName: "The Great Stars", versesCount: 22, revelationType: "Meccan" },
  { number: 86, name: "At-Tariq", nameArabic: "الطارق", englishName: "The Night Comer", versesCount: 17, revelationType: "Meccan" },
  { number: 87, name: "Al-A'la", nameArabic: "الأعلى", englishName: "The Most High", versesCount: 19, revelationType: "Meccan" },
  { number: 88, name: "Al-Ghashiyah", nameArabic: "الغاشية", englishName: "The Overwhelming", versesCount: 26, revelationType: "Meccan" },
  { number: 89, name: "Al-Fajr", nameArabic: "الفجر", englishName: "The Dawn", versesCount: 30, revelationType: "Meccan" },
  { number: 90, name: "Al-Balad", nameArabic: "البلد", englishName: "The City", versesCount: 20, revelationType: "Meccan" },
  { number: 91, name: "Ash-Shams", nameArabic: "الشمس", englishName: "The Sun", versesCount: 15, revelationType: "Meccan" },
  { number: 92, name: "Al-Layl", nameArabic: "الليل", englishName: "The Night", versesCount: 21, revelationType: "Meccan" },
  { number: 93, name: "Ad-Duha", nameArabic: "الضحى", englishName: "The Morning Hours", versesCount: 11, revelationType: "Meccan" },
  { number: 94, name: "Ash-Sharh", nameArabic: "الشرح", englishName: "The Relief", versesCount: 8, revelationType: "Meccan" },
  { number: 95, name: "At-Tin", nameArabic: "التين", englishName: "The Fig", versesCount: 8, revelationType: "Meccan" },
  { number: 96, name: "Al-Alaq", nameArabic: "العلق", englishName: "The Clot", versesCount: 19, revelationType: "Meccan" },
  { number: 97, name: "Al-Qadr", nameArabic: "القدر", englishName: "The Power", versesCount: 5, revelationType: "Meccan" },
  { number: 98, name: "Al-Bayyinah", nameArabic: "البينة", englishName: "The Clear Proof", versesCount: 8, revelationType: "Medinan" },
  { number: 99, name: "Az-Zalzalah", nameArabic: "الزلزلة", englishName: "The Earthquake", versesCount: 8, revelationType: "Medinan" },
  { number: 100, name: "Al-Adiyat", nameArabic: "العاديات", englishName: "The Courser", versesCount: 11, revelationType: "Meccan" },
  { number: 101, name: "Al-Qari'ah", nameArabic: "القارعة", englishName: "The Calamity", versesCount: 11, revelationType: "Meccan" },
  { number: 102, name: "At-Takathur", nameArabic: "التكاثر", englishName: "The Rivalry in World Increase", versesCount: 8, revelationType: "Meccan" },
  { number: 103, name: "Al-Asr", nameArabic: "العصر", englishName: "The Declining Day", versesCount: 3, revelationType: "Meccan" },
  { number: 104, name: "Al-Humazah", nameArabic: "الهمزة", englishName: "The Traducer", versesCount: 9, revelationType: "Meccan" },
  { number: 105, name: "Al-Fil", nameArabic: "الفيل", englishName: "The Elephant", versesCount: 5, revelationType: "Meccan" },
  { number: 106, name: "Quraysh", nameArabic: "قريش", englishName: "Quraysh", versesCount: 4, revelationType: "Meccan" },
  { number: 107, name: "Al-Ma'un", nameArabic: "الماعون", englishName: "The Small Kindnesses", versesCount: 7, revelationType: "Meccan" },
  { number: 108, name: "Al-Kawthar", nameArabic: "الكوثر", englishName: "The Abundance", versesCount: 3, revelationType: "Meccan" },
  { number: 109, name: "Al-Kafirun", nameArabic: "الكافرون", englishName: "The Disbelievers", versesCount: 6, revelationType: "Meccan" },
  { number: 110, name: "An-Nasr", nameArabic: "النصر", englishName: "The Divine Support", versesCount: 3, revelationType: "Medinan" },
  { number: 111, name: "Al-Masad", nameArabic: "المسد", englishName: "The Palm Fiber", versesCount: 5, revelationType: "Meccan" },
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
