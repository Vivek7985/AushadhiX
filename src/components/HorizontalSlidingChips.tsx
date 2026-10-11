import React, { useRef, useState, useEffect } from 'react';

interface HorizontalSlidingChipsProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
  ariaLabel?: string;
}

/**
 * Clean single-line horizontal sliding container for chips.
 * - Horizontal sliding motion ("the old way")
 * - Zero visible scrollbar sliders across all browsers (no-scrollbar, scrollbar-none)
 * - Mouse wheel vertical-to-horizontal translation for effortless trackpad & mouse sliding
 * - Desktop click-and-drag horizontal swipe & native touch swiping
 * - Auto-scrolls active chip into view
 */
export const HorizontalSlidingChips: React.FC<HorizontalSlidingChipsProps> = ({
  children,
  className = '',
  id = 'horizontal-sliding-chips',
  ariaLabel = 'Categories filter',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftState, setScrollLeftState] = useState(0);
  const [hasMoved, setHasMoved] = useState(false);

  // Mouse wheel horizontal translation
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const el = containerRef.current;
    if (!el) return;

    // If scrolling predominantly vertically, convert to horizontal slide
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && el.scrollWidth > el.clientWidth) {
      el.scrollBy({ left: e.deltaY, behavior: 'smooth' });
      e.preventDefault();
    }
  };

  // Mouse drag handlers for desktop click-to-slide
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const el = containerRef.current;
    if (!el) return;

    setIsDragging(true);
    setHasMoved(false);
    setStartX(e.pageX - el.offsetLeft);
    setScrollLeftState(el.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const el = containerRef.current;
    if (!el) return;

    e.preventDefault();
    const x = e.pageX - el.offsetLeft;
    const walk = (x - startX) * 1.5;
    if (Math.abs(walk) > 4) {
      setHasMoved(true);
    }
    el.scrollLeft = scrollLeftState - walk;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Prevent accidental clicks on child buttons if dragged
  const handleClickCapture = (e: React.MouseEvent<HTMLDivElement>) => {
    if (hasMoved) {
      e.stopPropagation();
      e.preventDefault();
      setHasMoved(false);
    }
  };

  // Auto-scroll selected chip into view when selection changes
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const selectedChild = el.querySelector('[data-selected="true"], [aria-selected="true"]') as HTMLElement | null;
    if (selectedChild) {
      const elRect = el.getBoundingClientRect();
      const childRect = selectedChild.getBoundingClientRect();
      if (childRect.left < elRect.left || childRect.right > elRect.right) {
        selectedChild.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
      }
    }
  }, [children]);

  return (
    <div
      id={id}
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClickCapture={handleClickCapture}
      aria-label={ariaLabel}
      className={`w-full max-w-full flex items-center gap-1.5 overflow-x-auto no-scrollbar scrollbar-none py-1 select-none overscroll-x-contain ${
        isDragging ? 'cursor-grabbing' : 'cursor-grab sm:cursor-default'
      } ${className}`}
      style={{
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {/* Scoped style to guarantee NO scrollbar sliders appear */}
      <style>{`
        #${id}::-webkit-scrollbar,
        #${id} *::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
      `}</style>
      {children}
    </div>
  );
};
