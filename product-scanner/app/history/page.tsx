"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  clearProductHistory,
  getProductHistory,
  type ProductHistoryItem,
} from "../lib/productHistory";

export default function HistoryPage() {
  const [history, setHistory] = useState<ProductHistoryItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setHistory(getProductHistory());
    setReady(true);
  }, []);

  function handleClearHistory() {
    const confirmed = window.confirm(
      "Удалить всю историю сканирований?"
    );

    if (!confirmed) {
      return;
    }

    clearProductHistory();
    setHistory([]);
  }

  function formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <main className="history-page">
      <header className="history-header">
        <div>
          <h1>История</h1>
          <p>Товары, которые ты сканировал</p>
        </div>

        {history.length > 0 && (
          <button
            className="history-clear-button"
            type="button"
            onClick={handleClearHistory}
          >
            Очистить
          </button>
        )}
      </header>

      {!ready ? (
        <p className="history-message">Загружаем историю...</p>
      ) : history.length === 0 ? (
        <section className="history-empty">
          <div className="history-empty-icon">▦</div>
          <h2>История пока пуста</h2>
          <p>
            Отсканируй товар, и он появится здесь вместе с информацией
            о составе и пищевой ценности.
          </p>
          <Link className="button" href="/scan">
            Открыть сканер
          </Link>
        </section>
      ) : (
        <section className="history-list">
          {history.map((item) => (
            <Link
              className="history-item"
              href={`/product?code=${encodeURIComponent(item.code)}`}
              key={item.code}
            >
              <div className="history-item-content">
                <h2>{item.name}</h2>

                <div className="history-item-meta">
                  {item.brand && (
                    <span className="history-item-brand">{item.brand}</span>
                  )}

                  {item.quantity && (
                    <span className="history-item-quantity">
                      {item.quantity}
                    </span>
                  )}
                </div>

                <p className="history-item-date">
                  Просмотрен {formatDate(item.scannedAt)}
                </p>
              </div>

              <span className="history-item-arrow" aria-hidden="true">
                ↗
              </span>
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}