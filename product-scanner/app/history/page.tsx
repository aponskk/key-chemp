
export default function HistoryPage() {
  return (
    <main className="container">
      <header className="page-header">
        <div className="logo" />
        <div>
          <h1>История</h1>
          <p>Твои последние сканирования</p>
        </div>
      </header>

      <section className="panel empty-state">
        <div className="empty-icon">↺</div>
        <h2>История пуста</h2>
        <p>Здесь появятся продукты, которые ты сканировал.</p>
      </section>
    </main>
  );
}
