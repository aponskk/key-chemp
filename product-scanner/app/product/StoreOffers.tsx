
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
  latitude?: string;
  longitude?: string;
  delivery_service?: string;
  delivery_fee_rub?: string;
  delivery_minimum_rub?: string;
};

type Props = {
  code: string;
  brand: string;
  productName: string;
};

function isPromo(offer: Offer) {
  return offer.is_promo.trim().toLowerCase() === "true";
}

function isAvailable(offer: Offer) {
  return normalize(offer.availability) !== normalize("Нет в наличии");
}

// Сопоставляем товар с каталогом по бренду и названию.
// Если названия неоднозначны, не показываем неподтверждённые цены.
function normalize(value: string): string {
  return value
    .toLocaleLowerCase("ru")
    .replace(/ё/g, "е")
    .replace(/&/g, " ")
    .replace(/[^a-zа-я0-9]+/gi, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function hasAny(text: string, words: string[]): boolean {
  return words.some((word) => text.includes(normalize(word)));
}

function matchesProduct(
  offer: Offer,
  brand: string,
  productName: string,
  code: string
): boolean {
  // Если в CSV есть штрихкод, используем точное совпадение.
  if (offer.barcode?.trim() && code.trim()) {
    return offer.barcode.trim() === code.trim();
  }

  const dbBrand = normalize(offer.brand);
  const dbName = normalize(offer.product_name);
  const scannedBrand = normalize(brand);
  const scannedName = normalize(productName);

  if (!dbBrand || !dbName || !scannedName) {
    return false;
  }

  // Сначала проверяем бренд.
  const brandMatches =
    dbBrand === scannedBrand ||
    dbBrand.includes(scannedBrand) ||
    scannedBrand.includes(dbBrand);

  if (!brandMatches) {
    return false;
  }

  const combined = `${scannedName} ${scannedBrand}`;
  const dbCombined = `${dbName} ${dbBrand}`;

  // Различаем вкусы чипсов, чтобы не показывать другой товар.
  const flavors = [
    {
      words: ["краб", "crab"],
      aliases: ["краб", "crab"],
    },
    {
      words: ["сметана", "лук", "sour cream", "onion"],
      aliases: ["сметана", "лук", "sour cream", "onion"],
    },
    {
      words: ["арбуз", "watermelon"],
      aliases: ["арбуз", "watermelon"],
    },
    {
      words: ["мята", "mint"],
      aliases: ["мята", "mint"],
    },
    {
      words: ["злак", "злаки", "cereal", "grain"],
      aliases: ["злак", "cereal", "grain"],
    },
  ];

  for (const flavor of flavors) {
    const scannedHasFlavor = hasAny(combined, flavor.words);
    const dbHasFlavor = hasAny(dbCombined, flavor.aliases);

    if (scannedHasFlavor !== dbHasFlavor) {
      return false;
    }
  }

  // Проверяем категорию товара.
  const categories = [
    {
      words: ["сок", "juice", "jus"],
      aliases: ["сок", "juice", "jus"],
    },
    {
      words: ["чипс", "chips", "crisps"],
      aliases: ["чипс", "chips", "crisps"],
    },
    {
      words: ["жвач", "резинк", "gum", "chewing"],
      aliases: ["жвач", "резинк", "gum", "chewing"],
    },
    {
      words: ["йогурт", "yogurt", "yoghurt"],
      aliases: ["йогурт", "yogurt", "yoghurt"],
    },
  ];

  for (const category of categories) {
    const scannedHasCategory = hasAny(combined, category.words);
    const dbHasCategory = hasAny(dbCombined, category.aliases);

    if (scannedHasCategory && !dbHasCategory) {
      return false;
    }
  }

  // Совпадение бренда и названия либо узнаваемых ключевых слов.
  // Не показываем цену только по одному совпавшему слову: это может
  // сопоставить разные вкусы или размеры упаковки.
  return (
    dbName === scannedName ||
    dbName.includes(scannedName) ||
    scannedName.includes(dbName)
  );
}

export default function StoreOffers({
  code,
  brand,
  productName,
}: Props) {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showAll, setShowAll] = useState(true);
  const [radiusMode, setRadiusMode] = useState<"10" | "50" | "all">("all");
  const [userPosition, setUserPosition] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationMessage, setLocationMessage] = useState("");
  const [locationLoading, setLocationLoading] = useState(false);

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
          // Убираем BOM, пробелы и случайные звёздочки в названиях колонок.
          transformHeader: (header) => header.replace(/^\uFEFF/, "").trim().replace(/^\*+|\*+$/g, ""),
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

  // Для нового товара показываем все предложения, соответствующие выбранному режиму.
  useEffect(() => {
    setShowAll(true);
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

  function distanceKm(latitude: number, longitude: number) {
    if (!userPosition) return null;
    const radians = (degrees: number) => (degrees * Math.PI) / 180;
    const dLat = radians(latitude - userPosition.latitude);
    const dLon = radians(longitude - userPosition.longitude);
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(radians(userPosition.latitude)) * Math.cos(radians(latitude)) * Math.sin(dLon / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  const offersWithDistance = useMemo(() => matchedOffers.map((offer) => {
    const lat = Number(offer.latitude);
    const lon = Number(offer.longitude);
    const hasCoordinates = offer.latitude?.trim() !== "" && offer.longitude?.trim() !== "" &&
      Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
    return { offer, distance: userPosition && hasCoordinates ? distanceKm(lat, lon) : null, hasCoordinates };
  }), [matchedOffers, userPosition]);

  const nearbyOffers = useMemo(() => {
    if (!userPosition) return [];
    const radius = radiusMode === "10" ? 10 : 50;
    return offersWithDistance
      .filter((item) => item.distance !== null && item.distance <= radius)
      .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity))
      .map((item) => item.offer);
  }, [offersWithDistance, userPosition, radiusMode]);

  const shownOffers = radiusMode === "all" ? matchedOffers : nearbyOffers;
  const cheapest = shownOffers.find(isAvailable);
  const visibleOffers = showAll ? shownOffers : cheapest ? [cheapest] : shownOffers.slice(0, 1);

  function requestLocation() {
    if (!navigator.geolocation) {
      setLocationMessage("Этот браузер не поддерживает геолокацию. Можно выбрать «Все магазины».");
      return;
    }
    setLocationLoading(true);
    setLocationMessage("Определяем местоположение…");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserPosition({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        setLocationLoading(false);
        setLocationMessage("Расстояние рассчитано по координатам. Точки в базе могут быть тестовыми.");
      },
      () => {
        setLocationLoading(false);
        setLocationMessage("Не удалось получить геолокацию. Разреши доступ к местоположению в настройках браузера или выбери «Все магазины».");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  }

  function selectRadius(mode: "10" | "50" | "all") {
    setRadiusMode(mode);
    setShowAll(true);
    if (mode === "all") {
      setLocationMessage("Показываем все предложения из базы, независимо от расстояния.");
      return;
    }
    if (userPosition) {
      setLocationMessage(`Показываем магазины в радиусе ${mode} км от вашего местоположения.`);
      return;
    }
    requestLocation();
  }

  const deliveryRows = useMemo(() => {
    const fromDatabase = shownOffers
      .filter((offer) => offer.delivery_service && Number.isFinite(Number(offer.delivery_fee_rub)))
      .map((offer) => ({ service: offer.delivery_service as string, fee: Number(offer.delivery_fee_rub), productPrice: Number(offer.current_price_rub), total: Number(offer.current_price_rub) + Number(offer.delivery_fee_rub), minimum: offer.delivery_minimum_rub ? Number(offer.delivery_minimum_rub) : null, source: "База приложения" }));
    if (fromDatabase.length) return fromDatabase;
    return [
      { service: "Купер", fee: 100, productPrice: 100, total: 200, minimum: null, source: "Пример механики" },
      { service: "Самокат", fee: 110, productPrice: 100, total: 210, minimum: null, source: "Пример механики" },
    ];
  }, [shownOffers]);

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
        <div className="store-heading-actions">
          <div className="store-radius-switch" role="group" aria-label="Радиус поиска магазинов">
            <button type="button" className={`store-radius-option ${radiusMode === "10" ? "active" : ""}`} aria-pressed={radiusMode === "10"} onClick={() => selectRadius("10")}>10 км</button>
            <button type="button" className={`store-radius-option ${radiusMode === "50" ? "active" : ""}`} aria-pressed={radiusMode === "50"} onClick={() => selectRadius("50")}>50 км</button>
            <button type="button" className={`store-radius-option ${radiusMode === "all" ? "active" : ""}`} aria-pressed={radiusMode === "all"} onClick={() => selectRadius("all")}>Все магазины</button>
          </div>
          {radiusMode !== "all" && !userPosition && (
            <button className="store-toggle" type="button" onClick={requestLocation} disabled={locationLoading}>
              {locationLoading ? "Определяем…" : "Повторить геолокацию"}
            </button>
          )}
          {radiusMode === "all" && !loading && shownOffers.length > 1 && (
            <button className="store-toggle" type="button" onClick={() => setShowAll((value) => !value)}>
              {showAll ? "Показать одну цену" : "Показать все цены"}
            </button>
          )}
        </div>
      </div>
      {locationMessage && <p className="store-location-message">{locationMessage}</p>}

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

      {!loading && !error && radiusMode !== "all" && !userPosition && (
        <div className="store-offers-empty">
          <strong>Нужно разрешить геолокацию</strong>
          <p>Чтобы отфильтровать магазины в радиусе {radiusMode} км, разреши доступ к местоположению в браузере. Либо выбери «Все магазины».</p>
        </div>
      )}

      {!loading && !error && radiusMode !== "all" && userPosition && nearbyOffers.length === 0 && (
        <div className="store-offers-empty">
          <strong>В радиусе {radiusMode} км предложений не найдено</strong>
          <p>Проверь координаты магазинов в CSV. Если точки искусственные и расположены в Москве, а ты находишься далеко от Москвы, они не попадут в этот радиус.</p>
        </div>
      )}

      {!loading && !error && shownOffers.length > 0 && (
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
                    {userPosition && offer.latitude?.trim() && offer.longitude?.trim() && Number.isFinite(Number(offer.latitude)) && Number.isFinite(Number(offer.longitude)) && (
                      <p className="store-distance">{distanceKm(Number(offer.latitude), Number(offer.longitude))?.toLocaleString("ru-RU", { maximumFractionDigits: 1 })} км от вас</p>
                    )}
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
            Цены и наличие берутся из локального CSV-файла приложения. Если база тестовая или устарела, данные могут не совпадать с ценами магазинов в реальном времени.
          </p>
        </>
      )}

      <section className="delivery-compare" aria-label="Сравнение доставки">
        <div>
          <p className="store-offers-eyebrow">ДОСТАВКА</p>
          <h3>Сколько стоит привезти?</h3>
          <p className="delivery-note">Стоимость доставки показывается отдельно от цены товара. Если в CSV заполнены delivery_service и delivery_fee_rub, используются данные базы; иначе показан пример работы интерфейса.</p>
        </div>
        <div className="delivery-options">
          {deliveryRows.map((row, index) => (
            <div className="delivery-option" key={`${row.service}-${index}`}>
              <span>{row.service}</span>
              <strong>Доставка: {formatPrice(String(row.fee))}</strong>
              <small>Товар: {formatPrice(String(row.productPrice))}</small>
              <small>Итого: {formatPrice(String(row.total))}</small>
              {row.minimum !== null && <small>Минимальный заказ: {formatPrice(String(row.minimum))}</small>}
              <small>{row.source}</small>
            </div>
          ))}
        </div>
        <p className="store-offers-disclaimer">Примерные суммы показаны только для демонстрации расчёта. Они не являются актуальными ценами или тарифами Купера и Самоката.</p>
      </section>
    </section>
  );
}
