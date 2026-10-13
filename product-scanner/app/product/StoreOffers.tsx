
"use client";

import { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import "./store-offers.css";

type Offer = {
  brand: string;
  product_name: string;
  current_price_rub: string;
  regular_price_rub: string;
  is_promo: string;
  store: string;
  city: string;
  store_address: string;
  availability: string;
  barcode?: string;
};

type Props = {
  code: string;
  brand: string;
  productName: string;
};

function normalize(value: string) {
  return value
    .toLocaleLowerCase("ru")
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я0-9]+/gi, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function isPromo(offer: Offer) {
  return offer.is_promo.trim().toLowerCase() === "true";
}

function isAvailable(offer: Offer) {
  return normalize(offer.availability) !== normalize("Нет в наличии");
}

// Сопоставляем товар с каталогом по бренду и названию.
// Если названия неоднозначны, не показываем неподтверждённые цены.
function matchesProduct(
  offer: Offer,
  brand: string,
  productName: string,
  code: string
) {
  // Если в CSV добавлен штрихкод, он имеет приоритет.
  if (offer.barcode?.trim() && code) {
    return offer.barcode.trim() === code;
  }

  const dbBrand = normalize(offer.brand);
  const scannedBrand = normalize(brand);
  const dbName = normalize(offer.product_name);
  const scannedName = normalize(productName);

  if (!dbBrand || !scannedBrand || !dbName || !scannedName) {
    return false;
  }

  const brandMatches =
    dbBrand === scannedBrand ||
    dbBrand.includes(scannedBrand) ||
    scannedBrand.includes(dbBrand);

  if (!brandMatches) return false;

  // Сопоставляем содержательные слова, игнорируя объём и общие слова.
  const ignored = new Set([
    "с", "со", "и", "вкусом", "вкус", "для", "напиток",
    "продукт", "яблочный", "яблочная", "яблочное",
    "сок", "чипсы", "жвачка", "биойогурт", "йогурт",
    "литр", "л", "мл", "г", "гр"
  ]);

  const meaningfulTokens = (value: string) =>
    value
      .split(" ")
      .filter((word) => word.length > 1 && !ignored.has(word));

  const dbTokens = meaningfulTokens(dbName);
  const scannedTokens = meaningfulTokens(scannedName);

  // Если в названиях не осталось специфичных слов,
  // не пытаемся угадывать товар только по бренду.
  if (dbTokens.length === 0 || scannedTokens.length === 0) {
    return dbName === scannedName;
  }

  // Не допускаем совпадения разных вкусов Lay's только по бренду.
  const flavorTokens = [
    "краб", "краба", "crab",
    "сметана", "лук", "onion", "cream",
    "арбуз", "watermelon", "мята", "mint",
    "злаками", "злаки", "cereal"
  ];

  const dbFlavors = dbTokens.filter((token) =>
    flavorTokens.includes(token)
  );
  const scannedFlavors = scannedTokens.filter((token) =>
    flavorTokens.includes(token)
  );

  if (dbFlavors.length > 0 && scannedFlavors.length > 0) {
    const flavorOverlap = dbFlavors.some((token) =>
      scannedFlavors.includes(token)
    );

    if (!flavorOverlap) return false;
  }

  const matchedTokens = dbTokens.filter((token) =>
    scannedTokens.includes(token)
  );

  // Требуем достаточно сильного совпадения названий.
  const similarity =
    matchedTokens.length / Math.max(dbTokens.length, scannedTokens.length);

  return similarity >= 0.6;
}

export default function StoreOffers({
  code,
  brand,
  productName,
}: Props) {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadOffers() {
      try {
        setLoading(true);
        setError(false);

        const response = await fetch("/data/product_offers.csv");

        if (!response.ok) {
          throw new Error("CSV недоступен");
        }

        const csv = await response.text();
        const parsed = Papa.parse<Offer>(csv, {
          header: true,
          skipEmptyLines: true,
        });

        if (parsed.errors.length > 0) {
          console.error("Ошибки чтения CSV:", parsed.errors);
        }

        if (!cancelled) {
          setOffers(parsed.data);
        }
      } catch (err) {
        console.error("Не удалось загрузить предложения:", err);
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadOffers();

    return () => {
      cancelled = true;
    };
  }, []);

  // При сканировании нового товара закрываем раскрытый список.
  useEffect(() => {
    setShowAll(false);
  }, [code, brand, productName]);

  const matchedOffers = useMemo(() => {
    return offers
      .filter((offer) =>
        matchesProduct(offer, brand, productName, code)
      )
      .sort((a, b) => {
        // Доступные предложения всегда выше отсутствующих.
        if (isAvailable(a) !== isAvailable(b)) {
          return isAvailable(a) ? -1 : 1;
        }

        // Внутри каждой группы сортируем по текущей цене.
        const priceDiff =
          Number(a.current_price_rub) - Number(b.current_price_rub);

        if (priceDiff !== 0) return priceDiff;

        // При одинаковой цене акция выше обычного предложения.
        return Number(isPromo(b)) - Number(isPromo(a));
      });
  }, [offers, brand, productName, code]);

  const cheapest = matchedOffers.find(isAvailable);
  const visibleOffers = showAll
    ? matchedOffers
    : cheapest
      ? [cheapest]
      : matchedOffers.slice(0, 1);

  function formatPrice(value: string) {
    return `${Number(value).toLocaleString("ru-RU", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ₽`;
  }

  return (
    <section className="store-offers">
      <div className="store-offers-heading">
        <div>
          <p className="store-offers-eyebrow">СРАВНЕНИЕ ЦЕН</p>
          <h2>Где купить дешевле</h2>
        </div>
        {!loading && matchedOffers.length > 1 && (
          <button
            className="store-toggle"
            type="button"
            onClick={() => setShowAll((value) => !value)}
          >
            {showAll ? "Свернуть" : "Все магазины"}
          </button>
        )}
      </div>

      {loading && (
        <p className="store-offers-message">
          Ищем предложения в тестовой базе...
        </p>
      )}

      {!loading && error && (
        <p className="store-offers-message store-offers-error">
          Не удалось загрузить базу предложений. Проверь файл CSV.
        </p>
      )}

      {!loading && !error && matchedOffers.length === 0 && (
        <div className="store-offers-empty">
          <span className="store-empty-icon">⌕</span>
          <strong>Информация о ценах не найдена</strong>
          <p>
            Товар может быть в каталоге продуктов, но пока отсутствовать
            в нашей тестовой базе магазинов.
          </p>
        </div>
      )}

      {!loading && !error && matchedOffers.length > 0 && (
        <>
          <div className="store-offers-list">
            {visibleOffers.map((offer, index) => {
              const available = isAvailable(offer);
              const promo = isPromo(offer);
              const isCheapest = available && offer === cheapest;

              return (
                <article
                  key={`${offer.brand}-${offer.product_name}-${offer.store}-${offer.store_address}-${index}`}
                  className={[
                    "store-offer-card",
                    isCheapest ? "store-offer-cheapest" : "",
                    promo ? "store-offer-promo" : "",
                    !available ? "store-offer-unavailable" : "",
                  ].filter(Boolean).join(" ")}
                >
                  <div className="store-offer-info">
                    <div className="store-offer-tags">
                      {isCheapest && (
                        <span className="store-tag store-tag-cheapest">
                          Самая низкая цена
                        </span>
                      )}
                      {promo && (
                        <span className="store-tag store-tag-promo">
                          Акция
                        </span>
                      )}
                    </div>

                    <h3>{offer.store}</h3>
                    <p className="store-offer-city">{offer.city}</p>
                    <p className="store-offer-address">
                      <span>Адрес:</span> {offer.store_address}
                    </p>
                    <p
                      className={
                        available
                          ? "store-stock"
                          : "store-stock store-stock-none"
                      }
                    >
                      <span className="store-stock-dot" />
                      {offer.availability}
                    </p>
                  </div>

                  <div className="store-offer-price-area">
                    <strong className="store-offer-price">
                      {formatPrice(offer.current_price_rub)}
                    </strong>

                    {promo && (
                      <span className="store-offer-old-price">
                        Без акции: {formatPrice(offer.regular_price_rub)}
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>

          <p className="store-offers-disclaimer">
            Это демонстрационные цены и остатки. Они не подтверждены
            магазинами и могут не соответствовать реальности.
          </p>
        </>
      )}
    </section>
  );
}
