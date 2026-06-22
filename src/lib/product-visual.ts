const FRUIT_EMOJI: Record<string, string> = {
  มะนาว: "🍋",
  แตงโม: "🍉",
  สับปะรด: "🍍",
  แอปเปิ้ลแดง: "🍎",
  แอปเปิ้ลเขียว: "🍏",
  สตรอเบอร์รี่: "🍓",
  บลูเบอร์รี่: "🫐",
  เสาวรส: "💛",
  แก้วมังกรขาว: "🤍",
  ฝรั่ง: "🍐",
  ส้ม: "🍊",
  มะม่วง: "🥭",
  สาลี่: "🍐",
  แคนตาลูป: "🍈",
  กล้วย: "🍌",
  องุ่น: "🍇",
  กีวี่: "🥝",
  มิกซ์เบอร์รี่: "🫐",
  อะโวคาโด: "🥑",
  ผลไม้รวม: "🍇",
  มะพร้าว: "🥥",
  บ๊วย: "🟣",
  ลิ้นจี่: "🔴",
};

const CATEGORY_FALLBACK: Record<
  string,
  { emoji: string; gradient: string }
> = {
  "fruit-smoothie": { emoji: "🍓", gradient: "from-rose-400 to-orange-300" },
  smoothie: { emoji: "🥤", gradient: "from-violet-400 to-fuchsia-300" },
  "coconut-smoothie": { emoji: "🥥", gradient: "from-emerald-400 to-teal-300" },
  "fresh-milk": { emoji: "🥛", gradient: "from-sky-300 to-blue-200" },
  "tea-beverage": { emoji: "🍵", gradient: "from-amber-400 to-orange-300" },
  "tea-lemon-soda": { emoji: "🍋", gradient: "from-lime-400 to-cyan-300" },
};

function matchKeyword(name: string, pairs: [string, string][]) {
  for (const [keyword, emoji] of pairs) {
    if (name.includes(keyword)) return emoji;
  }
  return null;
}

export function getProductVisual(name: string, categoryId: string) {
  if (FRUIT_EMOJI[name]) {
    return {
      emoji: FRUIT_EMOJI[name],
      gradient: gradientForName(name),
    };
  }

  const keywordEmoji =
    matchKeyword(name, [
      ["สับปะรด", "🍍"],
      ["โค้ก", "🥤"],
      ["ปีโป้", "🍬"],
      ["โยเกิร์ต", "🥛"],
      ["ยาคูลท์", "🧃"],
      ["ชาไทย", "🧋"],
      ["ชาเขียว", "🍵"],
      ["ชาไต้หวัน", "🧋"],
      ["ชา", "🍵"],
      ["กาแฟ", "☕"],
      ["โกโก้", "🍫"],
      ["มอคค่า", "☕"],
      ["โอวัลติน", "🍫"],
      ["ไมโล", "🥛"],
      ["นมสด", "🥛"],
      ["นม", "🥛"],
      ["มะนาว", "🍋"],
      ["โซดา", "🫧"],
      ["น้ำผึ้ง", "🍯"],
      ["มะพร้าว", "🥥"],
      ["สตรอเบอร์รี่", "🍓"],
      ["มะม่วง", "🥭"],
      ["กล้วย", "🍌"],
      ["บ๊วย", "🟣"],
      ["ลิ้นจี่", "🔴"],
    ]) ?? CATEGORY_FALLBACK[categoryId]?.emoji ?? "🍹";

  return {
    emoji: keywordEmoji,
    gradient: gradientForName(name, categoryId),
  };
}

function gradientForName(name: string, categoryId?: string) {
  if (name.includes("มะนาว") || name.includes("โซดา"))
    return "from-lime-300 to-emerald-200";
  if (name.includes("แตงโม")) return "from-rose-400 to-pink-300";
  if (name.includes("สตรอเบอร์รี่") || name.includes("บลูเบอร์รี่"))
    return "from-pink-400 to-rose-300";
  if (name.includes("มะม่วง")) return "from-amber-400 to-orange-300";
  if (name.includes("กล้วย")) return "from-yellow-300 to-amber-200";
  if (name.includes("มะพร้าว")) return "from-emerald-400 to-teal-300";
  if (name.includes("ชา")) return "from-amber-300 to-orange-200";
  if (name.includes("กาแฟ") || name.includes("มอคค่า"))
    return "from-stone-500 to-amber-700";
  if (name.includes("โกโก้") || name.includes("โอวัลติน"))
    return "from-amber-700 to-orange-400";
  if (name.includes("นม")) return "from-sky-300 to-indigo-200";
  if (name.includes("โอรีโอ")) return "from-stone-600 to-stone-400";

  return (
    CATEGORY_FALLBACK[categoryId ?? ""]?.gradient ??
    "from-sky-400 to-cyan-300"
  );
}
