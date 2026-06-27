export type AdminPageConfig = {
  href: string;
  navLabel: string;
  title: string;
  subtitle?: string;
  icon: string;
  exact?: boolean;
};

export const ADMIN_PAGES: AdminPageConfig[] = [
  {
    href: "/admin",
    navLabel: "แดชบอร์ด",
    title: "แดชบอร์ด",
    subtitle: "ภาพรวมออเดอร์วันนี้",
    icon: "📊",
    exact: true,
  },
  {
    href: "/admin/shop",
    navLabel: "ร้าน",
    title: "ข้อมูลร้าน",
    subtitle: "ชื่อร้าน ที่อยู่ และโลโก้ที่แสดงหน้าลูกค้า",
    icon: "🏪",
  },
  {
    href: "/admin/orders",
    navLabel: "ออเดอร์",
    title: "ออเดอร์",
    subtitle: "รับออเดอร์ อัปเดตสถานะ และยกเลิก",
    icon: "📋",
  },
  {
    href: "/admin/menu",
    navLabel: "เมนู",
    title: "จัดการเมนู",
    subtitle: "แก้ไขชื่อ ราคา รูปภาพ ท็อปปิ้ง และเอ็ดออน",
    icon: "🍹",
  },
  {
    href: "/admin/promos",
    navLabel: "โค้ดลด",
    title: "โค้ดลด / โปรโมชั่น",
    subtitle: "จัดเวลาโปรโมชั่น เปอร์เซ็นต์ลด และจำนวนตั๋วที่ใช้ได้",
    icon: "🏷️",
  },
  {
    href: "/admin/referrers",
    navLabel: "ผู้แนะนำ",
    title: "ผู้แนะนำ",
    subtitle: "ดูคะแนนจากการแนะนำลูกค้า — 1 คน = 10 คะแนน",
    icon: "🤝",
  },
  {
    href: "/admin/customers",
    navLabel: "ลูกค้า",
    title: "ลูกค้า",
    subtitle: "รายชื่อลูกค้าและสถิติลูกค้าซื้อซ้ำ",
    icon: "👥",
  },
  {
    href: "/admin/best-sellers",
    navLabel: "ขายดี",
    title: "เมนูขายดี",
    subtitle: "รายงานเมนูขายดีจากยอดขายจริง",
    icon: "🔥",
  },
  {
    href: "/admin/rewards",
    navLabel: "รางวัล",
    title: "การแลกรางวัล",
    subtitle: "ประวัติการแลกเครื่องดื่มฟรีด้วยคะแนน",
    icon: "🎁",
  },
];

export function isAdminNavActive(
  pathname: string,
  href: string,
  exact?: boolean,
) {
  return exact ? pathname === href : pathname.startsWith(href);
}

export function getAdminPageMeta(pathname: string) {
  if (/^\/admin\/orders\/[^/]+$/.test(pathname)) {
    return { title: "รายละเอียดออเดอร์" as const, subtitle: undefined };
  }

  const page = ADMIN_PAGES.find((item) =>
    isAdminNavActive(pathname, item.href, item.exact),
  );

  if (page) {
    return { title: page.title, subtitle: page.subtitle };
  }

  return { title: "Admin", subtitle: undefined };
}
