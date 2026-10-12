
export default function HomePage() {
  return (
    <main className="container home-page">
      <header className="brand-header">
        <div className="logo" aria-label="Логотип" />

        <div>
          <h1>Welcome to NutriScan</h1>
          <p>Discover what is inside your food.</p>
        </div>
      </header>

      <section className="home-message">
        <h2>Ready to explore?</h2>
        <p>
          Scan a product or search for it to learn more.
        </p>
      </section>
    </main>
  );
}
