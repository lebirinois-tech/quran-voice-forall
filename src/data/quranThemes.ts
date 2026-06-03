/**
 * Quran thematic classification (Tafsir Mawdou'i)
 * Each theme has:
 *  - trilingual labels (AR / FR / EN)
 *  - a distinct HSL color (harmonised with the emerald/gold palette)
 *  - a curated list of representative verses ("surah:verse" or "surah:start-end")
 *
 * The list is curated (most well-known verses for each theme). It is intentionally
 * NOT exhaustive — the AI thematic tafsir panel can enrich it on demand.
 */

export type ThemeId =
  | 'tawhid'
  | 'prayer'
  | 'prophets'
  | 'hereafter'
  | 'mercy'
  | 'patience'
  | 'family'
  | 'charity'
  | 'knowledge'
  | 'repentance'
  | 'stories'
  | 'jihad-nafs';

export interface QuranTheme {
  id: ThemeId;
  /** HSL color (light) — use as text color and 12% alpha bg */
  hsl: string;
  emoji: string;
  labels: { ar: string; fr: string; en: string };
  descriptions: { ar: string; fr: string; en: string };
}

export const QURAN_THEMES: QuranTheme[] = [
  {
    id: 'tawhid',
    hsl: '160 70% 35%',
    emoji: '☝️',
    labels: { ar: 'التوحيد', fr: 'Unicité (Tawhid)', en: 'Oneness of God' },
    descriptions: {
      ar: 'آيات تثبت وحدانية الله تعالى وأسماءه وصفاته.',
      fr: 'Versets affirmant l’unicité d’Allah, Ses noms et Ses attributs.',
      en: 'Verses affirming the Oneness of Allah, His names and attributes.',
    },
  },
  {
    id: 'prayer',
    hsl: '210 75% 45%',
    emoji: '🕌',
    labels: { ar: 'الصلاة', fr: 'Prière (Salât)', en: 'Prayer (Salah)' },
    descriptions: {
      ar: 'آيات تأمر بإقامة الصلاة وتبيّن فضلها وأحكامها.',
      fr: 'Versets sur l’établissement de la prière, son mérite et ses règles.',
      en: 'Verses commanding prayer, explaining its merit and rulings.',
    },
  },
  {
    id: 'prophets',
    hsl: '270 55% 50%',
    emoji: '📜',
    labels: { ar: 'الأنبياء والرسل', fr: 'Prophètes & Messagers', en: 'Prophets & Messengers' },
    descriptions: {
      ar: 'قصص الأنبياء وذكرى دعوتهم لأقوامهم.',
      fr: 'Récits des prophètes et de leur appel à leurs peuples.',
      en: 'Stories of the prophets and their call to their peoples.',
    },
  },
  {
    id: 'hereafter',
    hsl: '0 70% 50%',
    emoji: '⚖️',
    labels: { ar: 'اليوم الآخر', fr: 'Au-delà / Jour dernier', en: 'The Hereafter' },
    descriptions: {
      ar: 'آيات الجنة والنار والحساب والبعث.',
      fr: 'Versets sur le Paradis, l’Enfer, le Jugement et la Résurrection.',
      en: 'Verses about Paradise, Hellfire, Judgment and Resurrection.',
    },
  },
  {
    id: 'mercy',
    hsl: '340 65% 50%',
    emoji: '💗',
    labels: { ar: 'الرحمة والمغفرة', fr: 'Miséricorde & Pardon', en: 'Mercy & Forgiveness' },
    descriptions: {
      ar: 'آيات تعظّم رحمة الله ومغفرته لعباده.',
      fr: 'Versets exaltant la miséricorde et le pardon d’Allah.',
      en: 'Verses extolling Allah’s mercy and forgiveness.',
    },
  },
  {
    id: 'patience',
    hsl: '35 85% 45%',
    emoji: '🌿',
    labels: { ar: 'الصبر', fr: 'Patience (Sabr)', en: 'Patience (Sabr)' },
    descriptions: {
      ar: 'آيات تحث على الصبر عند البلاء والطاعة.',
      fr: 'Versets exhortant à la patience face à l’épreuve et dans l’obéissance.',
      en: 'Verses urging patience in trials and obedience.',
    },
  },
  {
    id: 'family',
    hsl: '15 70% 50%',
    emoji: '👨‍👩‍👧',
    labels: { ar: 'الأسرة والوالدين', fr: 'Famille & Parents', en: 'Family & Parents' },
    descriptions: {
      ar: 'آيات في بر الوالدين والزواج والأبناء.',
      fr: 'Versets sur la piété filiale, le mariage et les enfants.',
      en: 'Verses on filial piety, marriage and children.',
    },
  },
  {
    id: 'charity',
    hsl: '145 60% 40%',
    emoji: '🤲',
    labels: { ar: 'الإنفاق والزكاة', fr: 'Aumône & Zakât', en: 'Charity & Zakat' },
    descriptions: {
      ar: 'آيات الزكاة والصدقة والإنفاق في سبيل الله.',
      fr: 'Versets sur la zakât, l’aumône et la dépense dans le sentier d’Allah.',
      en: 'Verses on zakat, charity and spending in the path of Allah.',
    },
  },
  {
    id: 'knowledge',
    hsl: '195 75% 40%',
    emoji: '📖',
    labels: { ar: 'العلم والتفكر', fr: 'Savoir & Réflexion', en: 'Knowledge & Reflection' },
    descriptions: {
      ar: 'آيات تحث على طلب العلم والتفكر في خلق الله.',
      fr: 'Versets incitant à la quête du savoir et à la méditation sur la création.',
      en: 'Verses urging the pursuit of knowledge and reflection upon creation.',
    },
  },
  {
    id: 'repentance',
    hsl: '290 50% 45%',
    emoji: '🌙',
    labels: { ar: 'التوبة', fr: 'Repentir (Tawba)', en: 'Repentance (Tawba)' },
    descriptions: {
      ar: 'آيات تدعو إلى التوبة والاستغفار والرجوع إلى الله.',
      fr: 'Versets appelant au repentir, à l’istighfar et au retour vers Allah.',
      en: 'Verses calling to repentance, seeking forgiveness and returning to Allah.',
    },
  },
  {
    id: 'stories',
    hsl: '50 80% 40%',
    emoji: '🏛️',
    labels: { ar: 'القصص القرآني', fr: 'Récits coraniques', en: 'Quranic Stories' },
    descriptions: {
      ar: 'قصص الأمم السابقة وعبرها.',
      fr: 'Récits des peuples anciens et leurs leçons.',
      en: 'Stories of past nations and their lessons.',
    },
  },
  {
    id: 'jihad-nafs',
    hsl: '175 60% 35%',
    emoji: '🛡️',
    labels: { ar: 'جهاد النفس', fr: 'Combat de l’âme', en: 'Struggle of the Soul' },
    descriptions: {
      ar: 'آيات تزكية النفس ومجاهدة الهوى.',
      fr: 'Versets sur la purification de l’âme et la lutte contre les passions.',
      en: 'Verses on purifying the soul and resisting desires.',
    },
  },
];

/**
 * Curated mapping: surahNumber -> { themeId -> verse numbers }
 * Verse numbers can be a single number or a "start-end" range string.
 */
type VerseRef = number | string;
const M: Record<number, Partial<Record<ThemeId, VerseRef[]>>> = {
  1: { tawhid: [1, 2, 3, 4], prayer: [5, 6, 7] },
  2: {
    tawhid: [255, 163, 22],
    prayer: [3, 43, 45, 110, 238],
    charity: [3, 43, 110, 177, 261, 267, 274],
    patience: [45, 153, 155, 156, 177, 250],
    family: [83, 180, 215, '221-232', 233],
    repentance: [37, 54, 160, 222],
    hereafter: [25, 81, 82, 281],
    mercy: [218, 268],
    knowledge: [31, 32, 269],
    stories: ['30-39', '49-71', '102-103', '124-129', '258-260'],
    prophets: [136, 253, '258-260'],
    'jihad-nafs': [197, 219],
  },
  3: {
    tawhid: [2, 18, 26, 27],
    family: [14, '33-37', 195],
    patience: [120, 142, 146, 186, 200],
    repentance: [15, 16, 17, '133-135'],
    hereafter: ['185-198'],
    prophets: [33, 34, '42-58', 84, 144],
    mercy: ['8-9', 31, 132, 159],
    charity: [92, 134],
    knowledge: [7, 18, '190-191'],
  },
  4: {
    family: ['1-7', '11-12', '19-25', 34, 36, 128, 135],
    prayer: [43, 77, 101, 102, 103, 142],
    charity: [36, 38, 39, 77, 114],
    repentance: ['17-18', 110, 146],
    prophets: ['163-165'],
    mercy: [110, 175],
  },
  5: {
    family: [5, 38, 89],
    charity: [12, 55, 89],
    prayer: [6, 12, 55, 91],
    stories: ['20-26', '27-32', '110-115'],
    prophets: [46, 75, 110, 111],
    hereafter: ['119-120'],
    repentance: ['39-40', 74],
  },
  6: {
    tawhid: ['1-3', 14, 19, '95-103', 162, 163],
    knowledge: ['74-79', '95-99'],
    prophets: ['83-90'],
  },
  7: {
    stories: ['11-25', '59-64', '65-72', '73-79', '80-84', '85-93', '103-137', '142-156', '163-166'],
    prophets: ['59-93', '103-156'],
    repentance: [23, 153, 156],
    'jihad-nafs': [199, 200, 201],
  },
  9: {
    repentance: [3, 5, 11, 74, '102-104', 117, 118],
    charity: [60, 71, 103, 104],
    prayer: [5, 11, 18, 71, 84, 103],
  },
  10: {
    tawhid: [3, 4, '31-36', 65, 66],
    stories: ['71-93'],
    prophets: [71, 75, 87, 98],
    mercy: [21, 57, 58],
  },
  11: { prophets: ['25-49', '50-60', '61-68', '69-83', '84-95', '96-101'], stories: ['25-101'], patience: [11, 115] },
  12: { stories: ['1-111'], prophets: [4, '7-101'], patience: [18, 83, 90], family: ['4-18', 99, 100] },
  14: { tawhid: [10, 32, 33, 34], prayer: [31, 37, 40], prophets: ['5-14', '35-41'], mercy: [34, 36] },
  16: { tawhid: ['3-22', 51], charity: [71, 75, 90], knowledge: ['10-18', '65-69', '78-83'], 'jihad-nafs': [90, '125-128'] },
  17: {
    family: ['23-26', 31],
    prayer: ['78-79', 110],
    'jihad-nafs': [29, 32, 36, 37, 53],
    knowledge: [36, 85],
    tawhid: [22, 23, 111],
  },
  18: { stories: ['9-26', '32-44', '60-82', '83-101'], patience: [28, 67, 68, 69], 'jihad-nafs': [28, 46, 110] },
  19: { prophets: ['2-15', '16-40', '41-50', '51-53', '54-57', '58'], family: ['2-15', 32, 55], mercy: ['1-15', 96] },
  20: { stories: ['9-98'], prophets: ['9-98'], prayer: [14, 132], patience: [130, 132] },
  21: { prophets: ['48-91'], stories: ['51-91'], tawhid: [22, 25, 87, 92], mercy: [83, 84, 107] },
  23: {
    prayer: [2, 9],
    'jihad-nafs': ['1-11', 96],
    charity: [4, 60],
    hereafter: ['99-118'],
    family: ['5-7'],
  },
  24: {
    family: ['2-10', '27-34', 58, 59, 61],
    prayer: [37, 56, 58],
    charity: [22, 56],
    'jihad-nafs': [30, 31],
  },
  25: { 'jihad-nafs': ['63-74'], repentance: ['68-71'], prayer: [64, 65, 74] },
  28: { stories: ['3-46', '76-82'], prophets: ['3-46'], patience: [54, 80] },
  29: { patience: ['1-7', 59, 64, 65], prayer: [45], prophets: ['14-15', '16-27', '28-35', '36-40'] },
  31: { family: ['12-19'], knowledge: ['12-19'], 'jihad-nafs': ['13-19'] },
  33: { family: ['4-6', '28-34', 35, '49-52', 53, 59], prayer: [35, 41, 42], 'jihad-nafs': [35, 70, 71] },
  35: { tawhid: ['1-3', 13, 15], mercy: [2, 34, 45], charity: [29, 30] },
  36: { tawhid: ['33-44', '77-83'], hereafter: ['48-67'], prophets: ['13-32'] },
  39: { tawhid: ['1-7', '62-67'], repentance: [53, 54, 55], mercy: [53] },
  40: { repentance: [3, 55, 60], prayer: [55, 60], tawhid: [3, 16, 65] },
  41: { patience: [30, 31, 32, 34, 35], 'jihad-nafs': ['33-36'] },
  42: { mercy: [25, 28, 30], repentance: [25] },
  46: { family: [15, 17, 18], patience: [35] },
  49: { 'jihad-nafs': ['10-13'], family: [13], repentance: [11, 12] },
  50: { hereafter: ['16-35', '41-45'], tawhid: ['6-11', 16] },
  51: { tawhid: ['56-58'], hereafter: ['1-23'], charity: [19] },
  53: { tawhid: ['1-18'], 'jihad-nafs': ['29-32', '38-42'] },
  55: { mercy: ['1-78'], hereafter: ['46-78'], tawhid: ['1-13'] },
  56: { hereafter: ['1-96'] },
  57: { tawhid: ['1-6'], charity: [7, 10, 11, 18], patience: [22, 23] },
  59: { tawhid: ['22-24'] },
  62: { prayer: [9, 10] },
  63: { charity: [10], 'jihad-nafs': ['9-11'] },
  64: { family: [14, 15], charity: [16, 17] },
  65: { family: ['1-7'], repentance: [2, 3], patience: [2, 3] },
  66: { family: [6, 11, 12], repentance: [8] },
  67: { tawhid: ['1-4', '13-15'], hereafter: ['6-11'] },
  73: { prayer: ['1-8', 20], patience: [10], charity: [20] },
  74: { hereafter: ['8-48'] },
  75: { hereafter: ['1-40'] },
  76: { hereafter: ['5-22'], charity: [8, 9] },
  78: { hereafter: ['1-40'] },
  79: { hereafter: ['1-46'], stories: ['15-26'] },
  81: { hereafter: ['1-29'] },
  82: { hereafter: ['1-19'] },
  84: { hereafter: ['1-25'] },
  87: { prayer: [14, 15], 'jihad-nafs': ['14-17'] },
  90: { charity: ['11-18'], 'jihad-nafs': ['8-20'] },
  93: { mercy: ['1-11'], charity: [9, 10, 11] },
  94: { patience: ['5-8'], mercy: ['1-8'] },
  96: { knowledge: ['1-5'], prayer: [10, 19] },
  103: { patience: [3], 'jihad-nafs': ['1-3'] },
  107: { prayer: ['4-6'], charity: ['1-7'] },
  112: { tawhid: ['1-4'] },
  113: { tawhid: ['1-5'] },
  114: { tawhid: ['1-6'] },
};

function rangeIncludes(ref: VerseRef, n: number): boolean {
  if (typeof ref === 'number') return ref === n;
  const [a, b] = ref.split('-').map((x) => parseInt(x, 10));
  return n >= a && n <= b;
}

/** Return all themes that the given verse belongs to (from curated data). */
export const getThemesForVerse = (surahNumber: number, verseNumber: number): QuranTheme[] => {
  const surahMap = M[surahNumber];
  if (!surahMap) return [];
  const ids: ThemeId[] = [];
  for (const [themeId, refs] of Object.entries(surahMap)) {
    if (refs?.some((r) => rangeIncludes(r, verseNumber))) {
      ids.push(themeId as ThemeId);
    }
  }
  return QURAN_THEMES.filter((t) => ids.includes(t.id));
};

export const getThemeById = (id: ThemeId) => QURAN_THEMES.find((t) => t.id === id);

/** Localized label for a theme in a given language. */
export const getThemeLabel = (theme: QuranTheme, lang: 'ar' | 'fr' | 'en' = 'fr') =>
  theme.labels[lang];
