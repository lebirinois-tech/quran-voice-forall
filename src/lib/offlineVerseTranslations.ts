type TranslationLang = 'fr' | 'en';

interface BundledAyah {
  numberInSurah: number;
  text: string;
}

interface HafsSurah {
  translation: BundledAyah[];
}

type FrenchDataset = Record<string, HafsSurah>;
type EnglishDataset = Record<string, Record<string, string>>;

let frenchPromise: Promise<FrenchDataset> | null = null;
let englishPromise: Promise<EnglishDataset> | null = null;

const loadFrench = () => {
  frenchPromise ??= fetch('/data/quran-hafs-fr.json', { cache: 'force-cache' }).then((response) => {
    if (!response.ok) throw new Error(`French Quran HTTP ${response.status}`);
    return response.json() as Promise<FrenchDataset>;
  });
  return frenchPromise;
};

const loadEnglish = () => {
  englishPromise ??= fetch('/data/quran-en-sahih.json', { cache: 'force-cache' }).then((response) => {
    if (!response.ok) throw new Error(`English Quran HTTP ${response.status}`);
    return response.json() as Promise<EnglishDataset>;
  });
  return englishPromise;
};

export async function getOfflineVerseTranslation(
  surah: number,
  verse: number,
  lang: TranslationLang,
): Promise<string | null> {
  try {
    if (lang === 'fr') {
      const data = await loadFrench();
      return data[String(surah)]?.translation.find((ayah) => ayah.numberInSurah === verse)?.text ?? null;
    }
    const data = await loadEnglish();
    return data[String(surah)]?.[String(verse)] ?? null;
  } catch (error) {
    console.warn('[offlineVerseTranslations] load failed', lang, error);
    if (lang === 'fr') frenchPromise = null;
    else englishPromise = null;
    return null;
  }
}