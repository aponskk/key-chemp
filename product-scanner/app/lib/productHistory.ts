export type ProductHistoryItem = {
  code: string;
  name: string;
  brand: string;
  quantity: string;
  image: string;
  scannedAt: number;
};

const STORAGE_KEY = "product-scanner-history";
const MAX_HISTORY_ITEMS = 100;

export function getProductHistory(): ProductHistoryItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return [];
    }

    const parsed: unknown = JSON.parse(saved);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (item): item is ProductHistoryItem =>
        typeof item === "object" &&
        item !== null &&
        typeof item.code === "string" &&
        typeof item.name === "string" &&
        typeof item.scannedAt === "number"
    );
  } catch {
    return [];
  }
}

export function saveProductToHistory(
  product: Omit<ProductHistoryItem, "scannedAt">
): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const history = getProductHistory();

    const newItem: ProductHistoryItem = {
      ...product,
      scannedAt: Date.now(),
    };

    const updatedHistory = [
      newItem,
      ...history.filter((item) => item.code !== product.code),
    ].slice(0, MAX_HISTORY_ITEMS);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
  } catch (error) {
    console.error("Не удалось сохранить историю:", error);
  }
}

export function clearProductHistory(): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(STORAGE_KEY);
}