
export default function SearchResultsPage() {
  return (
    <main className="container">
      <header className="page-header">
        <div className="logo" />
        <div>
          <h1>Результаты поиска</h1>
          <p>Здесь появятся найденные продукты.</p>
        </div>
      </header>

      <section className="panel empty-state">
        <p>Пока ничего не отображается.</p>
      </section>
    </main>
  );
}
