import type { Metadata, Viewport } from "next";
import { Mali, Sarabun } from "next/font/google";
import { AppProviders } from "@/context/app-providers";
import { ThemeApplier } from "@/components/theme-applier";
import { FrameSwitcher } from "@/components/layout/frame-switcher";
import { PwaRegister } from "@/components/pwa/pwa-register";
import "./globals.css";

const sarabun = Sarabun({
  variable: "--font-body",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
});

const mali = Mali({
  variable: "--font-display",
  subsets: ["thai", "latin"],
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  title: "FastOrder | สั่งเครื่องดื่มผ่าน QR",
  description:
    "ระบบสั่งเครื่องดื่มออนไลน์ผ่าน QR Code สำหรับร้านเครื่องดื่ม",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "FastOrder",
  },
};

export const viewport: Viewport = {
  themeColor: "#0EA5E9",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th"
      data-theme="sky-orange"
      data-scroll-behavior="smooth"
      className={`${sarabun.variable} ${mali.variable} h-full`}
    >
      <body className="min-h-full antialiased">
        <AppProviders>
          <PwaRegister />
          <ThemeApplier />
          <FrameSwitcher>{children}</FrameSwitcher>
        </AppProviders>
      </body>
    </html>
  );
}
