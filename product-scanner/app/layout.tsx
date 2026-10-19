import Link from "next/link";
import "./globals.css";
import BottomNav from "./components/BottomNav";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>
        <header className="app-header">
          <Link href="/" className="logo-link">
            <div className="logo-placeholder" />
            <span>NutriScan</span>
          </Link>
        </header>

        <div className="app-content">{children}</div>

        <BottomNav />
      </body>
    </html>
  );
}