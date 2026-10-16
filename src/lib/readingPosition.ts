// Local "last reading position" — works offline for every user, no account needed.
// Cloud sync (useReadingProgress) stays the primary source for signed-in users;
// this local record is the fallback and also remembers the Mushaf page/mode.

export interface LocalReadingPosition {
  surah: number;
  verse: number | null;
  page: number | null;
  style: string | null; // textDisplayStyle used (pages-hafs, verses, ...)
  at: string; // ISO date
}

const STORAGE_KEY = 'quran-last-reading-position';

export const saveLocalReadingPosition = (pos: Omit<LocalReadingPosition, 'at'>) => {
  try {
    const record: LocalReadingPosition = { ...pos, at: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // storage unavailable (private mode) — ignore silently
  }
};

export const loadLocalReadingPosition = (): LocalReadingPosition | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LocalReadingPosition;
    if (!parsed || typeof parsed.surah !== 'number' || parsed.surah < 1 || parsed.surah > 114) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};
