import { getProductVisual } from "@/lib/product-visual";

export const RESTAURANT = {
  id: "demo-shop",
  name: "สมูทตี้สดใส",
  address: "123 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพฯ 10110",
  latitude: 13.7563,
  longitude: 100.5018,
  deliveryRadius: 10_000,
};

export const TOPPINGS = [
  { id: "pearl", name: "ไข่มุก", price: 10 },
  { id: "brown-sugar", name: "บุกบราวน์ชูการ์", price: 10 },
  { id: "coconut-jelly", name: "วุ้นมะพร้าว", price: 10 },
  { id: "grass-jelly", name: "เฉาก๊วย", price: 10 },
  { id: "basil-seed", name: "เม็ดแมงลัก", price: 10 },
  { id: "volcano", name: "โอวัลตินภูเขาไฟ", price: 15 },
  { id: "sticky-cocoa", name: "โกโก้เหนียว", price: 15 },
];

export const ADDONS = [
  { id: "peppo", name: "ปีโป้", price: 15 },
  { id: "basil-seed-addon", name: "เม็ดแมงลัก", price: 10 },
  { id: "oreo", name: "โอรีโอ", price: 15 },
  { id: "yakult", name: "ยาคูลท์", price: 15 },
  { id: "yogurt", name: "โยเกิร์ต", price: 15 },
  { id: "fresh-milk", name: "นมสด", price: 10 },
  { id: "honey", name: "น้ำผึ้ง", price: 10 },
  { id: "extra-fruit", name: "เพิ่มผลไม้", price: 20 },
];

export const SIZE_OPTIONS = {
  blended: { label: "ปั่น", price: 5 },
  largeCup: { label: "แก้วใหญ่", price: 10 },
};

export const CATEGORIES = [
  {
    id: "fruit-smoothie",
    name: "เมนูผลไม้ปั่น",
    description: "สดชื่นจากผลไม้แท้",
    emoji: "🍓",
  },
  {
    id: "smoothie",
    name: "เมนูน้ำปั่น",
    description: "ครีมมี่ หวานละมุน",
    emoji: "🥤",
  },
  {
    id: "coconut-smoothie",
    name: "เมนูมะพร้าวปั่น",
    description: "หอมมะพร้าวสด",
    emoji: "🥥",
  },
  {
    id: "fresh-milk",
    name: "เมนูนมสด",
    description: "นมสดเข้มข้น",
    emoji: "🥛",
  },
  {
    id: "tea-beverage",
    name: "เมนูชาและเครื่องดื่ม",
    description: "ชาไทย โกโก้ กาแฟ",
    emoji: "🍵",
  },
  {
    id: "tea-lemon-soda",
    name: "เมนูชา มะนาว โซดา",
    description: "เปรี้ยวซ่า สดชื่น",
    emoji: "🍋",
  },
];

function slugify(name: string, index: number) {
  return `${name.replace(/\s+/g, "-")}-${index}`;
}

function createProducts(
  categoryId: string,
  names: string[],
  basePrice: number,
  description: string,
) {
  return names.map((name, index) => {
    const visual = getProductVisual(name, categoryId);
    return {
      id: slugify(name, index),
      categoryId,
      name,
      description,
      basePrice: basePrice + (index % 4) * 5,
      gradient: visual.gradient,
      emoji: visual.emoji,
      isAvailable: true,
    };
  });
}

export const PRODUCTS = [
  ...createProducts(
    "fruit-smoothie",
    [
      "มะนาว",
      "แตงโม",
      "สับปะรด",
      "แอปเปิ้ลแดง",
      "แอปเปิ้ลเขียว",
      "สตรอเบอร์รี่",
      "บลูเบอร์รี่",
      "เสาวรส",
      "แก้วมังกรขาว",
      "ฝรั่ง",
      "ส้ม",
      "มะม่วง",
      "สาลี่",
      "แคนตาลูป",
      "กล้วยนมสด",
      "กล้วยโกโก้",
      "แก้วมังกรแดง",
      "องุ่น",
      "กีวี่",
      "มิกซ์เบอร์รี่",
      "อะโวคาโดนมสด",
      "อะโวคาโดน้ำผึ้ง",
      "อะโวคาโดผลไม้",
      "ผลไม้รวม",
    ],
    55,
    "ปั่นสดจากผลไม้แท้ หวานกำลังดี",
  ),
  ...createProducts(
    "smoothie",
    [
      "โค้กปั่น",
      "บ๊วยโค้กปั่น",
      "ปีโป้นมสด",
      "โอรีโอนมสด",
      "โกโก้โอรีโอ",
      "กล้วยโกโก้โอรีโอ",
      "กล้วยนมสดโอรีโอ",
      "นมสดสตรอเบอร์รี่",
      "กล้วยนมสดสตรอเบอร์รี่",
      "โยเกิร์ตปีโป้",
      "โยเกิร์ตสตรอเบอร์รี่",
      "โยเกิร์ตนมสดโอรีโอ",
      "โยเกิร์ตนมสดกล้วย",
      "โยเกิร์ตยาคูลท์ปีโป้",
      "โยเกิร์ตยาคูลท์ผลไม้",
    ],
    60,
    "เนื้อสัมผัสครีมมี่ อร่อยเต็มแก้ว",
  ),
  ...createProducts(
    "coconut-smoothie",
    [
      "มะพร้าวนมสด",
      "มะพร้าวนมสดมะม่วง",
      "มะพร้าวนมสดสตรอเบอร์รี่",
      "มะพร้าวนมสดคาราเมล",
      "ชาไทยมะพร้าว",
      "ชาเขียวมะพร้าว",
      "ชาไต้หวันมะพร้าว",
      "โกโก้มะพร้าว",
      "กาแฟมะพร้าว",
      "โยเกิร์ตมะพร้าว",
    ],
    65,
    "หอมมะพร้าวสด หวานมันกลมกล่อม",
  ),
  ...createProducts(
    "fresh-milk",
    [
      "นมสด",
      "นมสดโกโก้",
      "นมสดกาแฟ",
      "นมสดชมพู",
      "นมสดชาไทย",
      "นมสดชาเขียว",
      "นมสดชาไต้หวัน",
      "นมสดมอคค่า",
      "นมสดคาราเมล",
      "นมสดสตรอเบอร์รี่",
      "นมสดมิ้นท์",
      "นมสดโกโก้มิ้นท์",
      "นมสดโกโก้เหนียว",
    ],
    45,
    "นมสดเข้มข้น หอมละมุน",
  ),
  ...createProducts(
    "tea-beverage",
    [
      "ชาไทย",
      "ชาเขียว",
      "ชาไต้หวัน",
      "โกโก้",
      "กาแฟ",
      "ชากาแฟ",
      "มอคค่า",
      "โอวัลติน",
      "โอวัลตินภูเขาไฟ",
      "ไมโล",
      "นมถั่วเหลือง",
      "นมชมพู",
      "นมเขียว",
      "โอเลี้ยง",
      "โอเลี้ยงยาคูลท์",
    ],
    40,
    "เครื่องดื่มคลาสสิก รสชาติจำได้",
  ),
  ...createProducts(
    "tea-lemon-soda",
    [
      "ชาดอกไม้",
      "ชาดำเย็น",
      "ชาเขียวดำเย็น",
      "ชาเขียวมะนาว",
      "ชามะนาว",
      "น้ำมะนาว",
      "น้ำมะนาวโซดา",
      "น้ำผึ้งมะนาว",
      "น้ำผึ้งมะนาวโซดา",
      "ชาน้ำผึ้งมะนาว",
      "น้ำบ๊วย",
      "น้ำบ๊วยโซดา",
      "ชาบ๊วย",
      "น้ำแดงโซดา",
      "น้ำเขียวโซดา",
      "ลิ้นจี่โซดา",
      "สตรอเบอร์รี่โซดา",
      "ชาลิ้นจี่",
      "ชาสตรอเบอร์รี่",
    ],
    45,
    "เปรี้ยวซ่า ดับกระหาย",
  ),
];
