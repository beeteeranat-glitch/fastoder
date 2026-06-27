"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function AdminQrGenerator() {
  const [menuUrl, setMenuUrl] = useState("");
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const url = `${window.location.origin}/menu`;
    setMenuUrl(url);
    void QRCode.toDataURL(url, {
      width: 280,
      margin: 2,
      color: { dark: "#0f172a", light: "#ffffff" },
    })
      .then(setDataUrl)
      .catch(() => setError("สร้าง QR Code ไม่สำเร็จ"));
  }, []);

  const download = () => {
    if (!dataUrl) return;
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = "fastorder-menu-qr.png";
    link.click();
  };

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">

      {/* <div className="mt-2 mb-6 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
          ลิ้งค์ของส่วนหน้า Admin
        </p>
        <a
          href="http://localhost:3000/admin"
          className="block break-all rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5 text-xs font-medium text-[var(--text)] transition hover:border-[var(--primary)]/40 hover:bg-[var(--surface)] hover:text-[var(--primary)]"
        >
          http://localhost:3000/admin
        </a>
      </div> */}
      <h2 className="font-display text-lg font-bold">QR Code เมนูร้าน</h2>
      <p className="mt-1 text-sm text-[var(--text-muted)]">
        ลูกค้าสแกนเพื่อเปิดเมนูและสั่งซื้อ
      </p>
      <p className="mt-2 break-all rounded-xl bg-[var(--surface-muted)] px-3 py-2 text-xs text-[var(--text-muted)]">
        {menuUrl}
      </p>

      <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        {dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={dataUrl}
            alt="QR Code เมนูร้าน"
            className="rounded-2xl border border-[var(--border)] bg-white p-3"
            width={280}
            height={280}
          />
        ) : (
          <div className="flex h-[280px] w-[280px] items-center justify-center rounded-2xl border border-dashed border-[var(--border)] text-sm text-[var(--text-muted)]">
            กำลังสร้าง QR...
          </div>
        )}
        <div className="space-y-2">
          <button
            type="button"
            disabled={!dataUrl}
            onClick={download}
            className="rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            ดาวน์โหลด PNG
          </button>
          {error ? (
            <p className="text-sm text-rose-700">{error}</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
