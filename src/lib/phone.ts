const PHONE_DIGIT_LIMIT = 10;
const PHONE_DISPLAY_MAX_LENGTH = 12;

export function sanitizePhoneDigits(value: string) {
  return value.replace(/\D/g, "").slice(0, PHONE_DIGIT_LIMIT);
}

export function formatPhoneInput(value: string) {
  const digits = sanitizePhoneDigits(value);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function normalizePhone(value: string) {
  return sanitizePhoneDigits(value.trim());
}

export function isValidPhone(phone: string) {
  return /^0\d{9}$/.test(normalizePhone(phone));
}

export function formatPhoneForDisplay(phone: string) {
  const digits = normalizePhone(phone);
  if (!digits) return phone;
  return formatPhoneInput(digits);
}

export const PHONE_INPUT_MAX_LENGTH = PHONE_DISPLAY_MAX_LENGTH;
export const PHONE_PLACEHOLDER = "081-234-5678";
