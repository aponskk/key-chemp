
"use client";

import { usePathname } from "next/navigation";
import BarcodeIcon from "./BarcodeIcon";

const items = [
  { label: "История", href: "/history", symbol: "↺" },
  { label: "Скан", href: "/scan", symbol: "▦" },
  { label: "Поиск", href: "/search", symbol: "⌕" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav">
      {items.map((item) => {
        const active =
          pathname === item.href ||
          (item.href === "/search" &&
            pathname.startsWith("/search"));

        return (
          <a
            key={item.href}
            href={item.href}
            className={`nav-item ${active ? "active" : ""} ${
              item.href === "/scan" ? "nav-scan" : ""
            }`}
            aria-current={active ? "page" : undefined}
          >
            <span className="nav-icon">
              {item.href === "/scan" ? (
                <BarcodeIcon size={24} />
              ) : (
                item.symbol
              )}
            </span>
            <span>{item.label}</span>
          </a>
        );
      })}
    </nav>
  );
}
