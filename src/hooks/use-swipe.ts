import { useRef } from "react";
import type { TouchEvent } from "react";

/**
 * Minimal horizontal swipe detector. Ignores mostly-vertical gestures
 * (scrolling) and short accidental drags.
 */
export function useSwipe(
  handlers: { onSwipeLeft?: () => void; onSwipeRight?: () => void },
  thresholdPx = 60,
) {
  const start = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = (e: TouchEvent) => {
    const touch = e.touches[0];
    start.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
  };

  const onTouchEnd = (e: TouchEvent) => {
    const origin = start.current;
    start.current = null;
    if (!origin) return;
    const touch = e.changedTouches[0];
    if (!touch) return;
    const dx = touch.clientX - origin.x;
    const dy = touch.clientY - origin.y;
    if (Math.abs(dx) < thresholdPx || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (dx < 0) handlers.onSwipeLeft?.();
    else handlers.onSwipeRight?.();
  };

  return { onTouchStart, onTouchEnd };
}
