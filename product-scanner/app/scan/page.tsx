
import ScanPanel from "./ScanPanel";
import BarcodeIcon from "../components/BarcodeIcon";

export default function ScanPage() {
  return (
    <main className="container">
      <header className="page-header">
        <div className="logo">
  <BarcodeIcon size={60} />
</div>
        <div>
          <h1>Сканирование</h1>
          <p>Найди продукт по штрихкоду</p>
        </div>
      </header>

      <ScanPanel />
    </main>
  );
}
