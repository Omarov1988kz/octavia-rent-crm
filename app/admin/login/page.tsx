"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    setLoading(false);

    if (response.ok) {
      router.push("/admin/bookings");
      return;
    }

    const result = await response.json();
    setError(result?.message || "Ошибка авторизации");
  }

  return (
    <main style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1>Вход в CRM</h1>
      <form onSubmit={handleSubmit} style={{ maxWidth: 420, marginTop: 24, display: "grid", gap: 16 }}>
        <label style={{ display: "grid", gap: 8 }}>
          Почта администратора
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            style={{ padding: 10, borderRadius: 8, border: "1px solid #d1d5db" }}
          />
        </label>

        <label style={{ display: "grid", gap: 8 }}>
          Пароль
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            style={{ padding: 10, borderRadius: 8, border: "1px solid #d1d5db" }}
          />
        </label>

        {error ? <div style={{ color: "#b91c1c" }}>{error}</div> : null}

        <button
          type="submit"
          disabled={loading}
          style={{ padding: "12px 16px", borderRadius: 8, border: "none", background: "#2563eb", color: "white", cursor: "pointer" }}
        >
          {loading ? "Вход..." : "Войти"}
        </button>
      </form>
    </main>
  );
}
