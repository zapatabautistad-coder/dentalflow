export function cleanPhoneDigits(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "").slice(0, 10);
}

export function formatDominicanPhone(value: string | null | undefined): string {
  const digits = cleanPhoneDigits(value);

  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;

  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

export function cleanDocumentIdDigits(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "").slice(0, 11);
}

export function formatDominicanDocumentId(
  value: string | null | undefined
): string {
  const digits = cleanDocumentIdDigits(value);

  if (digits.length <= 3) return digits;
  if (digits.length <= 10) return `${digits.slice(0, 3)}-${digits.slice(3)}`;

  return `${digits.slice(0, 3)}-${digits.slice(3, 10)}-${digits.slice(10, 11)}`;
}
