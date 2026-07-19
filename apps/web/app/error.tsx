"use client";

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="content">
      <section className="error-box">
        <strong>Workspace error</strong>
        <p>{error.message}</p>
        <button className="search-button" onClick={reset}>Retry</button>
      </section>
    </main>
  );
}
