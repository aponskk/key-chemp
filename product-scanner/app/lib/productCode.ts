
export function normalizeProductCode(input: string): string | null {
  let code = input.trim();

  // Убираем идентификаторы формата, которые иногда добавляет сканер.
  code = code.replace(/^\]d2/, "").replace(/^\]C1/, "");

  // EAN-8, UPC-A, EAN-13, GTIN-14.
  if (/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(code)) {
    return code;
  }

  // GS1 Data Matrix: AI 01 + GTIN-14.
  // Остальная часть строки может содержать серийный номер и другие данные.
  const match = code.match(/(?:^|\x1D)01(\d{14})/);

  if (match) {
    const gtin = match[1];

    // GTIN-14 с ведущим нулём можно искать как EAN-13.
    return gtin.startsWith("0") ? gtin.slice(1) : gtin;
  }

  return null;
}
