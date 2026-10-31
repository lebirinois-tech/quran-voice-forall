# Architecture
- Billable Tafsir translation and speech functions require verified non-anonymous account JWTs through the shared paidAiUser guard; bundled content and cached/device speech remain usable without sign-in.
- Startup validates saved reciters through getSafeReciter rather than a separate allowlist; streaming and downloads share getReciterAudioUrl, Pages/Verses preserves voices within the same qiraat, and reciter changes clear the old paused source to prevent wrong-reciter playback.
- Full-surah reciters use exact verified recording catalogs and one offline blob per surah; without verified ayah timings, playback starts at verse 1 and precise verse stops, repetition and highlighting are unavailable.
- All iPhone install entry points use the shared PwaInstallContext dialog with localized native-browser steps; iOS exposes no programmatic home-screen installation prompt.
- Quran search derives word suggestions and complete-word occurrences from the bundled corpus through the shared quranSearch module; each result carries its own surah, verse and page so navigation never substitutes the first occurrence.
- Updates compare native installations only to the GitHub `latest` APK release version marker (legacy asset timestamp fallback), never to the web deployment; the singleton PWA registrar applies updates and the global monitor checks launch/foreground/online/5-minute intervals without reinstalling native bundles.

- All Tafsir readers use the shared useTafsirSpeech hook: cloud male voice via the tafsir-tts function with clips cached in IndexedDB, falling back to device speech only when offline/transient errors occur; device voices mispronounce Fusha.

- Verse-mode thematic tafsir resolves a contiguous same-theme run within one surah from the shared local index and displays every member's bundled text and tafsir; this avoids merging unrelated passages or presenting a single-verse analysis as a paragraph commentary.

- Les trois Mushafs pages utilisent les polices Unicode KFGQPC embarquées correspondant à Hafs, Warsh et Qaloun afin de préserver la géométrie Médine hors ligne.
- Le Mushaf Hafs utilise les coupures Médine officielles mot par mot des 604 pages ; le navigateur ne doit jamais recalculer ces coupures.
- Le coloriage thématique ne peut modifier les coupures de lignes : chaque suite de mots d'un même thème porte un aplat pastel continu et seuls les passages documentés sont colorés.
- Hafs, Warsh et Qaloun partagent le même index local de 6 236 références thématiques dérivé de QSAC CC BY 4.0 et la même palette propre à l’application, car le thème dépend du verset et non de sa graphie.
- Hafs (police KFGQPC) : U+06DF est remplacé par U+0652 à l'affichage, car le glyphe 06DF de cette police est un gros disque noir pleine largeur ; le 0652 de cette police est le petit zéro rond correct.
- The first-run reading mode is Pages Hafs, with a persistent Pages/Verses switch available inside the reader, so thematic Mushaf pages are immediately discoverable.
- Hafs Arabic text must come from the bundled Quran.com Uthmani corpus, shared with the packed Medina words; never overwrite it with Al Quran Cloud text or stale unversioned caches, because their tanween encoding displays false meem marks in our fonts.
- Surah opening rows are derived separately from official word rows; expand a single header slot when necessary instead of moving or dropping Quran words, so consistent openings preserve text integrity.
- The Android APK workflow runs on every push to main (plus manual dispatch) with cancel-in-progress concurrency, so each publish refreshes the latest release without manual requests.
- APK signing uses the committed stable keystore `signing/quran-acces.keystore` (alias `quran`), injected into the generated `android/app/build.gradle` by the workflow; never revert to per-runner debug keys, or Android rejects updates with a package conflict.

- Recitation stop locations and cross-surah passage progression use the shared recitationSession module; the audio hook owns the session and active surah while reader navigation follows it, so endpoints and repetition counters survive surah changes.
