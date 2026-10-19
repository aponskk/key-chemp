
"use client";

import { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import "./search.css";

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
  quantity?: string;
  categories?: string;
  delivery_service?: string;
  delivery_fee_rub?: string;
  delivery_minimum_rub?: string;
  delivery_eta_min?: string;
  delivery_available?: string;
};

export default function SearchPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("Москва");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);

  useEffect(() => {
    async function loadOffers() {
      try {
        const response = await fetch("/data/product_offers.csv");

        if (!response.ok) {
          throw new Error("Не удалось загрузить файл с товарами");
        }

        const csv = await response.text();

        const parsed = Papa.parse<Offer>(csv, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header) => header.replace(/^\uFEFF/, "").trim().replace(/^\*+|\*+$/g, ""),
        });

        if (parsed.errors.length > 0) {
          console.error("Ошибки CSV:", parsed.errors);
        }

        setOffers(parsed.data.filter(
          (item) =>
            item.brand?.trim() &&
            item.product_name?.trim() &&
            item.current_price_rub?.trim() !== "" &&
            Number.isFinite(Number(item.current_price_rub))
        ));
      } catch (err) {
        console.error(err);
        setError("Не удалось загрузить базу товаров. Проверь файл CSV.");
      } finally {
        setLoading(false);
      }
    }

    loadOffers();
  }, []);

  const results = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("ru");
    const normalizedCity = city.trim().toLocaleLowerCase("ru");

    if (!normalizedQuery) return [];

    return offers
      .filter((item) => {
        const fullName =
          `${item.brand} ${item.product_name}`.toLocaleLowerCase("ru");

        const matchesQuery = fullName.includes(normalizedQuery);
        const matchesCity =
          !normalizedCity ||
          item.city.toLocaleLowerCase("ru").includes(normalizedCity);

        return matchesQuery && matchesCity;
      })
      .sort((a, b) => {
        const aAvailable = a.availability !== "Нет в наличии";
        const bAvailable = b.availability !== "Нет в наличии";

        // Сначала товары, которые есть в наличии.
        if (aAvailable !== bAvailable) {
          return aAvailable ? -1 : 1;
        }

        // Затем самая низкая текущая цена.
        const priceDifference =
          Number(a.current_price_rub) - Number(b.current_price_rub);

        if (priceDifference !== 0) return priceDifference;

        // При одинаковой цене выше предложение с акцией.
        return Number(b.is_promo === "true") -
          Number(a.is_promo === "true");
      });
  }, [offers, query, city]);

  const lowestAvailablePrice = useMemo(() => {
    const availablePrices = results
      .filter((item) => item.availability !== "Нет в наличии")
      .map((item) => Number(item.current_price_rub));

    return availablePrices.length
      ? Math.min(...availablePrices)
      : null;
  }, [results]);

  function formatPrice(value: string | number) {
    return `${Number(value).toLocaleString("ru-RU", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ₽`;
  }

  return (
    <main className="search-page">
      <header className="search-heading">
        <a href="/" className="search-back">
          ← На главную
        </a>
        <p className="search-eyebrow">СРАВНЕНИЕ ЦЕН</p>
        <h1>Найди товар дешевле</h1>
        <p className="search-subtitle">
          Сравни цены, акции и наличие в разных магазинах.
        </p>
      </header>

      <section className="search-controls">
        <label className="search-field">
          <span>Название товара</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Например, сок яблочный"
          />
        </label>

        <label className="search-field">
          <span>Город</span>
          <input
            type="text"
            value={city}
            onChange={(event) => setCity(event.target.value)}
            placeholder="Например, Москва"
          />
        </label>
      </section>

      {loading && <p className="search-message">Загружаем товары...</p>}

      {!loading && error && (
        <p className="search-error">{error}</p>
      )}

      {!loading && !error && !query.trim() && (
        <div className="search-empty">
          <span className="search-empty-icon">⌕</span>
          <h2>Что будем искать?</h2>
          <p>Введи название или бренд товара.</p>
          <div className="search-suggestions">
            {["сок яблочный", "чипсы", "йогурт", "жвачка"].map((item) => (
              <button
                type="button"
                key={item}
                onClick={() => setQuery(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      )}

      {!loading && !error && query.trim() && (
        <section className="search-results">
          <div className="search-results-heading">
            <div>
              <h2>Результаты поиска</h2>
              <p>Город: {city.trim() || "любой"}</p>
            </div>
            <span className="search-count">
              {results.length} предложений
            </span>
          </div>

          {results.length === 0 ? (
            <div className="search-empty">
              <h2>Ничего не найдено</h2>
              <p>
                Проверь название товара или попробуй другой город.
              </p>
            </div>
          ) : (
            <div className="search-offer-list">
              {results.map((item, index) => {
                const price = Number(item.current_price_rub);
                const isPromo = item.is_promo === "true";
                const isAvailable =
                  item.availability !== "Нет в наличии";
                const isCheapest =
                  isAvailable && price === lowestAvailablePrice;

                return (
                  <article
                    key={`${item.brand}-${item.product_name}-${item.store}-${item.store_address}-${index}`}
                    className={[
                      "search-offer",
                      isPromo ? "search-offer-promo" : "",
                      isCheapest ? "search-offer-cheapest" : "",
                      !isAvailable ? "search-offer-unavailable" : "",
                    ].filter(Boolean).join(" ")}
                  >
                    <div className="offer-main">
                      <div className="offer-title-row">
                        <div>
                          <p className="offer-brand">{item.brand}</p>
                          <button
                            type="button"
                            className="offer-product-link"
                            onClick={() => setSelectedOffer(item)}
                            aria-label={`Подробнее о товаре ${item.brand} ${item.product_name}`}
                          >
                            {item.product_name}
                            <span aria-hidden="true"> ↗</span>
                          </button>
                        </div>

                        {isPromo && (
                          <span className="offer-badge offer-badge-promo">
                            Акция
                          </span>
                        )}
                        {isCheapest && (
                          <span className="offer-badge offer-badge-cheapest">
                            Дешевле всех
                          </span>
                        )}
                      </div>

                      <div className="offer-store">
                        <span className="offer-store-icon">⌂</span>
                        <div>
                          <strong>{item.store}</strong>
                          <p>{item.city}</p>
                        </div>
                      </div>

                      <p className="offer-address">
                        <span>Адрес:</span> {item.store_address}
                      </p>

                      <p className={
                        isAvailable
                          ? "offer-availability"
                          : "offer-availability offer-availability-none"
                      }>
                        <span className="offer-status-dot" />
                        {item.availability}
                      </p>

                      <div className="offer-delivery-summary">
                        <strong>Доставка</strong>
                        {item.delivery_service?.trim() && item.delivery_fee_rub?.trim() && Number.isFinite(Number(item.delivery_fee_rub)) ? (
                          <span>
                            {item.delivery_service}: {formatPrice(item.delivery_fee_rub)}
                            {item.delivery_eta_min?.trim() && Number.isFinite(Number(item.delivery_eta_min)) ? ` · около ${item.delivery_eta_min} мин` : ""}
                          </span>
                        ) : (
                          <span className="offer-delivery-unknown">Информация не указана</span>
                        )}
                      </div>
                    </div>

                    <div className="offer-price-block">
                      <strong className="offer-price">
                        {formatPrice(item.current_price_rub)}
                      </strong>

                      {isPromo && (
                        <span className="offer-old-price">
                          Обычная: {formatPrice(item.regular_price_rub)}
                        </span>
                      )}

                      {isCheapest && (
                        <span className="offer-price-note">
                          Минимальная цена
                        </span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <p className="search-disclaimer">
            Цены и остатки — демонстрационные данные, не актуальные
            предложения магазинов.
          </p>
        </section>
      )}

      {selectedOffer && (
        <div className="offer-detail-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setSelectedOffer(null);
        }}>
          <section
            className="offer-detail-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="offer-detail-title"
          >
            <button
              type="button"
              className="offer-detail-close"
              onClick={() => setSelectedOffer(null)}
              aria-label="Закрыть подробности"
            >×</button>
            <p className="offer-brand">{selectedOffer.brand}</p>
            <h2 id="offer-detail-title">{selectedOffer.product_name}</h2>
            {selectedOffer.quantity?.trim() && <p className="offer-detail-muted">Упаковка: {selectedOffer.quantity}</p>}
            {selectedOffer.categories?.trim() && <p className="offer-detail-muted">Категория: {selectedOffer.categories}</p>}
            <div className="offer-detail-price">{formatPrice(selectedOffer.current_price_rub)}</div>
            {selectedOffer.is_promo?.trim().toLowerCase() === "true" && selectedOffer.regular_price_rub?.trim() && (
              <p className="offer-detail-muted">Обычная цена: {formatPrice(selectedOffer.regular_price_rub)}</p>
            )}
            <dl className="offer-detail-list">
              <div><dt>Магазин</dt><dd>{selectedOffer.store || "Не указан"}</dd></div>
              <div><dt>Город</dt><dd>{selectedOffer.city || "Не указан"}</dd></div>
              <div><dt>Адрес</dt><dd>{selectedOffer.store_address || "Не указан"}</dd></div>
              <div><dt>Наличие</dt><dd>{selectedOffer.availability || "Статус не указан"}</dd></div>
            </dl>
            <div className="offer-detail-delivery">
              <h3>Доставка</h3>
              {selectedOffer.delivery_service?.trim() && selectedOffer.delivery_fee_rub?.trim() && Number.isFinite(Number(selectedOffer.delivery_fee_rub)) ? (
                <>
                  <p><strong>{selectedOffer.delivery_service}</strong> — {formatPrice(selectedOffer.delivery_fee_rub)}</p>
                  {selectedOffer.delivery_minimum_rub?.trim() && Number.isFinite(Number(selectedOffer.delivery_minimum_rub)) && <p>Минимальный заказ: {formatPrice(selectedOffer.delivery_minimum_rub)}</p>}
                  {selectedOffer.delivery_eta_min?.trim() && Number.isFinite(Number(selectedOffer.delivery_eta_min)) && <p>Ориентировочное время: {selectedOffer.delivery_eta_min} мин</p>}
                  {selectedOffer.delivery_available?.trim() && <p>Доступность: {selectedOffer.delivery_available}</p>}
                </>
              ) : <p className="offer-delivery-unknown">Данные о доставке для этого предложения не указаны.</p>}
            </div>
            {selectedOffer.barcode?.trim() && (
              <a className="offer-detail-product-link" href={`/product?code=${encodeURIComponent(selectedOffer.barcode.trim())}`}>
                Открыть полную карточку продукта
              </a>
            )}
            <p className="offer-detail-footnote">Состав и пищевая ценность не хранятся в этой записи базы цен. Если есть штрихкод, полная карточка загружается из Open Food Facts.</p>
          </section>
        </div>
      )}
    </main>
  );
}
