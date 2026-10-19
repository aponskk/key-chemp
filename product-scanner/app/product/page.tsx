"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { saveProductToHistory } from "../lib/productHistory";
import StoreOffers from "./StoreOffers";
import ProductCompare from "./ProductCompare";

type Nutriments = Record<string, number | string | undefined>;

type Product = {
  code: string;
  name: string;
  brand: string;
  categories: string;
  quantity: string;
  image: string;
  ingredients: string;
  allergens: string;
  additivesTags: string[];
  servingSize: string;
  nutriments: Nutriments;
};

type ApiResponse = {
  status: number;
  product?: {
    code?: string;
    product_name?: string;
    generic_name?: string;
    brands?: string;
    categories?: string;
    quantity?: string;
    image_front_url?: string;
    image_url?: string;
    ingredients_text?: string;
    ingredients_text_ru?: string;
    allergens?: string;
    additives_tags?: string[];
    serving_size?: string;
    nutriments?: Nutriments;
  };
};

function formatNutrient(
  nutriments: Nutriments,
  key: string
): string | null {
  const value = nutriments[key];

  if (value === undefined || value === null || value === "") {
    return null;
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return null;
  }

  return number.toLocaleString("ru-RU", {
    maximumFractionDigits: 2,
  });
}

const ADDITIVE_NOTES: Record<string, { title: string; note: string }> = {
  "e102": { title: "Тартразин (E102)", note: "Синтетический краситель. В ЕС для некоторых красителей предусмотрено предупреждение о возможном влиянии на активность и внимание детей; наличие кода само по себе не говорит о превышении нормы." },
  "e104": { title: "Жёлтый хинолиновый (E104)", note: "Краситель. Учитывай индивидуальную чувствительность и проверяй актуальные правила маркировки в своей стране." },
  "e110": { title: "Жёлтый «солнечный закат» (E110)", note: "Краситель; для ряда азокрасителей в ЕС предусмотрено специальное предупреждение на маркировке." },
  "e122": { title: "Азорубин (E122)", note: "Краситель; наличие в составе не означает автоматически, что продукт опасен или что допустимая концентрация превышена." },
  "e124": { title: "Понсо 4R (E124)", note: "Краситель; оценивай весь состав и маркировку продукта, а не один код отдельно." },
  "e129": { title: "Красный очаровательный AC (E129)", note: "Краситель; для некоторых синтетических красителей в ЕС требуется предупреждение на упаковке." },
  "e250": { title: "Нитрит натрия (E250)", note: "Консервант, встречается в мясных изделиях. Важны количество, частота употребления и общий рацион; по одной строке состава дозу определить нельзя." },
  "e320": { title: "Бутилгидроксианизол (E320)", note: "Антиоксидант. По открытой записи состава нельзя определить концентрацию, поэтому это повод проверить маркировку, а не самостоятельный диагноз безопасности." },
  "e321": { title: "Бутилгидрокситолуол (E321)", note: "Антиоксидант. Концентрация обычно не указана в потребительской базе; сам код не доказывает превышения нормы." },
  "e621": { title: "Глутамат натрия (E621)", note: "Усилитель вкуса. Не считается автоматически вредным при разрешённом применении, но некоторым людям стоит учитывать индивидуальную реакцию и общее количество солёных/ультрапереработанных продуктов." },
  "e951": { title: "Аспартам (E951)", note: "Подсластитель. Людям с фенилкетонурией необходимо учитывать источник фенилаланина и предупреждение на упаковке." },
};

function getAdditiveFindings(ingredients: string, tags: string[]) {
  const source = `${ingredients} ${tags.join(" ")}`.toLowerCase();
  const codes = new Set((source.match(/e\s?-?\d{3,4}[a-z]?/gi) || []).map((value) => value.replace(/[^a-z0-9]/gi, "").toLowerCase()));
  return Array.from(codes).map((code) => ({
    code: code.toUpperCase(),
    ...(ADDITIVE_NOTES[code] || { title: code.toUpperCase(), note: "Добавка упомянута в данных состава. Автоматическая оценка не определяет дозировку или индивидуальный риск." }),
  }));
}

function ProductContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code");

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadProduct() {
      if (!code) {
        setError("Не указан штрихкод товара.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      setProduct(null);

      try {
        const validCode = code.trim();

        const fields = [
          "code",
          "product_name",
          "generic_name",
          "brands",
          "categories",
          "quantity",
          "image_front_url",
          "image_url",
          "ingredients_text",
          "ingredients_text_ru",
          "allergens",
          "additives_tags",
          "serving_size",
          "nutriments",
        ].join(",");

        const response = await fetch(
          `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(
            validCode
          )}?fields=${fields}`
        );

        if (!response.ok) {
          throw new Error("Не удалось загрузить данные о товаре.");
        }

        const data: ApiResponse = await response.json();

        if (data.status !== 1 || !data.product) {
          throw new Error(
            "Товар не найден в каталоге Open Food Facts."
          );
        }

        const source = data.product;

        const item: Product = {
          code: source.code || validCode,
          name:
            source.product_name?.trim() ||
            source.generic_name?.trim() ||
            "Название не указано",
          brand: source.brands?.trim() || "",
          categories: source.categories?.trim() || "",
          quantity: source.quantity?.trim() || "",
          image:
            source.image_front_url?.trim() ||
            source.image_url?.trim() ||
            "",
          ingredients:
            source.ingredients_text_ru?.trim() ||
            source.ingredients_text?.trim() ||
            "",
          allergens: source.allergens?.trim() || "",
          additivesTags: Array.isArray(source.additives_tags) ? source.additives_tags : [],
          servingSize: source.serving_size?.trim() || "",
          nutriments: source.nutriments || {},
        };

        if (cancelled) {
          return;
        }

        setProduct(item);

        saveProductToHistory({
          code: item.code,
          name: item.name,
          brand: item.brand,
          quantity: item.quantity,
          image: item.image,
        });
      } catch (err) {
        if (cancelled) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Произошла ошибка при загрузке товара."
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadProduct();

    return () => {
      cancelled = true;
    };
  }, [code]);

  if (loading) {
    return (
      <main className="product-page">
        <p className="scanner-status">Загружаем информацию о товаре...</p>
      </main>
    );
  }

  if (error || !product) {
    return (
      <main className="product-page">
        <Link className="product-back-link" href="/scan">
          ← Назад к сканеру
        </Link>

        <section className="product-panel">
          <h1>Не удалось загрузить товар</h1>
          <p className="form-error">
            {error || "Информация о товаре недоступна."}
          </p>
          <p>
            Проверь код или попробуй отсканировать штрихкод ещё раз.
          </p>
          <Link className="button" href="/scan">
            Вернуться к сканеру
          </Link>
        </section>
      </main>
    );
  }

  const nutrients = product.nutriments;

  const energy =
    formatNutrient(nutrients, "energy-kcal_100g") ??
    (() => {
      const kj = formatNutrient(nutrients, "energy_100g");
      return kj === null
        ? null
        : (Number(kj.replace(/\s/g, "").replace(",", ".")) / 4.184)
            .toLocaleString("ru-RU", { maximumFractionDigits: 2 });
    })();

  const nutrition = [
    { label: "Энергетическая ценность", value: energy, unit: "ккал" },
    {
      label: "Белки",
      value: formatNutrient(nutrients, "proteins_100g"),
      unit: "г",
    },
    {
      label: "Жиры",
      value: formatNutrient(nutrients, "fat_100g"),
      unit: "г",
    },
    {
      label: "Углеводы",
      value: formatNutrient(nutrients, "carbohydrates_100g"),
      unit: "г",
    },
    {
      label: "Сахара",
      value: formatNutrient(nutrients, "sugars_100g"),
      unit: "г",
    },
    {
      label: "Насыщенные жиры",
      value: formatNutrient(nutrients, "saturated-fat_100g"),
      unit: "г",
    },
    {
      label: "Клетчатка",
      value: formatNutrient(nutrients, "fiber_100g"),
      unit: "г",
    },
    {
      label: "Соль",
      value: formatNutrient(nutrients, "salt_100g"),
      unit: "г",
    },
  ];

  

  return (
    <main className="product-page">
      <Link className="product-back-link" href="/scan">
        ← К сканеру
      </Link>

      <article className="product-details">
        <section className="product-hero">
          {product.image ? (
            <img
              className="product-image"
              src={product.image}
              alt={product.name}
            />
          ) : (
            <div className="product-image-placeholder">
              <span>Нет фотографии</span>
            </div>
          )}

          <div className="product-heading">
            {product.brand && (
              <p className="product-brand">{product.brand}</p>
            )}

            <h1>{product.name}</h1>

            {product.quantity && (
              <p className="product-quantity">{product.quantity}</p>
            )}

            <p className="product-code">
              Штрихкод: {product.code}
            </p>
          </div>
        </section>

          <StoreOffers
            code={product.code}
            brand={product.brand ?? ""}
            productName={product.name ?? ""}
          />
        <section className="product-section">
          <h2>Пищевая ценность</h2>
          <p className="product-section-hint">
            Значения на 100 г продукта
          </p>

          <div className="nutrition-grid">
            {nutrition.map((item) => (
              <div className="nutrition-item" key={item.label}>
                <span>{item.label}</span>
                <strong>
                  {item.value === null
                    ? "Нет данных"
                    : `${item.value} ${item.unit}`}
                </strong>
              </div>
            ))}
          </div>
        </section>

        <section className="product-section">
          <h2>Состав</h2>

          {product.ingredients ? (
            <p className="product-ingredients">
              {product.ingredients}
            </p>
          ) : (
            <p className="product-no-data">
              Состав не указан в базе данных для этого товара.
            </p>
          )}
        </section>

        <section className="product-section product-allergens">
          <h2>Аллергены</h2>
          {product.allergens ? (
            <>
              <p className="product-ingredients">{product.allergens}</p>
              <p className="product-section-hint">Данные из Open Food Facts. Сверяй информацию с упаковкой: рецептура может меняться.</p>
            </>
          ) : (
            <p className="product-no-data">Информация об аллергенах отсутствует в базе. Это не означает, что продукт не содержит аллергенов.</p>
          )}
        </section>

        <section className="product-section product-additives">
          <h2>Добавки, на которые стоит обратить внимание</h2>
          {(() => {
            const findings = getAdditiveFindings(product.ingredients, product.additivesTags);
            if (!product.ingredients && product.additivesTags.length === 0) {
              return <p className="product-no-data">В базе нет состава или списка добавок. Нельзя сделать вывод, что добавок нет.</p>;
            }
            if (findings.length === 0) {
              return <p className="product-no-data">В доступном тексте не распознаны коды пищевых добавок E. Это не является подтверждением отсутствия всех добавок.</p>;
            }
            return <div className="additive-list">{findings.map((item) => <article className="additive-item" key={item.code}><strong>{item.title}</strong><p>{item.note}</p></article>)}</div>;
          })()}
          <p className="product-section-hint">Это справочная подсветка по тексту состава, а не медицинская оценка: база может быть неполной, а концентрации добавок здесь не указаны.</p>
        </section>

        <ProductCompare current={{
          code: product.code,
          name: product.name,
          brand: product.brand,
          quantity: product.quantity,
          ingredients: product.ingredients,
          allergens: product.allergens,
          nutriments: product.nutriments,
        }} />

        {product.categories && (
          <section className="product-section">
            <h2>Категории</h2>
            <p className="product-ingredients">{product.categories}</p>
          </section>
        )}

        {product.servingSize && (
          <section className="product-section">
            <h2>Размер порции</h2>
            <p className="product-ingredients">{product.servingSize}</p>
          </section>
        )}

        <Link className="button" href="/scan">
          Сканировать следующий товар
        </Link>
      </article>
    </main>
  );
}

export default function ProductPage() {
  return (
    <Suspense
      fallback={
        <main className="product-page">
          <p className="scanner-status">Загрузка страницы товара...</p>
        </main>
      }
    >
      <ProductContent />
    </Suspense>
  );
}