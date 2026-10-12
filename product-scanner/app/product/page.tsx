
"use client";

import { useEffect, useState } from "react";
import { normalizeProductCode } from "../lib/productCode";

type Product = {
  product_name?: string;
  generic_name?: string;
  brands?: string;
  categories?: string;
  quantity?: string;
};

type ApiResponse = {
  status: number;
  product?: Product;
};

export default function ProductPage() {
  const [code, setCode] = useState("");
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const productCode = params.get("code");

    if (!productCode) {
      setError("Код товара не указан.");
      setLoading(false);
      return;
    }

    setCode(productCode);

    async function loadProduct() {
      try {
        const response = await fetch(
          `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(
            productCode
          )}?fields=product_name,generic_name,brands,categories,quantity`
        );

        if (!response.ok) {
          throw new Error("Не удалось связаться с базой товаров.");
        }

        const data: ApiResponse = await response.json();

        if (data.status !== 1 || !data.product) {
          setError("Товар не найден в базе.");
          return;
        }

        setProduct(data.product);
      } catch {
        setError(
          "Не удалось загрузить информацию. Проверь подключение к интернету."
        );
      } finally {
        setLoading(false);
      }
    }

    loadProduct();
  }, []);

  if (loading) {
    return (
      <main className="product-page">
        <p>Ищем товар...</p>
      </main>
    );
  }

  if (error || !product) {
    return (
      <main className="product-page">
        <p className="product-label">ИНФОРМАЦИЯ О ТОВАРЕ</p>
        <h1>Товар не найден</h1>
        <p>{error || "Информация о товаре отсутствует."}</p>
        {code && <p className="product-code">Код: {code}</p>}
      </main>
    );
  }

  return (
    <main className="product-page">
      <p className="product-label">ИНФОРМАЦИЯ О ТОВАРЕ</p>

      <h1>
        {product.product_name ||
          product.generic_name ||
          "Название не указано"}
      </h1>

      {product.brands && <p>Бренд: {product.brands}</p>}

      {product.generic_name && (
        <p>Описание: {product.generic_name}</p>
      )}

      {product.categories && (
        <p>Категория: {product.categories}</p>
      )}

      {product.quantity && (
        <p>Объём / масса: {product.quantity}</p>
      )}

      <p className="product-code">Код: {code}</p>
    </main>
  );
}
