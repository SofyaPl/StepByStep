import { useEffect, useState } from 'react';

interface ViewportMetrics {
  /** Высота экранной клавиатуры, перекрывающей нижнюю часть окна. */
  keyboardInset: number;
  /** Реально видимая высота окна (без клавиатуры). */
  viewportHeight: number | null;
}

// Мелкие изменения высоты (адресная строка браузера) клавиатурой не считаем
const KEYBOARD_THRESHOLD_PX = 120;

/**
 * На мобильных браузерах клавиатура перекрывает низ страницы, но единицы vh
 * и position: fixed продолжают считать высоту по всему экрану. Поэтому нижнюю
 * часть модалки с кнопками не видно. Visual Viewport API даёт реальные размеры.
 */
export function useKeyboardInset(isActive: boolean): ViewportMetrics {
  const [metrics, setMetrics] = useState<ViewportMetrics>({
    keyboardInset: 0,
    viewportHeight: null
  });

  useEffect(() => {
    const viewport = typeof window !== 'undefined' ? window.visualViewport : null;

    if (!isActive || !viewport) {
      setMetrics({ keyboardInset: 0, viewportHeight: null });
      return;
    }

    const update = () => {
      const overlap = window.innerHeight - viewport.height - viewport.offsetTop;
      setMetrics({
        keyboardInset: overlap > KEYBOARD_THRESHOLD_PX ? Math.round(overlap) : 0,
        viewportHeight: Math.round(viewport.height)
      });
    };

    update();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);

    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
    };
  }, [isActive]);

  return metrics;
}
