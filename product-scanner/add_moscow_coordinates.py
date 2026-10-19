"""Generate deterministic DEMO coordinates for synthetic stores around Moscow.

Run from the project root:
    python add_moscow_coordinates.py

Input/output: public/data/product_offers.csv
IMPORTANT: these are fictional test points, not verified store addresses.
"""

from __future__ import annotations

import hashlib
import math
from pathlib import Path

import pandas as pd

CSV_PATH = Path("public/data/product_offers.csv")

# Moscow city centre, WGS84 decimal degrees.
MOSCOW_LAT = 55.751244
MOSCOW_LON = 37.618423
MAX_RADIUS_KM = 12.0


def stable_randoms(key: str) -> tuple[float, float]:
    """Return stable pseudo-random values in [0, 1) for a store key."""
    digest = hashlib.sha256(key.encode("utf-8")).digest()
    # Two deterministic 64-bit values, independent of Python's hash randomization.
    a = int.from_bytes(digest[:8], "big") / (2**64)
    b = int.from_bytes(digest[8:16], "big") / (2**64)
    return a, b


def make_coordinates(key: str) -> tuple[float, float]:
    # Uniformly distribute points inside a disk rather than clustering them at centre.
    u, v = stable_randoms(key)
    distance_km = math.sqrt(u) * MAX_RADIUS_KM
    angle = 2 * math.pi * v

    north_km = distance_km * math.cos(angle)
    east_km = distance_km * math.sin(angle)

    latitude = MOSCOW_LAT + north_km / 111.32
    longitude = MOSCOW_LON + east_km / (111.32 * math.cos(math.radians(MOSCOW_LAT)))
    return round(latitude, 8), round(longitude, 8)


def main() -> None:
    if not CSV_PATH.exists():
        raise FileNotFoundError(
            f"Не найден {CSV_PATH}. Запусти скрипт из корня проекта, "
            "где находится папка public/data."
        )

    # Remove BOM, surrounding spaces and accidental markdown stars from headers.
    df = pd.read_csv(CSV_PATH, encoding="utf-8-sig")
    df.columns = [str(col).replace("\ufeff", "").strip().strip("*").strip() for col in df.columns]

    required = {"store", "city", "store_address"}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"В CSV отсутствуют колонки: {', '.join(sorted(missing))}")

    coordinate_cache: dict[str, tuple[float, float]] = {}
    latitudes: list[float] = []
    longitudes: list[float] = []

    for _, row in df.iterrows():
        store = str(row.get("store", "")).strip()
        city = str(row.get("city", "Москва")).strip() or "Москва"
        address = str(row.get("store_address", "")).strip()
        # All rows for the same store/address receive exactly the same point.
        key = "|".join((city.casefold(), store.casefold(), address.casefold()))
        if key not in coordinate_cache:
            coordinate_cache[key] = make_coordinates(key)
        lat, lon = coordinate_cache[key]
        latitudes.append(lat)
        longitudes.append(lon)

    df["latitude"] = latitudes
    df["longitude"] = longitudes
    df.to_csv(CSV_PATH, index=False, encoding="utf-8-sig")

    print(f"Готово: координаты добавлены для {len(df)} строк.")
    print(f"Уникальных точек магазинов: {len(coordinate_cache)}")
    print(f"Координаты сгенерированы в радиусе до {MAX_RADIUS_KM:g} км от центра Москвы.")
    print("Это искусственные тестовые точки, а не реальные адреса филиалов.")
    print(f"Файл обновлён: {CSV_PATH.resolve()}")


if __name__ == "__main__":
    main()
