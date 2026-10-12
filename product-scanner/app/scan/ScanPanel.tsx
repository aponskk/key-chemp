
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { normalizeProductCode } from "../lib/productCode";

export default function ScanPanel() {
  const router = useRouter();

  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const mountedRef = useRef(false);
  const processedRef = useRef(false);

  const [manualMode, setManualMode] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, []);

  function stopScanner() {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setCameraActive(false);
    setStatus("");
  }

  async function startScanner() {
    if (!videoRef.current || cameraActive) return;

    setError("");
    setStatus("Запрашиваем доступ к камере...");
    setCameraActive(true);
    processedRef.current = false;

    try {
      const { BrowserMultiFormatReader } = await import("@zxing/browser");

      if (!mountedRef.current || !videoRef.current) return;

      const reader = new BrowserMultiFormatReader();

      const controls = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result, _decodeError, scanControls) => {
          if (!result || processedRef.current) return;

          processedRef.current = true;
          scanControls.stop();
          controlsRef.current = null;

          const rawText = result.getText();
          const normalizedCode = normalizeProductCode(rawText);

          if (!normalizedCode) {
            setError(
              "Код распознан, но не похож на поддерживаемый штрихкод товара. Попробуй обычный штрихкод на упаковке или введи его вручную."
            );
            setCameraActive(false);
            setStatus("");
            return;
          }

          setCameraActive(false);
          setStatus("Код распознан. Ищем товар...");
          router.push(
            `/product?code=${encodeURIComponent(normalizedCode)}`
          );
        }
      );

      if (!mountedRef.current || processedRef.current) {
        controls.stop();
        return;
      }

      controlsRef.current = controls;
      setStatus("Наведите камеру на штрихкод или QR-код товара");
    } catch (err) {
      if (!mountedRef.current) return;

      setCameraActive(false);
      setStatus("");

      if (err instanceof Error && err.name === "NotAllowedError") {
        setError(
          "Нет доступа к камере. Разреши использование камеры в настройках браузера."
        );
      } else if (err instanceof Error && err.name === "NotFoundError") {
        setError("Камера не найдена на этом устройстве.");
      } else {
        setError(
          "Не удалось запустить камеру. Проверь разрешения браузера и попробуй ещё раз."
        );
      }
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedCode = normalizeProductCode(code);

    if (!normalizedCode) {
      setError(
        "Не удалось распознать код. Проверь штрихкод или строку маркировки."
      );
      return;
    }

    setError("");
    router.push(
      `/product?code=${encodeURIComponent(normalizedCode)}`
    );
  }

  function openManualMode() {
    stopScanner();
    setManualMode(true);
    setError("");
  }

  return (
    <section className="scan-panel">
      <h1>Сканирование товара</h1>

      {!manualMode ? (
        <>
          <div className="camera-placeholder">
            <video
              ref={videoRef}
              className={
                cameraActive
                  ? "camera-video"
                  : "camera-video camera-video-hidden"
              }
              autoPlay
              muted
              playsInline
            />

            {!cameraActive && (
              <div className="camera-frame">
                <span>Нажми кнопку, чтобы включить камеру</span>
              </div>
            )}
          </div>

          {status && <p className="scanner-status">{status}</p>}
          {error && <p className="form-error">{error}</p>}

          {cameraActive ? (
            <button
              type="button"
              className="primary-button"
              onClick={stopScanner}
            >
              Остановить сканирование
            </button>
          ) : (
            <button
              type="button"
              className="primary-button"
              onClick={startScanner}
            >
              Включить камеру
            </button>
          )}

          <button
            type="button"
            className="secondary-button manual-mode-button"
            onClick={openManualMode}
          >
            Ввести код вручную
          </button>
        </>
      ) : (
        <form className="manual-form" onSubmit={handleSubmit}>
          <label htmlFor="product-code">
            Штрихкод или код маркировки
          </label>

          <input
            id="product-code"
            type="text"
            autoComplete="off"
            placeholder="Например, 3017624010701"
            value={code}
            onChange={(event) => {
              setCode(event.target.value);
              setError("");
            }}
          />

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="primary-button">
            Найти товар
          </button>

          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              setManualMode(false);
              setError("");
            }}
          >
            Назад к камере
          </button>
        </form>
      )}
    </section>
  );
}
