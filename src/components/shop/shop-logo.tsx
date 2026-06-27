import Image from "next/image";

export function ShopLogo({
  name,
  logoUrl,
  size = "md",
  className = "",
}: {
  name: string;
  logoUrl: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = {
    sm: "h-12 w-12 rounded-2xl text-2xl",
    md: "h-20 w-20 rounded-2xl text-3xl sm:h-24 sm:w-24 sm:text-4xl",
    lg: "h-24 w-24 rounded-3xl text-4xl",
  };

  const boxClass = `flex shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br from-[var(--primary-soft)] to-[var(--secondary-soft)] shadow-sm ring-1 ring-[var(--border)] ${sizes[size]} ${className}`;

  if (logoUrl) {
    return (
      <div className={boxClass}>
        <Image
          src={logoUrl}
          alt={name}
          width={96}
          height={96}
          className="h-full w-full object-cover"
          unoptimized
        />
      </div>
    );
  }

  return (
    <div className={boxClass}>
      <span aria-hidden>🧋</span>
    </div>
  );
}
