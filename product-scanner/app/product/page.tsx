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
  nutriScoreGrade: string;
  novaGroup: string;
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
    nutriscore_grade?: string;
    nova_group?: number | string;
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

function getNumericNutrient(
  nutriments: Nutriments,
  key: string
): number | null {
  const value = nutriments[key];

  if (value === undefined || value === null || value === "") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

/*
 * Перевод распространённых названий ингредиентов.
 * Сначала заменяются более длинные выражения,
 * чтобы короткие слова не мешали переводу фраз.
 */
const INGREDIENT_TRANSLATIONS: Record<string, string> = {
  "glucose-fructose syrup": "глюкозно-фруктозный сироп",
  "high fructose corn syrup": "кукурузный сироп с высоким содержанием фруктозы",
  "skimmed milk powder": "сухое обезжиренное молоко",
  "whole milk powder": "сухое цельное молоко",
  "sunflower oil": "подсолнечное масло",
  "rapeseed oil": "рапсовое масло",
  "palm oil": "пальмовое масло",
  "coconut oil": "кокосовое масло",
  "olive oil": "оливковое масло",
  "cocoa butter": "масло какао",
  "cocoa mass": "какао-масса",
  "cocoa powder": "какао-порошок",
  "whey powder": "сухая молочная сыворотка",
  "milk proteins": "молочные белки",
  "soy lecithin": "соевый лецитин",
  "sunflower lecithin": "подсолнечный лецитин",
  "natural flavouring": "натуральный ароматизатор",
  "natural flavoring": "натуральный ароматизатор",
  "natural flavours": "натуральные ароматизаторы",
  "natural flavors": "натуральные ароматизаторы",
  "artificial flavouring": "искусственный ароматизатор",
  "artificial flavoring": "искусственный ароматизатор",
  "modified starch": "модифицированный крахмал",
  "glucose syrup": "глюкозный сироп",
  "malt extract": "солодовый экстракт",
  "maltodextrin": "мальтодекстрин",
  "citric acid": "лимонная кислота",
  "ascorbic acid": "аскорбиновая кислота",
  "lactic acid": "молочная кислота",
  "raising agent": "разрыхлитель",
  "acidity regulator": "регулятор кислотности",
  "flavour enhancer": "усилитель вкуса",
  "flavor enhancer": "усилитель вкуса",
  "thickener": "загуститель",
  "stabilizer": "стабилизатор",
  "stabiliser": "стабилизатор",
  "emulsifier": "эмульгатор",
  "preservative": "консервант",
  "antioxidant": "антиоксидант",
  "sweetener": "подсластитель",
  "colour": "краситель",
  "color": "краситель",
  "tomato paste": "томатная паста",
  "vanilla extract": "экстракт ванили",
  "wheat flour": "пшеничная мука",
  "whole wheat flour": "цельнозерновая пшеничная мука",
  "rice flour": "рисовая мука",
  "corn flour": "кукурузная мука",
  "vegetable oils": "растительные масла",
  "vegetable oil": "растительное масло",
  "powdered sugar": "сахарная пудра",
  "brown sugar": "коричневый сахар",
  "cane sugar": "тростниковый сахар",
  "milk powder": "сухое молоко",
  "whey": "молочная сыворотка",
  "lecithins": "лецитины",
  "lecithin": "лецитин",
  "starch": "крахмал",
  "sugar": "сахар",
  "salt": "соль",
  "water": "вода",
  "milk": "молоко",
  "cream": "сливки",
  "butter": "сливочное масло",
  "cheese": "сыр",
  "eggs": "яйца",
  "egg": "яйцо",
  "wheat": "пшеница",
  "oats": "овёс",
  "rice": "рис",
  "yeast": "дрожжи",
  "vinegar": "уксус",
  "spices": "специи",
  "pepper": "перец",
  "onion": "лук",
  "garlic": "чеснок",
  "honey": "мёд",
  "cocoa": "какао",
  "flour": "мука",
  "gelatin": "желатин",
  "pectin": "пектин",
  "malt": "солод",
  "dextrose": "декстроза",
  "fructose": "фруктоза",
  "glucose": "глюкоза",
  "sorbitol": "сорбит",
  "xylitol": "ксилит",
  "maltitol": "мальтит",
  "erythritol": "эритрит",
  "sucralose": "сукралоза",
  "aspartame": "аспартам",
  "acesulfame potassium": "ацесульфам калия",
  "monosodium glutamate": "глутамат натрия",
  "disodium diphosphate": "дифосфат натрия",
  "sodium bicarbonate": "гидрокарбонат натрия",
  "potassium sorbate": "сорбат калия",
  "sodium benzoate": "бензоат натрия",
};

function translateFoodText(value: string): string {
  let result = value;

  const entries = Object.entries(INGREDIENT_TRANSLATIONS).sort(
    (a, b) => b[0].length - a[0].length
  );

  for (const [english, russian] of entries) {
    const escaped = english.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const expression = new RegExp(`\\b${escaped}\\b`, "gi");
    result = result.replace(expression, russian);
  }

  return result;
}

const SERVING_TRANSLATIONS: Record<string, string> = {
  "serving size": "Размер порции",
  "per serving": "на порцию",
  "about": "около",
  "approx.": "около",
  "tablespoons": "столовые ложки",
  "tablespoon": "столовая ложка",
  "tbsp": "ст. л.",
  "teaspoons": "чайные ложки",
  "teaspoon": "чайная ложка",
  "tsp": "ч. л.",
  "scoops": "мерные ложки",
  "scoop": "мерная ложка",
  "slices": "ломтика",
  "slice": "ломтик",
  "pieces": "шт.",
  "piece": "шт.",
  "cups": "чашки",
  "cup": "чашка",
  "bars": "батончика",
  "bar": "батончик",
  "packets": "пакетика",
  "packet": "пакетик",
  "servings": "порций",
  "serving": "порция",
};

function translateServingSize(value: string): string {
  let result = value;

  const entries = Object.entries(SERVING_TRANSLATIONS).sort(
    (a, b) => b[0].length - a[0].length
  );

  for (const [english, russian] of entries) {
    const escaped = english.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    result = result.replace(
      new RegExp(`\\b${escaped}\\b`, "gi"),
      russian
    );
  }

  return result;
}

/*
 * Ориентировочная внутренняя оценка от 0 до 100.
 * Это не официальный Nutri-Score и не медицинское заключение.
 * Чем выше балл, тем благоприятнее показатели в рамках
 * используемой упрощённой системы.
 */
type QualityResult = {
  score: number;
  reasons: string[];
};

function calculateQualityScore(
  nutriments: Nutriments
): QualityResult | null {
  const sugar = getNumericNutrient(nutriments, "sugars_100g");
  const saturatedFat = getNumericNutrient(
    nutriments,
    "saturated-fat_100g"
  );
  const salt = getNumericNutrient(nutriments, "salt_100g");
  const energyKcal =
    getNumericNutrient(nutriments, "energy-kcal_100g") ??
    (() => {
      const kj = getNumericNutrient(nutriments, "energy_100g");
      return kj === null ? null : kj / 4.184;
    })();
  const fiber = getNumericNutrient(nutriments, "fiber_100g");
  const protein = getNumericNutrient(nutriments, "proteins_100g");

  const factors: { weight: number; value: number }[] = [];
  const reasons: string[] = [];

  if (sugar !== null) {
    factors.push({
      weight: 25,
      value: 1 - Math.min(Math.max(sugar, 0) / 22.5, 1),
    });

    if (sugar >= 22.5) {
      reasons.push("Высокое содержание сахаров");
    } else if (sugar >= 5) {
      reasons.push("Содержит заметное количество сахаров");
    }
  }

  if (saturatedFat !== null) {
    factors.push({
      weight: 20,
      value: 1 - Math.min(Math.max(saturatedFat, 0) / 5, 1),
    });

    if (saturatedFat >= 5) {
      reasons.push("Высокое содержание насыщенных жиров");
    }
  }

  if (salt !== null) {
    factors.push({
      weight: 25,
      value: 1 - Math.min(Math.max(salt, 0) / 1.5, 1),
    });

    if (salt >= 1.5) {
      reasons.push("Высокое содержание соли");
    } else if (salt >= 0.75) {
      reasons.push("Содержание соли стоит учитывать");
    }
  }

  if (energyKcal !== null) {
    factors.push({
      weight: 15,
      value: 1 - Math.min(Math.max(energyKcal, 0) / 400, 1),
    });

    if (energyKcal >= 400) {
      reasons.push("Высокая энергетическая ценность на 100 г");
    }
  }

  if (fiber !== null) {
    factors.push({
      weight: 8,
      value: Math.min(Math.max(fiber, 0) / 6, 1),
    });

    if (fiber >= 3) {
      reasons.push("Хорошее содержание клетчатки");
    }
  }

  if (protein !== null) {
    factors.push({
      weight: 7,
      value: Math.min(Math.max(protein, 0) / 10, 1),
    });

    if (protein >= 10) {
      reasons.push("Высокое содержание белка");
    }
  }

  const negativeFactorsAvailable = [
    sugar,
    saturatedFat,
    salt,
    energyKcal,
  ].filter((value) => value !== null).length;

  if (factors.length < 3 || negativeFactorsAvailable < 2) {
    return null;
  }

  const totalWeight = factors.reduce(
    (sum, factor) => sum + factor.weight,
    0
  );

  const weightedScore =
    (factors.reduce(
      (sum, factor) => sum + factor.weight * factor.value,
      0
    ) /
      totalWeight) *
    100;

  return {
    score: Math.round(Math.min(100, Math.max(0, weightedScore))),
    reasons:
      reasons.length > 0
        ? reasons
        : ["По доступным показателям нет выраженных отклонений"],
  };
}

const ADDITIVE_NOTES: Record<
  string,
  { title: string; note: string }
> = {
  e102: {
    title: "Тартразин (E102)",
    note: "Синтетический краситель. В ЕС для некоторых красителей предусмотрено предупреждение о возможном влиянии на активность и внимание детей; наличие кода само по себе не говорит о превышении нормы.",
  },
  e104: {
    title: "Жёлтый хинолиновый (E104)",
    note: "Краситель. Учитывай индивидуальную чувствительность и проверяй актуальные правила маркировки в своей стране.",
  },
  e110: {
    title: "Жёлтый «солнечный закат» (E110)",
    note: "Краситель; для ряда азокрасителей в ЕС предусмотрено специальное предупреждение на маркировке.",
  },
  e122: {
    title: "Азорубин (E122)",
    note: "Краситель; наличие в составе не означает автоматически, что продукт опасен или что допустимая концентрация превышена.",
  },
  e124: {
    title: "Понсо 4R (E124)",
    note: "Краситель; оценивай весь состав и маркировку продукта, а не один код отдельно.",
  },
  e129: {
    title: "Красный очаровательный AC (E129)",
    note: "Краситель; для некоторых синтетических красителей в ЕС требуется предупреждение на упаковке.",
  },
  e250: {
    title: "Нитрит натрия (E250)",
    note: "Консервант, встречается в мясных изделиях. Важны количество, частота употребления и общий рацион; по одной строке состава дозу определить нельзя.",
  },
  e320: {
    title: "Бутилгидроксианизол (E320)",
    note: "Антиоксидант. По открытой записи состава нельзя определить концентрацию, поэтому это повод проверить маркировку, а не самостоятельный диагноз безопасности.",
  },
  e321: {
    title: "Бутилгидрокситолуол (E321)",
    note: "Антиоксидант. Концентрация обычно не указана в потребительской базе; сам код не доказывает превышения нормы.",
  },
  e621: {
    title: "Глутамат натрия (E621)",
    note: "Усилитель вкуса. Не считается автоматически вредным при разрешённом применении, но некоторым людям стоит учитывать индивидуальную реакцию и общее количество солёных/ультрапереработанных продуктов.",
  },
  e951: {
    title: "Аспартам (E951)",
    note: "Подсластитель. Людям с фенилкетонурией необходимо учитывать источник фенилаланина и предупреждение на упаковке.",
  },
};

function getAdditiveFindings(ingredients: string, tags: string[]) {
  const source = `${ingredients} ${tags.join(" ")}`.toLowerCase();
  const codes = new Set(
    (source.match(/e\s?-?\d{3,4}[a-z]?/gi) || []).map((value) =>
      value.replace(/[^a-z0-9]/gi, "").toLowerCase()
    )
  );

  return Array.from(codes).map((code) => ({
    code: code.toUpperCase(),
    ...(ADDITIVE_NOTES[code] || {
      title: code.toUpperCase(),
      note: "Добавка упомянута в данных состава. Автоматическая оценка не определяет дозировку или индивидуальный риск.",
    }),
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
        setError("В ссылке отсутствует штрихкод товара.");
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
          "nutriscore_grade",
          "nova_group",
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
          throw new Error("Не удалось найти продукт по этому штрихкоду.");
        }

        const source = data.product;
        const rawIngredients =
          source.ingredients_text_ru?.trim() ||
          source.ingredients_text?.trim() ||
          "";

        const item: Product = {
          code: source.code || validCode,
          name:
            source.product_name?.trim() ||
            source.generic_name?.trim() ||
            "Название неизвестно",
          brand: source.brands?.trim() || "",
          categories: source.categories?.trim() || "",
          quantity: source.quantity?.trim() || "",
          image:
            source.image_front_url?.trim() ||
            source.image_url?.trim() ||
            "",
          ingredients: source.ingredients_text_ru?.trim()
            ? source.ingredients_text_ru.trim()
            : translateFoodText(rawIngredients),
          allergens: source.allergens?.trim() || "",
          additivesTags: Array.isArray(source.additives_tags)
            ? source.additives_tags
            : [],
          servingSize: translateServingSize(
            source.serving_size?.trim() || ""
          ),
          nutriments: source.nutriments || {},
          nutriScoreGrade: source.nutriscore_grade?.toLowerCase() || "",
          novaGroup:
            source.nova_group === undefined ||
            source.nova_group === null
              ? ""
              : String(source.nova_group),
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
            : "Не удалось загрузить информацию о продукте."
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
        <p className="scanner-status">
          Загружаем информацию о товаре...
        </p>
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
          <p>Проверь штрихкод и попробуй ещё раз.</p>
          <Link className="button" href="/scan">
            Вернуться к сканеру
          </Link>
        </section>
      </main>
    );
  }

  const nutrients = product.nutriments;
  const quality = calculateQualityScore(nutrients);

  const energy =
    formatNutrient(nutrients, "energy-kcal_100g") ??
    (() => {
      const kj = getNumericNutrient(nutrients, "energy_100g");

      return kj === null
        ? null
        : (kj / 4.184).toLocaleString("ru-RU", {
            maximumFractionDigits: 2,
          });
    })();

  const nutrition = [
    {
      label: "Энергетическая ценность",
      value: energy,
      unit: "ккал",
    },
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

  const nutriScoreLabels: Record<string, string> = {
    a: "A — наиболее благоприятная оценка",
    b: "B — благоприятная оценка",
    c: "C — средняя оценка",
    d: "D — менее благоприятная оценка",
    e: "E — наименее благоприятная оценка",
  };

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
          brand={product.brand}
          productName={product.name}
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

        <section className="product-section product-quality">
          <h2>Оценка качества</h2>

          {quality ? (
            <>
              <div className="quality-score">
                <strong>{quality.score} </strong>
                <span>из 100 баллов</span>
              </div>

              <p className="product-section-hint">
                Ориентировочная оценка по доступным показателям
                пищевой ценности на 100 г. Это не медицинское
                заключение и не официальная классификация продукта.
              </p>

              <ul className="quality-reasons">
                {quality.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </>
          ) : (
            <p className="product-no-data">
              Недостаточно данных о пищевой ценности для расчёта
              оценки.
            </p>
          )}

          {product.nutriScoreGrade in nutriScoreLabels &&
            product.nutriScoreGrade !== "" && (
              <p className="product-section-hint">
                Nutri-Score по данным Open Food Facts:{" "}
                <strong>
                  {nutriScoreLabels[product.nutriScoreGrade]}
                </strong>
              </p>
            )}

          {["1", "2", "3", "4"].includes(product.novaGroup) && (
            <p className="product-section-hint">
              Группа обработки NOVA: {product.novaGroup} из 4.
              Эта классификация описывает степень обработки
              продукта, а не его общую полезность.
            </p>
          )}
        </section>

        <section className="product-section">
          <h2>Состав</h2>

          {product.ingredients ? (
            <p className="product-ingredients">
              {product.ingredients}
            </p>
          ) : (
            <p className="product-no-data">
              Состав для этого продукта не найден.
            </p>
          )}
        </section>

        <section className="product-section product-allergens">
          <h2>Аллергены</h2>

          {product.allergens ? (
            <>
              <p className="product-ingredients">
                {product.allergens}
              </p>
              <p className="product-section-hint">
                Сверяй информацию с упаковкой: состав продукта
                может меняться.
              </p>
            </>
          ) : (
            <p className="product-no-data">
              Сведения об аллергенах отсутствуют. Проверь
              информацию на упаковке.
            </p>
          )}
        </section>

        <section className="product-section product-additives">
          <h2>Пищевые добавки</h2>

          {(() => {
            const findings = getAdditiveFindings(
              product.ingredients,
              product.additivesTags
            );

            if (
              !product.ingredients &&
              product.additivesTags.length === 0
            ) {
              return (
                <p className="product-no-data">
                  Сведения о пищевых добавках отсутствуют.
                  Проверь состав на упаковке.
                </p>
              );
            }

            if (findings.length === 0) {
              return (
                <p className="product-no-data">
                  Не удалось определить коды пищевых добавок
                  по доступному составу. Проверь полный список
                  ингредиентов на упаковке.
                </p>
              );
            }

            return (
              <div className="additive-list">
                {findings.map((item) => (
                  <article
                    className="additive-item"
                    key={item.code}
                  >
                    <strong>{item.title}</strong>
                    <p>{item.note}</p>
                  </article>
                ))}
              </div>
            );
          })()}

          <p className="product-section-hint">
            Справочная информация по указанным добавкам.
            Данные могут быть неполными; концентрации добавок
            не указаны.
          </p>
        </section>

        <ProductCompare
          current={{
            code: product.code,
            name: product.name,
            brand: product.brand,
            quantity: product.quantity,
            ingredients: product.ingredients,
            allergens: product.allergens,
            nutriments: product.nutriments,
          }}
        />

        {product.categories && (
          <section className="product-section">
            <h2>Категории</h2>
            <p className="product-ingredients">
              {product.categories}
            </p>
          </section>
        )}

        {product.servingSize && (
          <section className="product-section">
            <h2>Размер порции</h2>
            <p className="product-ingredients">
              {product.servingSize}
            </p>
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
          <p className="scanner-status">
            Загрузка страницы товара...
          </p>
        </main>
      }
    >
      <ProductContent />
    </Suspense>
  );
}