import Link from "next/link";

export default function HomePage() {
  return (
    <main style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1>Octavia Rent CRM</h1>
      <p>Простая CRM для управления бронированиями и синхронизации календаря.</p>
      <p>
        <Link href="/admin/login">Перейти в панель администратора</Link>
      </p>
    </main>
  );
}
