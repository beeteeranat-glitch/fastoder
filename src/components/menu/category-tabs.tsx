"use client";

import { useEffect, useRef, useState } from "react";
import type { Category } from "@/types";

interface CategoryTabsProps {
  categories: Category[];
  activeId: string;
  onChange: (id: string) => void;
}

const DRAG_THRESHOLD = 8;

export function CategoryTabs({
  categories,
  activeId,
  onChange,
}: CategoryTabsProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);
  const pointerIdRef = useRef<number | null>(null);
  const startXRef = useRef(0);
  const scrollStartRef = useRef(0);
  const didDragRef = useRef(false);

  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const scroller = scrollerRef.current;
    const activeButton = activeRef.current;
    if (!scroller || !activeButton) return;

    const targetLeft =
      activeButton.offsetLeft -
      scroller.clientWidth / 2 +
      activeButton.offsetWidth / 2;

    scroller.scrollTo({
      left: Math.max(0, targetLeft),
      behavior: "smooth",
    });
  }, [activeId]);

  const endDrag = (pointerId: number) => {
    const scroller = scrollerRef.current;
    if (!scroller || pointerIdRef.current !== pointerId) return;

    if (scroller.hasPointerCapture(pointerId)) {
      scroller.releasePointerCapture(pointerId);
    }

    pointerIdRef.current = null;
    setIsDragging(false);

    window.setTimeout(() => {
      didDragRef.current = false;
    }, 50);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const scroller = scrollerRef.current;
    if (!scroller || event.button !== 0 || event.pointerType !== "mouse") return;

    const target = event.target as HTMLElement;
    if (target.closest("[data-category-tab]")) return;

    didDragRef.current = false;
    pointerIdRef.current = event.pointerId;
    startXRef.current = event.clientX;
    scrollStartRef.current = scroller.scrollLeft;
    scroller.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const scroller = scrollerRef.current;
    if (!scroller || pointerIdRef.current !== event.pointerId) return;

    const delta = event.clientX - startXRef.current;
    if (!didDragRef.current && Math.abs(delta) < DRAG_THRESHOLD) return;

    didDragRef.current = true;
    setIsDragging(true);
    scroller.scrollLeft = scrollStartRef.current - delta;
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    endDrag(event.pointerId);
  };

  const handleCategoryClick = (
    event: React.MouseEvent<HTMLButtonElement>,
    categoryId: string,
  ) => {
    if (didDragRef.current) {
      event.preventDefault();
      return;
    }
    onChange(categoryId);
  };

  return (
    <div className="relative w-full min-w-0">
      <div
        ref={scrollerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`scrollbar-hide flex w-full min-w-0 gap-2 overflow-x-auto overscroll-x-contain px-1 pb-1 pt-0.5 [-webkit-overflow-scrolling:touch] ${
          isDragging ? "cursor-grabbing select-none" : "cursor-grab"
        }`}
        style={{ touchAction: "pan-x" }}
      >
        {categories.map((category) => {
          const active = category.id === activeId;
          return (
            <button
              key={category.id}
              ref={active ? activeRef : undefined}
              type="button"
              data-category-tab
              onClick={(event) => handleCategoryClick(event, category.id)}
              className={`shrink-0 touch-manipulation whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-semibold transition active:scale-[0.97] ${
                active
                  ? "bg-[var(--primary)] text-white shadow-[0_8px_20px_-10px_rgb(var(--shadow-color)/0.7)]"
                  : "border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:border-[var(--primary)]/35 hover:bg-[var(--primary-soft)] hover:text-[var(--text)]"
              }`}
            >
              <span className="mr-1.5">{category.emoji}</span>
              {category.name}
            </button>
          );
        })}
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-[var(--surface)] to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-[var(--surface)] to-transparent"
      />
    </div>
  );
}
