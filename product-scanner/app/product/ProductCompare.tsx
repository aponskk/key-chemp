"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import StoreOffers from "./StoreOffers";
import { normalizeProductCode } from "../lib/productCode";
import BarcodeIcon from "../components/BarcodeIcon";

type Nutriments = Record<string, number | string | undefined>;
type CompareProduct = {
  code: string;
  name: string;
  brand: string;
  quantity: string;
  ingredients: string;
  allergens: string;
  nutriments: Nutriments;
};

type Props = { current: CompareProduct };

const nutrientRows = [
  ["energy-kcal_100g", "Энергия", "ккал"],
  ["proteins_100g", "Белки", "г"],
  ["fat_100g", "Жиры", "г"],
  ["carbohydrates_100g", "Углеводы", "г"],
  ["sugars_100g", "Сахара", "г"],
  ["salt_100g", "Соль", "г"],
] as const;

export default function ProductCompare({ current }: Props) {
  const [code, setCode] = useState("");
  const [other, setOther] = useState<CompareProduct | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStatus, setCameraStatus] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const mountedRef = useRef(false);
  const processedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, []);

  function stopCamera() {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setCameraActive(false);
    setCameraStatus("");
  }

  async function compareCode(rawCode: string) {
    const normalized = normalizeProductCode(rawCode.replace(/\s+/g, ""));
    if (!normalized) {
      setError("Не удалось распознать штрихкод. Проверь код на упаковке или введи его вручную.");
      setOther(null);
      return;
    }
    if (normalized === current.code) {
      setError("Это тот же продукт. Введи штрихкод другого продукта.");
      setOther(null);
      return;
    }

    setCode(normalized);
    setLoading(true);
    setError("");
    setOther(null);
    try {
      const fields = "code,product_name,generic_name,brands,quantity,ingredients_text,ingredients_text_ru,allergens,nutriments";
      const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(normalized)}?fields=${fields}`);
      if (!response.ok) throw new Error("Не удалось получить данные второго товара.");
      const data = await response.json();
      if (data.status !== 1 || !data.product) throw new Error("Не удалось найти второй продукт по этому штрихкоду.");
      const p = data.product;
      setOther({
        code: p.code || normalized,
        name: p.product_name?.trim() || p.generic_name?.trim() || "Название неизвестно",
        brand: p.brands?.trim() || "",
        quantity: p.quantity?.trim() || "",
        ingredients: p.ingredients_text_ru?.trim() || p.ingredients_text?.trim() || "",
        allergens: p.allergens?.trim() || "",
        nutriments: p.nutriments || {},
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки второго товара.");
    } finally {
      setLoading(false);
    }
  }

  async function startCamera() {
    if (!videoRef.current || cameraActive) return;
    setError("");
    setCameraStatus("Запрашиваем доступ к камере…");
    setCameraActive(true);
    processedRef.current = false;
    try {
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      if (!mountedRef.current || !videoRef.current) return;
      const reader = new BrowserMultiFormatReader();
      const controls = await reader.decodeFromVideoDevice(undefined, videoRef.current, (result, _decodeError, scanControls) => {
        if (!result || processedRef.current) return;
        const raw = result.getText();
        const normalized = normalizeProductCode(raw);
        if (!normalized) {
          setError("Этот код не подходит для поиска продукта. Используй штрихкод с упаковки.");
          return;
        }
        processedRef.current = true;
        scanControls.stop();
        controlsRef.current = null;
        setCameraActive(false);
        setCameraStatus("Штрихкод считан. Загружаем сравнение…");
        void compareCode(normalized).finally(() => setCameraStatus(""));
      });
      if (!mountedRef.current || processedRef.current) {
        controls.stop();
        return;
      }
      controlsRef.current = controls;
      setCameraStatus("Наведи камеру на штрихкод второго продукта");
    } catch (e) {
      if (!mountedRef.current) return;
      setCameraActive(false);
      setCameraStatus("");
      if (e instanceof Error && e.name === "NotAllowedError") {
        setError("Нет доступа к камере. Разреши использование камеры в настройках браузера.");
      } else if (e instanceof Error && e.name === "NotFoundError") {
        setError("Камера не найдена на этом устройстве.");
      } else {
        setError("Не удалось включить камеру. Проверь разрешение на доступ к камере и попробуй ещё раз.");
      }
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void compareCode(code);
  }

  return (
    <section className="product-section product-compare-section">
      <h2>Сравнить с другим товаром</h2>
      <p className="product-section-hint">Введи штрихкод второго продукта или отсканируй его. Сравнение состава и пищевой ценности доступно, если данные о продукте есть в каталоге.</p>
      <form className="compare-form" onSubmit={handleSubmit}>
        <input aria-label="Штрихкод второго товара" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Например, 5449000000996" inputMode="numeric" />
        <button className="primary-button" type="submit" disabled={loading}>{loading ? "Загружаем…" : "Сравнить"}</button>
      </form>
      <div className="compare-camera-controls">
        {cameraActive ? (
          <button className="secondary-button" type="button" onClick={stopCamera}>Остановить камеру</button>
        ) : (
          <button className="secondary-button" type="button" onClick={startCamera} disabled={loading}> <span className="scan-icon">
  <BarcodeIcon size={40} />
</span> Сканировать камерой</button>
        )}
      </div>
      <div className="compare-camera-box" hidden={!cameraActive}>
        <video ref={videoRef} className="compare-camera-video" autoPlay muted playsInline />
      </div>
      {cameraStatus && <p className="scanner-status">{cameraStatus}</p>}
      {error && <p className="form-error">{error}</p>}
      {other && (
        <>
          <div className="compare-products-grid">
            {[current, other].map((p, index) => (
              <article className="compare-product-card" key={`${p.code}-${index}`}>
                <p className="product-label">{index === 0 ? "ТЕКУЩИЙ ТОВАР" : "ВТОРОЙ ТОВАР"}</p>
                <h3>{p.name}</h3>
                {p.brand && <p>{p.brand}</p>}
                {p.quantity && <p>{p.quantity}</p>}
                <p className="compare-ingredients"><strong>Состав:</strong> {p.ingredients || "Нет данных"}</p>
                <p className="compare-ingredients"><strong>Аллергены:</strong> {p.allergens || "Нет данных. Проверь информацию на упаковке."}</p>
              </article>
            ))}
          </div>
          <div className="compare-nutrition-table">
            <div className="compare-nutrition-row compare-nutrition-header"><span>На 100 г</span><strong>{current.name}</strong><strong>{other.name}</strong></div>
            {nutrientRows.map(([key, label, unit]) => (
              <div className="compare-nutrition-row" key={key}>
                <span>{label}</span>
                <strong>{current.nutriments[key] == null || current.nutriments[key] === "" ? "Нет данных" : `${Number(current.nutriments[key]).toLocaleString("ru-RU", { maximumFractionDigits: 2 })} ${unit}`}</strong>
                <strong>{other.nutriments[key] == null || other.nutriments[key] === "" ? "Нет данных" : `${Number(other.nutriments[key]).toLocaleString("ru-RU", { maximumFractionDigits: 2 })} ${unit}`}</strong>
              </div>
            ))}
          </div>
          <StoreOffers code={other.code} brand={other.brand} productName={other.name} />
        </>
      )}
    </section>
  );
}
