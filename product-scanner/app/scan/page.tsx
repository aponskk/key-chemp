
import ScanPanel from "./ScanPanel";

export default function ScanPage() {
  return (
    <main className="container">
      <header className="page-header">
        <div className="logo" />
        <div>
          <h1>Сканирование</h1>
          <p>Найди продукт по штрихкоду</p>
        </div>
      </header>

      <ScanPanel />
    </main>
  );
}
