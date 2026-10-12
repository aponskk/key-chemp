
export default function SearchPage() {
  return (
    <main className="container">
      <header className="page-header">
        <div className="logo" />
        <div>
          <h1>Поиск продуктов</h1>
          <p>Найди продукт по названию</p>
        </div>
      </header>

      <section className="panel">
        <form action="/search/results" method="get" className="manual-form">
          <label htmlFor="query">Название продукта</label>

          <input
            id="query"
            name="q"
            type="search"
            placeholder="Например, йогурт"
            required
          />

          <button className="button" type="submit">
            Найти
          </button>
        </form>
      </section>
    </main>
  );
}
