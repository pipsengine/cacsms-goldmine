import Link from "next/link";

export default function NotFound() {
  return (
    <main className="content">
      <section className="empty">
        <h1>Page not found</h1>
        <p>The requested route is not registered in the Gold Trader navigation configuration.</p>
        <Link href="/executive">Return to Executive Command Centre</Link>
      </section>
    </main>
  );
}
