import { useEffect, useState, useCallback, useRef } from 'react';

interface FullscreenState {
  isFullscreen: boolean;
  isSupported: boolean;
  error: string | null;
  enter: () => Promise<void>;
  exit: () => Promise<void>;
  toggle: () => Promise<void>;
}

/**
 * Hook cross-platform pour gérer le mode plein écran du navigateur.
 * Sur iOS Safari, l'API fullscreen n'est pas standard : on retourne un état
 * simulé (fallback CSS) afin de ne pas planter l'application.
 */
export function useFullscreen(elementRef?: React.RefObject<HTMLElement | null>): FullscreenState {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastToggleRef = useRef<number>(0);

  useEffect(() => {
    const doc: any = document;
    const supported = !!(
      doc.fullscreenEnabled ||
      doc.webkitFullscreenEnabled ||
      doc.mozFullScreenEnabled ||
      doc.msFullscreenEnabled
    );
    setIsSupported(supported);

    const handleChange = () => {
      const doc: any = document;
      const active = !!(
        doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement
      );
      setIsFullscreen(active);
    };

    const events = [
      'fullscreenchange',
      'webkitfullscreenchange',
      'mozfullscreenchange',
      'MSFullscreenChange',
    ];
    events.forEach((evt) => document.addEventListener(evt, handleChange, false));
    handleChange();
    return () => {
      events.forEach((evt) => document.removeEventListener(evt, handleChange, false));
    };
  }, []);

  const enter = useCallback(async () => {
    const now = Date.now();
    if (now - lastToggleRef.current < 350) return;
    lastToggleRef.current = now;
    setError(null);
    const el: any = elementRef?.current || document.documentElement;
    if (!el) return;
    try {
      if (el.requestFullscreen) await el.requestFullscreen();
      else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
      else if (el.mozRequestFullScreen) await el.mozRequestFullScreen();
      else if (el.msRequestFullscreen) await el.msRequestFullscreen();
      else setIsFullscreen(true); // fallback CSS
    } catch (e) {
      setError(String(e));
      // Sur iOS / certaines webviews, l'API plante : on active le fallback.
      setIsFullscreen(true);
    }
  }, [elementRef]);

  const exit = useCallback(async () => {
    const now = Date.now();
    if (now - lastToggleRef.current < 350) return;
    lastToggleRef.current = now;
    setError(null);
    const doc: any = document;
    try {
      if (doc.exitFullscreen) await doc.exitFullscreen();
      else if (doc.webkitExitFullscreen) await doc.webkitExitFullscreen();
      else if (doc.mozCancelFullScreen) await doc.mozCancelFullScreen();
      else if (doc.msExitFullscreen) await doc.msExitFullscreen();
      else setIsFullscreen(false); // fallback CSS
    } catch (e) {
      setError(String(e));
      setIsFullscreen(false);
    }
  }, []);

  const toggle = useCallback(async () => {
    if (isFullscreen) await exit();
    else await enter();
  }, [isFullscreen, enter, exit]);

  return { isFullscreen, isSupported, error, enter, exit, toggle };
}
