"use client";

import Image from "next/image";

export function MenuItemVisual({
  imageUrl,
  emoji,
  gradient,
  size = "md",
  alt = "",
}: {
  imageUrl?: string | null;
  emoji: string;
  gradient: string;
  size?: "sm" | "md" | "lg";
  alt?: string;
}) {
  const sizeClass =
    size === "sm"
      ? "h-12 w-12 rounded-xl"
      : size === "lg"
        ? "h-24 w-24 rounded-2xl"
        : "h-14 w-14 rounded-2xl sm:h-16 sm:w-16";

  if (imageUrl) {
    return (
      <div className={`relative shrink-0 overflow-hidden ${sizeClass}`}>
        <Image
          src={imageUrl}
          alt={alt}
          fill
          className="object-cover"
          sizes="96px"
          unoptimized
        />
      </div>
    );
  }

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] ${sizeClass} ${gradient}`}
    >
      <span className="text-2xl drop-shadow-sm sm:text-3xl">{emoji}</span>
    </div>
  );
}
