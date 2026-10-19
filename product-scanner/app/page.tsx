import Link from "next/link";

export default function HomePage() {
  return (
    <main className="container home-page">
      <section className="home-hero">
        <div className="home-kicker">
          <span className="home-kicker-dot" />
          ПРОСТО О ЕДЕ
        </div>
        <h1>Знай, что покупаешь.</h1>
        <p className="home-lead">
          Сканируй штрихкод, изучай состав и пищевую ценность продуктов,
          а ещё сравнивай цены в магазинах.
        </p>
        <div className="home-actions">
          <Link className="button home-primary-action" href="/scan">
            <span aria-hidden="true">▦</span> Сканировать товар
          </Link>
          <Link className="button button-secondary home-secondary-action" href="/search">
            Сравнить цены <span aria-hidden="true">→</span>
          </Link>
        </div>
        <div className="home-note">
          <span aria-hidden="true">✓</span>
          Информация о продукте — в одном месте
        </div>
      </section>

      <section className="home-features" aria-label="Возможности NutriScan">
        <article className="home-feature-card">
          <span className="home-feature-icon" aria-hidden="true">⌕</span>
          <div>
            <h2>Состав и аллергены</h2>
            <p>Посмотри, что указано на упаковке и в базе продукта.</p>
          </div>
        </article>
        <article className="home-feature-card">
          <span className="home-feature-icon" aria-hidden="true">◫</span>
          <div>
            <h2>Пищевая ценность</h2>
            <p>Основные показатели на 100 г продукта, если данные доступны.</p>
          </div>
        </article>
        <article className="home-feature-card">
          <span className="home-feature-icon" aria-hidden="true">₽</span>
          <div>
            <h2>Сравнение цен</h2>
            <p>Сравни предложения и найди более выгодный вариант.</p>
          </div>
        </article>
      </section>
    </main>
  );
}
