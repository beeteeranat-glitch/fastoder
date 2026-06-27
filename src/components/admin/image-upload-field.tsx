"use client";

import { useRef, useState } from "react";
import { MenuItemVisual } from "@/components/menu/menu-item-visual";

export function ImageUploadField({
  label,
  imageUrl,
  emoji,
  gradient,
  alt,
  onChange,
}: {
  label: string;
  imageUrl: string | null;
  emoji?: string;
  gradient?: string;
  alt: string;
  onChange: (url: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? "อัปโหลดไม่สำเร็จ");
      }
      onChange(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "อัปโหลดไม่สำเร็จ");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <p className="mb-2 text-xs font-semibold text-[var(--text-muted)]">{label}</p>
      <div className="flex items-start gap-4">
        <MenuItemVisual
          imageUrl={imageUrl}
          emoji={emoji ?? "🧋"}
          gradient={gradient ?? "from-sky-400 to-blue-500"}
          size="lg"
          alt={alt}
        />
        <div className="flex flex-1 flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
            }}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {uploading ? "กำลังอัปโหลด..." : "เลือกรูปภาพ"}
          </button>
          {imageUrl ? (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text-muted)]"
            >
              ลบรูป
            </button>
          ) : null}
          <input
            type="url"
            value={imageUrl ?? ""}
            onChange={(event) =>
              onChange(event.target.value.trim() || null)
            }
            placeholder="หรือวาง URL รูปภาพ"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-sm"
          />
        </div>
      </div>
      {error ? (
        <p className="mt-2 text-xs text-rose-600">{error}</p>
      ) : null}
    </div>
  );
}
